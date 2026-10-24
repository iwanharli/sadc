import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, PencilLine } from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { DetailPemohon } from "@/components/pendataan/detail-pemohon"
import { AksiKta } from "@/components/sanksi/aksi-kta"
import { catatAudit } from "@/server/audit"
import { labelProfesi, StatusBadge } from "@/components/pendataan/status-badge"
import { Button } from "@/components/ui/button"
import { requireUser } from "@/server/auth"
import { detailPengajuan } from "@/server/pendataan"
import { getZona } from "@/server/zona"

export default async function DetailPemohonPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser("OPERATOR")
  const id = Number((await params).id)
  if (!Number.isInteger(id)) notFound()
  const d = await detailPengajuan(id, user.poldaId)
  if (!d) notFound()
  await catatAudit(user.id, "LIHAT_PEMOHON", "pengajuan", id)

  return (
    <>
      <PageHeader
        eyebrow={d.pengajuan.noRegistrasi}
        title={d.pemohon.nama}
        description={
          <span className="flex flex-wrap items-center gap-3">
            {labelProfesi(d.pengajuan.profesi)} · NIK <span className="font-mono">{d.pemohon.nik}</span>
            <StatusBadge status={d.pengajuan.status} kartu={d.kartu?.status} besar />
          </span>
        }
        actions={
          <>
            <Button variant="outline" size="lg" asChild className="h-11 text-[15px]">
              <Link href="/operator/pemohon">
                <ArrowLeft className="size-4" /> Daftar
              </Link>
            </Button>
            {d.pengajuan.status === "DRAF" && (
              <Button size="lg" asChild className="h-11 px-5 text-[15px]">
                <Link href={`/operator/pemohon/${id}/lengkapi`}>
                  <PencilLine className="size-4" /> Lengkapi data
                </Link>
              </Button>
            )}
          </>
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
