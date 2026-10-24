import "server-only"
import { and, eq, or } from "drizzle-orm"
import { db, schema } from "./db"

type User = { id: string; role: string; poldaId?: number | null }

/**
 * Bolehkah pengguna membuka file `key`?
 * - Admin: semua file.
 * - Pengunggah: file miliknya (mis. pratinjau sebelum formulir disimpan).
 * - Operator: file yang tertaut ke pengajuan / sanksi di Polda-nya.
 */
export async function bolehBukaFile(user: User, key: string) {
  if (user.role === "ADMIN") return true

  const [milik] = await db
    .select({ key: schema.unggahan.key })
    .from(schema.unggahan)
    .where(and(eq(schema.unggahan.key, key), eq(schema.unggahan.userId, user.id)))
    .limit(1)
  if (milik) return true
  if (!user.poldaId) return false

  const wilayah = eq(schema.pengajuan.poldaId, user.poldaId)
  const [biometrik] = await db
    .select({ id: schema.pengajuan.id })
    .from(schema.pengajuan)
    .where(
      and(
        wilayah,
        or(eq(schema.pengajuan.fotoUrl, key), eq(schema.pengajuan.ttdUrl, key), eq(schema.pengajuan.sidikJariUrl, key)),
      ),
    )
    .limit(1)
  if (biometrik) return true

  const [dok] = await db
    .select({ id: schema.dokumen.id })
    .from(schema.dokumen)
    .innerJoin(schema.pengajuan, eq(schema.dokumen.pengajuanId, schema.pengajuan.id))
    .where(and(wilayah, eq(schema.dokumen.fileUrl, key)))
    .limit(1)
  if (dok) return true

  const [bukti] = await db
    .select({ id: schema.sanksi.id })
    .from(schema.sanksi)
    .innerJoin(schema.kartu, eq(schema.sanksi.kartuId, schema.kartu.id))
    .innerJoin(schema.pengajuan, eq(schema.kartu.pengajuanId, schema.pengajuan.id))
    .where(and(wilayah, eq(schema.sanksi.buktiUrl, key)))
    .limit(1)
  return !!bukti
}
