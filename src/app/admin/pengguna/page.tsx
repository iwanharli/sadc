import { asc, eq, sql } from "drizzle-orm"
import { PageHeader } from "@/components/page-header"
import { KelolaPengguna } from "@/components/pengguna/kelola-pengguna"
import { formatWaktu } from "@/lib/waktu"
import { requireUser } from "@/server/auth"
import { db, schema } from "@/server/db"
import { getZona } from "@/server/zona"

export default async function PenggunaPage() {
  const admin = await requireUser("ADMIN")
  const tz = await getZona()
  const [rows, polda] = await Promise.all([
    db
      .select({
        id: schema.user.id,
        name: schema.user.name,
        username: schema.user.username,
        role: schema.user.role,
        poldaId: schema.user.poldaId,
        polda: schema.polda.nama,
        aktif: schema.user.aktif,
        // kolom timestamp disimpan dalam UTC; format ISO agar tidak ditafsirkan sebagai waktu lokal
        terakhirMasuk: sql<string | null>`(select to_char(max(created_at), 'YYYY-MM-DD"T"HH24:MI:SS"Z"') from session where user_id = ${schema.user.id})`,
      })
      .from(schema.user)
      .leftJoin(schema.polda, eq(schema.user.poldaId, schema.polda.id))
      .orderBy(asc(schema.user.role), asc(schema.polda.nama), asc(schema.user.name)),
    db.select({ id: schema.polda.id, nama: schema.polda.nama }).from(schema.polda).orderBy(schema.polda.nama),
  ])
  const users = rows.map((r) => ({ ...r, terakhirMasuk: r.terakhirMasuk ? formatWaktu(new Date(r.terakhirMasuk), tz) : null }))

  return (
    <>
      <PageHeader
        eyebrow="Administrasi"
        title="Pengguna"
        description={`${users.filter((u) => u.role === "OPERATOR").length} Operator · ${users.filter((u) => u.role === "ADMIN").length} Admin`}
      />
      <KelolaPengguna users={users} polda={polda} selfId={admin.id} />
    </>
  )
}
