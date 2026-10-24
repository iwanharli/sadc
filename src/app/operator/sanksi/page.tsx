import { PageHeader } from "@/components/page-header"
import { DaftarSanksi } from "@/components/sanksi/daftar-sanksi"
import { requireUser } from "@/server/auth"
import { daftarSanksi } from "@/server/pengawasan"
import { getZona } from "@/server/zona"

export default async function SanksiOperatorPage() {
  const user = await requireUser("OPERATOR")
  const [rows, tz] = await Promise.all([daftarSanksi(user.poldaId), getZona()])
  return (
    <>
      <PageHeader
        eyebrow="Pengawasan"
        title="Bekukan & Cabut KTA"
        description="KTA di wilayah Anda yang sedang dibekukan atau sudah dicabut. Tindakan dilakukan dari halaman detail pemohon."
      />
      <DaftarSanksi rows={rows} basePath="/operator/pemohon" tz={tz} />
    </>
  )
}
