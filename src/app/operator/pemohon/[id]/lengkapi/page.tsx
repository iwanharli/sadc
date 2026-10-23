import { notFound, redirect } from "next/navigation"
import { PageHeader } from "@/components/page-header"
import { PendataanWizard } from "@/components/pendataan/wizard"
import { requireUser } from "@/server/auth"
import { db, schema } from "@/server/db"
import { muatPendataan, opsiFormulir } from "@/server/pendataan"
import { eq } from "drizzle-orm"

export default async function LengkapiPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser("OPERATOR")
  const id = Number((await params).id)
  if (!Number.isInteger(id)) notFound()

  const p = await db.query.pengajuan.findFirst({ where: eq(schema.pengajuan.id, id) })
  if (!p || p.poldaId !== user.poldaId) notFound()
  if (p.status !== "DRAF") redirect(`/operator/pemohon/${id}`)

  const [initial, opsi] = await Promise.all([muatPendataan(id, user.poldaId!), opsiFormulir(user.poldaId!)])
  if (!initial) notFound()

  return (
    <>
      <PageHeader eyebrow={p.noRegistrasi} title="Lengkapi Data" description={`${initial.nama} · NIK ${initial.nik}`} />
      <PendataanWizard {...opsi} initial={initial} pengajuanId={id} />
    </>
  )
}
