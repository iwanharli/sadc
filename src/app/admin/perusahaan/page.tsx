import { asc, count, eq } from "drizzle-orm"
import { MasterPerusahaan } from "@/components/master/master-perusahaan"
import { PageHeader } from "@/components/page-header"
import { requireUser } from "@/server/auth"
import { db, schema } from "@/server/db"

export default async function PerusahaanPage() {
  await requireUser("ADMIN")
  const [rows, polda] = await Promise.all([
    db
      .select({
        id: schema.perusahaan.id,
        nama: schema.perusahaan.nama,
        jenis: schema.perusahaan.jenis,
        nib: schema.perusahaan.nib,
        noIzin: schema.perusahaan.noIzin,
        alamat: schema.perusahaan.alamat,
        poldaId: schema.perusahaan.poldaId,
        polda: schema.polda.nama,
        aktif: schema.perusahaan.aktif,
        pemohon: count(schema.pengajuan.id),
      })
      .from(schema.perusahaan)
      .leftJoin(schema.polda, eq(schema.perusahaan.poldaId, schema.polda.id))
      .leftJoin(schema.pengajuan, eq(schema.pengajuan.perusahaanId, schema.perusahaan.id))
      .groupBy(schema.perusahaan.id, schema.polda.nama)
      .orderBy(asc(schema.polda.nama), asc(schema.perusahaan.nama)),
    db.select({ id: schema.polda.id, nama: schema.polda.nama }).from(schema.polda).orderBy(schema.polda.nama),
  ])
  const bujp = rows.filter((r) => r.jenis === "BUJP").length
  return (
    <>
      <PageHeader
        eyebrow="Data"
        title="Perusahaan"
        description={`${bujp} BUJP · ${rows.length - bujp} PJPU di seluruh Polda`}
      />
      <MasterPerusahaan rows={rows} polda={polda} />
    </>
  )
}
