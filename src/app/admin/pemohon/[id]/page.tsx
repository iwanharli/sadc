import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { DetailPemohon } from "@/components/pendataan/detail-pemohon"
import { labelProfesi, StatusBadge } from "@/components/pendataan/status-badge"
import { AksiKta } from "@/components/sanksi/aksi-kta"
import { Button } from "@/components/ui/button"
import { catatAudit } from "@/server/audit"
import { requireUser } from "@/server/auth"
import { detailPengajuan } from "@/server/pendataan"
import { getZona } from "@/server/zona"

export default async function DetailAdminPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireUser("ADMIN")
  const id = Number((await params).id)
  if (!Number.isInteger(id)) notFound()
  const d = await detailPengajuan(id)
  if (!d) notFound()
  await catatAudit(admin.id, "LIHAT_PEMOHON", "pengajuan", id)

  return (
    <>
      <PageHeader
        eyebrow={`${d.pengajuan.noRegistrasi} · ${d.polda.nama}`}
        title={d.pemohon.nama}
        description={
          <span className="flex flex-wrap items-center gap-3">
            {labelProfesi(d.pengajuan.profesi)} · NIK <span className="font-mono">{d.pemohon.nik}</span>
            <StatusBadge status={d.pengajuan.status} kartu={d.kartu?.status} besar />
          </span>
        }
        actions={
          <Button variant="outline" size="lg" asChild className="h-11 text-[15px]">
            <Link href="/admin/pemohon">
              <ArrowLeft className="size-4" /> Direktori
            </Link>
          </Button>
        }
      />
      <DetailPemohon
        d={d}
        tz={await getZona()}
        aksiKta={d.kartu && <AksiKta kartuId={d.kartu.id} status={d.kartu.status} noKta={d.kartu.noKta} />}
      />
    </>
  )
}
