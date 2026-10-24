import { asc } from "drizzle-orm"
import { MasterDokumen } from "@/components/master/master-dokumen"
import { PageHeader } from "@/components/page-header"
import { requireUser } from "@/server/auth"
import { db, schema } from "@/server/db"

export default async function MasterDokumenPage() {
  await requireUser("ADMIN")
  const rows = await db.select().from(schema.jenisDokumen).orderBy(asc(schema.jenisDokumen.urutan))
  return (
    <>
      <PageHeader
        eyebrow="Administrasi"
        title="Persyaratan Dokumen"
        description="Atur dokumen yang wajib dilampirkan per profesi. Formulir pendataan & verifikasi otomatis langsung mengikuti pengaturan ini."
      />
      <MasterDokumen rows={rows} />
    </>
  )
}
