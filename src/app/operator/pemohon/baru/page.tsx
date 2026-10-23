import { PageHeader } from "@/components/page-header"
import { PendataanWizard } from "@/components/pendataan/wizard"
import { requireUser } from "@/server/auth"
import { opsiFormulir } from "@/server/pendataan"

export default async function PendataanBaruPage() {
  const user = await requireUser("OPERATOR")
  const opsi = await opsiFormulir(user.poldaId!)

  return (
    <>
      <PageHeader
        eyebrow="Pendataan"
        title="Pendataan Baru"
        description="Data pemohon KTA & sertifikat Satpam atau Debt Collector. Pengajuan terverifikasi otomatis bila semua persyaratan lengkap."
      />
      <PendataanWizard {...opsi} />
    </>
  )
}
