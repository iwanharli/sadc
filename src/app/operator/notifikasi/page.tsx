import { PageHeader } from "@/components/page-header"
import { DaftarNotifikasi } from "@/components/notifikasi/daftar-notifikasi"
import { requireUser } from "@/server/auth"
import { getNotifikasi } from "@/server/notifikasi"
import { getZona } from "@/server/zona"

export default async function NotifikasiPage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  const user = await requireUser("OPERATOR")
  const tz = await getZona()
  const n = await getNotifikasi({ id: user.id, role: user.role, poldaId: user.poldaId }, tz)
  return (
    <>
      <PageHeader
        title="Notifikasi"
        description="KTA segera kedaluwarsa, draf terbengkalai, antrean cetak, dan sanksi di wilayah Anda."
      />
      <DaftarNotifikasi
        {...n}
        filter={(await searchParams).filter === "baru" ? "baru" : "semua"}
        basePath="/operator/notifikasi"
        tz={tz}
      />
    </>
  )
}
