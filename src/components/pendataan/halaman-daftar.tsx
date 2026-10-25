import Link from "next/link"
import { FileSpreadsheet, UserPlus } from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { DAFTAR_PROFESI, parseFilter, parsePerHalaman, type FilterParams, type SlugProfesi } from "@/lib/filter-pemohon"
import { requireUser } from "@/server/auth"
import { db, schema } from "@/server/db"
import { daftarPemohon } from "@/server/pendataan"
import { getPoldaNama } from "@/server/queries"
import { getZona } from "@/server/zona"
import { DaftarPemohon } from "./daftar-pemohon"
import { FilterPolda } from "./filter-polda"

/** Halaman daftar pemohon untuk satu profesi (Satpam / Petugas Penagih), Operator atau Admin. */
export async function HalamanDaftar({ role, slug, sp }: { role: "OPERATOR" | "ADMIN"; slug: SlugProfesi; sp: FilterParams }) {
  const user = await requireUser(role)
  const info = DAFTAR_PROFESI[slug]
  const admin = role === "ADMIN"
  const f = parseFilter(sp)
  const perPage = parsePerHalaman(sp.per)
  const basePath = `/${admin ? "admin" : "operator"}/${slug}`
  const [hasil, wilayah, polda, tz] = await Promise.all([
    daftarPemohon({ ...f, profesi: info.profesi, poldaId: admin ? f.poldaId : user.poldaId, page: Number(sp.page) || 1, perPage }),
    admin ? Promise.resolve(null) : getPoldaNama(user.poldaId),
    admin ? db.select({ id: schema.polda.id, nama: schema.polda.nama }).from(schema.polda).orderBy(schema.polda.nama) : Promise.resolve([]),
    getZona(),
  ])
  const qs = new URLSearchParams(Object.entries({ ...sp, profesi: info.profesi }).filter(([k, v]) => v && k !== "page") as [string, string][])

  return (
    <>
      <PageHeader
        eyebrow={admin ? "Data" : "Pendataan"}
        title={info.judul}
        description={admin ? `Seluruh ${info.label} yang didata secara nasional` : `${info.label} yang didata di ${wilayah ?? "wilayah Anda"}`}
        actions={
          admin ? (
            <Button asChild variant="outline" size="lg" className="h-11 px-5 text-[15px]">
              <a href={`/api/export/pemohon?${qs}`}>
                <FileSpreadsheet className="size-5" /> Ekspor Excel
              </a>
            </Button>
          ) : (
            <Button asChild size="lg" className="h-11 px-5 text-[15px]">
              <Link href="/operator/pemohon/baru">
                <UserPlus className="size-5" /> Pendataan Baru
              </Link>
            </Button>
          )
        }
      />
      <DaftarPemohon
        hasil={hasil}
        params={{ ...sp, status: f.status, profesi: undefined }}
        basePath={basePath}
        detailBase={`/${admin ? "admin" : "operator"}/pemohon`}
        profesiTetap
        judul={`Data ${info.label}`}
        tz={tz}
        showPolda={admin}
        filterTambahan={admin ? <FilterPolda polda={polda} basePath={basePath} /> : undefined}
      />
    </>
  )
}
