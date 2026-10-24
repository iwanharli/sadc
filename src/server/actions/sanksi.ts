"use server"

import { and, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { sanksiSchema, type SanksiInput } from "@/lib/sanksi"
import { hariIniDi } from "@/lib/waktu"
import { catatAudit } from "../audit"
import { requireUser } from "../auth"
import { db, schema } from "../db"
import { getZona } from "../zona"

type Hasil<T> = { ok: true; data: T } | { ok: false; error: string }

const BLACKLIST_TAHUN = Number(process.env.BLACKLIST_TAHUN ?? 5)

const TRANSISI = {
  BEKU: { dari: ["AKTIF"], ke: "DIBEKUKAN", aksi: "BEKUKAN_KTA" },
  CABUT: { dari: ["AKTIF", "DIBEKUKAN"], ke: "DICABUT", aksi: "CABUT_KTA" },
  PULIH: { dari: ["DIBEKUKAN"], ke: "AKTIF", aksi: "PULIHKAN_KTA" },
} as const

/**
 * Bekukan / cabut / pulihkan KTA. Operator hanya untuk KTA di Polda-nya; Admin seluruh Polda.
 * Pencabutan karena "Dokumen palsu" otomatis memasukkan NIK ke blacklist.
 */
export async function ubahStatusKta(input: SanksiInput): Promise<Hasil<{ status: string; blacklist: boolean }>> {
  try {
    const user = await requireUser()
    const parsed = sanksiSchema.safeParse(input)
    if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Data tidak valid")
    const d = parsed.data
    const t = TRANSISI[d.jenis]

    const [row] = await db
      .select({ kartu: schema.kartu, poldaId: schema.pengajuan.poldaId, pengajuanId: schema.pengajuan.id, nikHash: schema.pemohon.nikHash, nikEnc: schema.pemohon.nikEnc })
      .from(schema.kartu)
      .innerJoin(schema.pengajuan, eq(schema.kartu.pengajuanId, schema.pengajuan.id))
      .innerJoin(schema.pemohon, eq(schema.pengajuan.pemohonId, schema.pemohon.id))
      .where(eq(schema.kartu.id, d.kartuId))
    if (!row) throw new Error("KTA tidak ditemukan")
    if (user.role === "OPERATOR" && row.poldaId !== user.poldaId) throw new Error("KTA ini di luar wilayah Anda")
    if (!(t.dari as readonly string[]).includes(row.kartu.status)) {
      throw new Error(`KTA berstatus ${row.kartu.status.toLowerCase()} tidak bisa di-${d.jenis === "BEKU" ? "bekukan" : d.jenis === "CABUT" ? "cabut" : "pulihkan"}`)
    }

    const hariIni = hariIniDi(await getZona())
    const blacklist = d.jenis === "CABUT" && d.alasan === "Dokumen palsu"

    await db.transaction(async (tx) => {
      const [s] = await tx
        .insert(schema.sanksi)
        .values({
          kartuId: d.kartuId,
          jenis: d.jenis,
          alasan: d.alasan,
          keterangan: d.keterangan,
          buktiUrl: d.buktiKey ?? null,
          berlakuSd: d.jenis === "BEKU" ? (d.berlakuSd ?? null) : null,
          oleh: user.id,
        })
        .returning({ id: schema.sanksi.id })
      await tx.update(schema.kartu).set({ status: t.ke }).where(eq(schema.kartu.id, d.kartuId))
      await tx.insert(schema.riwayatStatus).values({
        pengajuanId: row.pengajuanId,
        dari: `KTA_${row.kartu.status}`,
        ke: `KTA_${t.ke}`,
        oleh: user.id,
        catatan: `${d.alasan}: ${d.keterangan}`,
      })
      if (blacklist) {
        const [y, m, dd] = hariIni.split("-").map(Number)
        await tx.insert(schema.blacklist).values({
          nikHash: row.nikHash,
          nikEnc: row.nikEnc,
          alasan: `KTA ${row.kartu.noKta} dicabut — dokumen palsu`,
          sanksiId: s.id,
          berlakuSd: `${y + BLACKLIST_TAHUN}-${String(m).padStart(2, "0")}-${String(dd).padStart(2, "0")}`,
        })
      }
    })

    await catatAudit(user.id, t.aksi, "kartu", d.kartuId, { alasan: d.alasan, blacklist })
    revalidatePath("/", "layout")
    return { ok: true, data: { status: t.ke, blacklist } }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Gagal mengubah status KTA" }
  }
}

/** Admin: nonaktifkan entri blacklist. */
export async function hapusBlacklist(id: number, catatan: string): Promise<Hasil<null>> {
  try {
    const user = await requireUser("ADMIN")
    if (catatan.trim().length < 5) throw new Error("Isi alasan pencabutan blokir")
    const [row] = await db
      .update(schema.blacklist)
      .set({ aktif: false })
      .where(and(eq(schema.blacklist.id, id), eq(schema.blacklist.aktif, true)))
      .returning({ id: schema.blacklist.id })
    if (!row) throw new Error("Entri blacklist tidak ditemukan")
    await catatAudit(user.id, "HAPUS_BLACKLIST", "blacklist", id, { catatan })
    revalidatePath("/admin/blacklist")
    return { ok: true, data: null }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Gagal" }
  }
}
