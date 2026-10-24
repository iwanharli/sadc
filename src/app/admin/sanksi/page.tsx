import { PageHeader } from "@/components/page-header"
import { DaftarSanksi } from "@/components/sanksi/daftar-sanksi"
import { requireUser } from "@/server/auth"
import { daftarSanksi } from "@/server/pengawasan"
import { getZona } from "@/server/zona"

export default async function SanksiAdminPage() {
  await requireUser("ADMIN")
  const [rows, tz] = await Promise.all([daftarSanksi(), getZona()])
  return (
    <>
      <PageHeader eyebrow="Pengawasan" title="Bekukan & Cabut KTA" description="Seluruh KTA yang dibekukan atau dicabut secara nasional." />
      <DaftarSanksi rows={rows} basePath="/admin/pemohon" tz={tz} showPolda />
    </>
  )
}
