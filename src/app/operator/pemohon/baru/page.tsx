import { eq } from "drizzle-orm"
import { PageHeader } from "@/components/page-header"
import { PendataanWizard } from "@/components/pendataan/wizard"
import type { PendataanInput } from "@/lib/pendataan-schema"
import { requireUser } from "@/server/auth"
import { db, schema } from "@/server/db"
import { muatPendataan, opsiFormulir } from "@/server/pendataan"

type SP = { dari?: string; jenis?: string }

export default async function PendataanBaruPage({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await requireUser("OPERATOR")
  const sp = await searchParams
  const opsi = await opsiFormulir(user.poldaId!)

  // perpanjangan / penggantian: isi formulir dari pengajuan yang KTA-nya sudah terbit
  let initial: PendataanInput | undefined
  let asal: string | null = null
  const jenis = sp.jenis === "PENGGANTIAN" ? "PENGGANTIAN" : sp.jenis === "PERPANJANGAN" ? "PERPANJANGAN" : null
  const dari = Number(sp.dari)
  if (jenis && Number.isInteger(dari)) {
    const kartu = await db.query.kartu.findFirst({ where: eq(schema.kartu.pengajuanId, dari) })
    const data = kartu && ["AKTIF", "KEDALUWARSA"].includes(kartu.status) ? await muatPendataan(dari, user.poldaId!) : null
    if (data) {
      const bermasa = new Set(opsi.jenisDokumen.filter((j) => j.adaMasaBerlaku).map((j) => String(j.id)))
      initial = {
        ...data,
        jenis,
        // foto & dokumen bermasa berlaku harus diperbarui
        fotoKey: "",
        sppiBerlakuSd: "",
        dokumen: Object.fromEntries(Object.entries(data.dokumen ?? {}).filter(([id]) => !bermasa.has(id))),
      }
      asal = kartu!.noKta
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Pendataan"
        title={initial ? (jenis === "PERPANJANGAN" ? "Perpanjangan KTA" : "Penggantian KTA") : "Pendataan Baru"}
        description={
          initial
            ? `Dari KTA ${asal}. Perbarui foto wajah & dokumen bermasa berlaku (SKCK, surat sehat, dll.), lalu simpan — KTA baru langsung terbit.`
            : "Lengkapi semua data pemohon. Saat disimpan, data diverifikasi otomatis dan KTA langsung diterbitkan."
        }
      />
      <PendataanWizard {...opsi} initial={initial} />
    </>
  )
}
