"use server"

import { randomBytes } from "node:crypto"
import { and, eq, inArray, ne } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { hariIniDi } from "@/lib/waktu"
import { catatAudit } from "../audit"
import { requireUser } from "../auth"
import { db, schema } from "../db"
import { getZona } from "../zona"

type Hasil<T> = { ok: true; data: T } | { ok: false; error: string }

const MASA_BERLAKU_TAHUN = Number(process.env.MASA_BERLAKU_KTA_TAHUN ?? 2)
const pad = (n: number, w: number) => String(n).padStart(w, "0")

function tambahTahun(tgl: string, tahun: number) {
  const [y, m, d] = tgl.split("-").map(Number)
  const t = new Date(Date.UTC(y + tahun, m - 1, d))
  t.setUTCDate(t.getUTCDate() - 1) // berlaku sampai sehari sebelum ulang tanggal terbit
  return t.toISOString().slice(0, 10)
}

/**
 * Terbitkan KTA untuk pengajuan TERVERIFIKASI: buat nomor KTA, masa berlaku & token QR,
 * ubah status jadi DICETAK. KTA lama (profesi sama) diganti menjadi KEDALUWARSA.
 */
export async function terbitkanKta(pengajuanId: number): Promise<Hasil<{ kartuId: number; noKta: string }>> {
  try {
    const user = await requireUser("OPERATOR")
    const p = await db.query.pengajuan.findFirst({ where: eq(schema.pengajuan.id, pengajuanId) })
    if (!p || p.poldaId !== user.poldaId) throw new Error("Pengajuan tidak ditemukan")
    if (p.status !== "TERVERIFIKASI") throw new Error("Hanya pengajuan terverifikasi yang bisa dicetak")
    const polda = (await db.query.polda.findFirst({ where: eq(schema.polda.id, p.poldaId) }))!
    const terbit = hariIniDi(await getZona())

    const hasil = await db.transaction(async (tx) => {
      // KTA lama milik pemohon yang sama & profesi sama digantikan
      const lama = await tx
        .select({ id: schema.kartu.id })
        .from(schema.kartu)
        .innerJoin(schema.pengajuan, eq(schema.kartu.pengajuanId, schema.pengajuan.id))
        .where(
          and(
            eq(schema.pengajuan.pemohonId, p.pemohonId),
            eq(schema.pengajuan.profesi, p.profesi),
            ne(schema.pengajuan.id, p.id),
            eq(schema.kartu.status, "AKTIF"),
          ),
        )
      if (lama.length) {
        await tx
          .update(schema.kartu)
          .set({ status: "KEDALUWARSA" })
          .where(inArray(schema.kartu.id, lama.map((k) => k.id)))
      }

      const [kartu] = await tx
        .insert(schema.kartu)
        .values({
          pengajuanId: p.id,
          noKta: `TMP-${p.id}`,
          terbitAt: terbit,
          berlakuSd: tambahTahun(terbit, MASA_BERLAKU_TAHUN),
          qrToken: randomBytes(18).toString("base64url"),
          status: "AKTIF",
          dicetakBy: user.id,
          dicetakAt: new Date(),
        })
        .returning({ id: schema.kartu.id })
      const noKta = `${p.profesi === "SATPAM" ? "S" : "D"}-${polda.kode}-${terbit.slice(0, 4)}-${pad(kartu.id, 6)}`
      await tx.update(schema.kartu).set({ noKta }).where(eq(schema.kartu.id, kartu.id))
      await tx.update(schema.pengajuan).set({ status: "DICETAK" }).where(eq(schema.pengajuan.id, p.id))
      await tx.insert(schema.riwayatStatus).values({
        pengajuanId: p.id,
        dari: "TERVERIFIKASI",
        ke: "DICETAK",
        oleh: user.id,
        catatan: `KTA ${noKta} diterbitkan${lama.length ? `; ${lama.length} KTA lama digantikan` : ""}`,
      })
      return { kartuId: kartu.id, noKta }
    })

    await catatAudit(user.id, "TERBITKAN_KTA", "kartu", hasil.kartuId, { pengajuanId, noKta: hasil.noKta })
    revalidatePath("/operator")
    revalidatePath("/operator/cetak")
    revalidatePath(`/operator/pemohon/${pengajuanId}`)
    return { ok: true, data: hasil }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Gagal menerbitkan KTA" }
  }
}
