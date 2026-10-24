import { FileSpreadsheet } from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { DaftarPemohon } from "@/components/pendataan/daftar-pemohon"
import { FilterPolda } from "@/components/pendataan/filter-polda"
import { Button } from "@/components/ui/button"
import { requireUser } from "@/server/auth"
import { db, schema } from "@/server/db"
import { daftarPemohon } from "@/server/pendataan"
import { getZona } from "@/server/zona"

import { parseFilter, type FilterParams as SP } from "@/lib/filter-pemohon"

export default async function DirektoriPage({ searchParams }: { searchParams: Promise<SP> }) {
  await requireUser("ADMIN")
  const sp = await searchParams
  const f = parseFilter(sp)
  const [hasil, polda, tz] = await Promise.all([
    daftarPemohon({ ...f, page: Number(sp.page) || 1 }),
    db.select({ id: schema.polda.id, nama: schema.polda.nama }).from(schema.polda).orderBy(schema.polda.nama),
    getZona(),
  ])
  const qs = new URLSearchParams(Object.entries(sp).filter(([k, v]) => v && k !== "page") as [string, string][])

  return (
    <>
      <PageHeader
        eyebrow="Data"
        title="Direktori Pemohon"
        description="Seluruh pendataan Satpam & Debt Collector secara nasional"
        actions={
          <Button asChild variant="outline" size="lg" className="h-11 px-5 text-[15px]">
            <a href={`/api/export/pemohon${qs.size ? `?${qs}` : ""}`}>
              <FileSpreadsheet className="size-5" /> Ekspor Excel
            </a>
          </Button>
        }
      />
      <DaftarPemohon
        hasil={hasil}
        params={{ ...sp, status: f.status, profesi: f.profesi }}
        basePath="/admin/pemohon"
        tz={tz}
        showPolda
        filterTambahan={<FilterPolda polda={polda} basePath="/admin/pemohon" />}
      />
    </>
  )
}
