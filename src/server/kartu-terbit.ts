import { randomBytes } from "node:crypto"
import { and, eq, inArray, like, ne, sql } from "drizzle-orm"
import { db, schema } from "./db"

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0]

const MASA_BERLAKU_TAHUN = Number(process.env.MASA_BERLAKU_KTA_TAHUN ?? 2)
const pad = (n: number, w: number) => String(n).padStart(w, "0")

/** Berlaku sampai sehari sebelum ulang tanggal terbit, `tahun` tahun kemudian. */
export function tambahTahun(tgl: string, tahun = MASA_BERLAKU_TAHUN) {
  const [y, m, d] = tgl.split("-").map(Number)
  const t = new Date(Date.UTC(y + tahun, m - 1, d))
  t.setUTCDate(t.getUTCDate() - 1)
  return t.toISOString().slice(0, 10)
}

/**
 * Terbitkan KTA untuk sebuah pengajuan di dalam transaksi: nomor KTA, masa berlaku & token QR.
 * KTA AKTIF lama milik pemohon yang sama (profesi sama) diganti menjadi KEDALUWARSA.
 */
export async function terbitkanKartu(
  tx: Tx,
  p: { pengajuanId: number; pemohonId: number; profesi: "SATPAM" | "DEBT_COLLECTOR"; poldaKode: string; operatorId: string; terbit: string },
) {
  const lama = await tx
    .select({ id: schema.kartu.id })
    .from(schema.kartu)
    .innerJoin(schema.pengajuan, eq(schema.kartu.pengajuanId, schema.pengajuan.id))
    .where(
      and(
        eq(schema.pengajuan.pemohonId, p.pemohonId),
        eq(schema.pengajuan.profesi, p.profesi),
        ne(schema.pengajuan.id, p.pengajuanId),
        eq(schema.kartu.status, "AKTIF"),
      ),
    )
  if (lama.length) {
    await tx.update(schema.kartu).set({ status: "KEDALUWARSA" }).where(inArray(schema.kartu.id, lama.map((k) => k.id)))
  }

  const [kartu] = await tx
    .insert(schema.kartu)
    .values({
      pengajuanId: p.pengajuanId,
      noKta: `TMP-${p.pengajuanId}`,
      terbitAt: p.terbit,
      berlakuSd: tambahTahun(p.terbit),
      qrToken: randomBytes(18).toString("base64url"),
      status: "AKTIF",
      dicetakBy: p.operatorId,
      dicetakAt: new Date(),
    })
    .returning({ id: schema.kartu.id })
  // nomor urut mengikuti id kartu, tetapi tidak boleh menabrak nomor yang sudah ada (mis. data impor/demo)
  const awalan = `${p.profesi === "SATPAM" ? "S" : "D"}-${p.poldaKode}-${p.terbit.slice(0, 4)}-`
  const [{ terbesar }] = await tx
    .select({ terbesar: sql<number>`coalesce(max(substring(${schema.kartu.noKta} from '(\\d+)$')::int), 0)` })
    .from(schema.kartu)
    .where(like(schema.kartu.noKta, `${awalan}%`))
  const noKta = `${awalan}${pad(Math.max(kartu.id, Number(terbesar) + 1), 6)}`
  await tx.update(schema.kartu).set({ noKta }).where(eq(schema.kartu.id, kartu.id))
  await tx.update(schema.pengajuan).set({ status: "DICETAK" }).where(eq(schema.pengajuan.id, p.pengajuanId))
  return { kartuId: kartu.id, noKta, diganti: lama.length }
}
