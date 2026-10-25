import Link from "next/link"
import { UserPlus } from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { DaftarPemohon } from "@/components/pendataan/daftar-pemohon"
import { Button } from "@/components/ui/button"
import { requireUser } from "@/server/auth"
import { daftarPemohon } from "@/server/pendataan"
import { parseFilter } from "@/lib/filter-pemohon"
import { getPoldaNama } from "@/server/queries"
import { getZona } from "@/server/zona"

type SP = { q?: string; status?: string; profesi?: string; page?: string }

export default async function DaftarPemohonPage({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await requireUser("OPERATOR")
  const sp = await searchParams
  const { status, profesi } = parseFilter(sp)
  const [hasil, wilayah] = await Promise.all([
    daftarPemohon({ poldaId: user.poldaId, q: sp.q, status, profesi, page: Number(sp.page) || 1 }),
    getPoldaNama(user.poldaId),
  ])

  return (
    <>
      <PageHeader
        eyebrow="Pendataan"
        title="Daftar Pemohon"
        description={`Semua pendataan di ${wilayah ?? "wilayah Anda"}`}
        actions={
          <Button asChild size="lg" className="h-11 px-5 text-[15px]">
            <Link href="/operator/pemohon/baru">
              <UserPlus className="size-5" /> Pendataan Baru
            </Link>
          </Button>
        }
      />
      <DaftarPemohon hasil={hasil} params={{ ...sp, status, profesi }} basePath="/operator/pemohon" tz={await getZona()} />
    </>
  )
}
