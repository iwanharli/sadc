import "server-only"
import { eq } from "drizzle-orm"
import QRCode from "qrcode"
import { db, schema } from "../db"
import { bacaFile, isValidKey } from "../storage"

export type DataCetak = Awaited<ReturnType<typeof dataCetak>>

async function dataUri(key: string | null) {
  if (!key || !isValidKey(key) || key.endsWith(".pdf")) return null
  try {
    const { data, mime } = await bacaFile(key)
    return `data:${mime};base64,${data.toString("base64")}`
  } catch {
    return null
  }
}

export function urlVerifikasi(token: string) {
  const base = (process.env.APP_URL ?? process.env.BETTER_AUTH_URL ?? "http://localhost:3000").replace(/\/$/, "")
  return `${base}/verifikasi/${token}`
}

/** Kumpulkan data kartu untuk dicetak (foto, TTD & QR sebagai data URI). */
export async function dataCetak(kartuId: number) {
  const [row] = await db
    .select({
      kartu: schema.kartu,
      pengajuan: schema.pengajuan,
      pemohon: schema.pemohon,
      polda: schema.polda,
      perusahaan: schema.perusahaan.nama,
    })
    .from(schema.kartu)
    .innerJoin(schema.pengajuan, eq(schema.kartu.pengajuanId, schema.pengajuan.id))
    .innerJoin(schema.pemohon, eq(schema.pengajuan.pemohonId, schema.pemohon.id))
    .innerJoin(schema.polda, eq(schema.pengajuan.poldaId, schema.polda.id))
    .leftJoin(schema.perusahaan, eq(schema.pengajuan.perusahaanId, schema.perusahaan.id))
    .where(eq(schema.kartu.id, kartuId))
  if (!row) return null
  const sat = await db.query.detailSatpam.findFirst({ where: eq(schema.detailSatpam.pengajuanId, row.pengajuan.id) })
  const url = urlVerifikasi(row.kartu.qrToken)
  return {
    ...row,
    jenjangGada: sat?.jenjangGada ?? null,
    foto: await dataUri(row.pengajuan.fotoUrl),
    ttd: await dataUri(row.pengajuan.ttdUrl),
    qr: await QRCode.toDataURL(url, { margin: 1, width: 320, errorCorrectionLevel: "M" }),
    url,
  }
}
