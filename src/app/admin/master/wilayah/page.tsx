import { asc, eq, sql } from "drizzle-orm"
import { MasterWilayah } from "@/components/master/master-wilayah"
import { PageHeader } from "@/components/page-header"
import { requireUser } from "@/server/auth"
import { db, schema } from "@/server/db"

export default async function MasterWilayahPage({ searchParams }: { searchParams: Promise<{ polda?: string }> }) {
  await requireUser("ADMIN")
  const aktifId = Number((await searchParams).polda) || null
  const [polda, polres, provinsi, kabupaten] = await Promise.all([
    db
      .select({
        id: schema.polda.id,
        kode: schema.polda.kode,
        nama: schema.polda.nama,
        provinsi: schema.polda.provinsi,
        provinsiKode: schema.polda.provinsiKode,
        zonaWaktu: schema.polda.zonaWaktu,
        jumlahPolres: sql<number>`(select count(*)::int from polres r where r.polda_id = polda.id)`,
        jumlahOperator: sql<number>`(select count(*)::int from "user" u where u.polda_id = polda.id and u.role = 'OPERATOR')`,
      })
      .from(schema.polda)
      .orderBy(asc(schema.polda.nama)),
    aktifId ? db.select().from(schema.polres).where(eq(schema.polres.poldaId, aktifId)).orderBy(asc(schema.polres.nama)) : Promise.resolve([]),
    db.select({ kode: schema.wilayah.kode, nama: schema.wilayah.nama }).from(schema.wilayah).where(eq(schema.wilayah.level, 1)).orderBy(asc(schema.wilayah.nama)),
    db.select({ kode: schema.wilayah.kode, nama: schema.wilayah.nama }).from(schema.wilayah).where(eq(schema.wilayah.level, 2)).orderBy(asc(schema.wilayah.nama)),
  ])
  return (
    <>
      <PageHeader
        eyebrow="Administrasi"
        title="Polda & Polres"
        description="Kelola struktur wilayah Polri: provinsi cakupan & zona waktu Polda, serta Polres dan kab/kota wilayah hukumnya."
      />
      <MasterWilayah polda={polda} polres={polres} provinsi={provinsi} kabupaten={kabupaten} aktifId={aktifId} />
    </>
  )
}
