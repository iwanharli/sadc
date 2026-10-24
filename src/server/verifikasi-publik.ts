import "server-only"
import { eq } from "drizzle-orm"
import { db, schema } from "./db"

/** Data minimal untuk halaman verifikasi publik (tanpa NIK, alamat, kontak). */
export async function kartuPublik(token: string) {
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(token)) return null
  const [row] = await db
    .select({
      noKta: schema.kartu.noKta,
      status: schema.kartu.status,
      terbitAt: schema.kartu.terbitAt,
      berlakuSd: schema.kartu.berlakuSd,
      nama: schema.pemohon.nama,
      profesi: schema.pengajuan.profesi,
      fotoUrl: schema.pengajuan.fotoUrl,
      polda: schema.polda.nama,
      perusahaan: schema.perusahaan.nama,
    })
    .from(schema.kartu)
    .innerJoin(schema.pengajuan, eq(schema.kartu.pengajuanId, schema.pengajuan.id))
    .innerJoin(schema.pemohon, eq(schema.pengajuan.pemohonId, schema.pemohon.id))
    .innerJoin(schema.polda, eq(schema.pengajuan.poldaId, schema.polda.id))
    .leftJoin(schema.perusahaan, eq(schema.pengajuan.perusahaanId, schema.perusahaan.id))
    .where(eq(schema.kartu.qrToken, token))
  return row ?? null
}

/** Nama disamarkan sebagian di halaman publik, mis. "Budi S*****". */
export function samarkanNama(nama: string) {
  const [depan, ...sisa] = nama.split(" ")
  return [depan, ...sisa.map((w) => w[0] + "*".repeat(Math.max(2, w.length - 1)))].join(" ")
}
