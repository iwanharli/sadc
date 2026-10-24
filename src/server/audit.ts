import "server-only"
import { headers } from "next/headers"
import { db, schema } from "./db"

export type AksiAudit =
  | "BUAT_PENDATAAN"
  | "UBAH_PENDATAAN"
  | "LIHAT_PEMOHON"
  | "TERBITKAN_KTA"
  | "CETAK_KTA"
  | "CETAK_SERTIFIKAT"
  | "BEKUKAN_KTA"
  | "CABUT_KTA"
  | "PULIHKAN_KTA"
  | "HAPUS_BLACKLIST"
  | "BUAT_PENGGUNA"
  | "UBAH_PENGGUNA"
  | "RESET_SANDI"
  | "EKSPOR_PEMOHON"
  | "UBAH_MASTER"
  | "GANTI_SANDI"

/** Catat jejak akses/perubahan data pribadi (UU PDP). Tidak pernah menggagalkan aksi utama. */
export async function catatAudit(
  userId: string | null,
  aksi: AksiAudit,
  entitas: string,
  entitasId?: string | number | null,
  data?: Record<string, unknown>,
) {
  try {
    const h = await headers()
    const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? null
    await db.insert(schema.auditLog).values({
      userId,
      aksi,
      entitas,
      entitasId: entitasId == null ? null : String(entitasId),
      ip,
      data: data ?? null,
    })
  } catch (e) {
    console.error("Gagal mencatat audit", e)
  }
}
