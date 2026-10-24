import Link from "next/link"
import { Printer } from "lucide-react"
import { TombolPdf, TombolTerbitkan } from "@/components/cetak/tombol-cetak"
import { ChartCard } from "@/components/dashboard/chart-card"
import { EmptyState } from "@/components/empty-state"
import { PageHeader } from "@/components/page-header"
import { labelJenis, labelProfesi } from "@/components/pendataan/status-badge"
import { formatTanggal, formatWaktu } from "@/lib/waktu"
import { requireUser } from "@/server/auth"
import { daftarPemohon } from "@/server/pendataan"
import { getZona } from "@/server/zona"

export default async function AntreanCetakPage() {
  const user = await requireUser("OPERATOR")
  const tz = await getZona()
  const [antrean, tercetak] = await Promise.all([
    daftarPemohon({ poldaId: user.poldaId, status: "TERVERIFIKASI", perPage: 50 }),
    daftarPemohon({ poldaId: user.poldaId, status: "DICETAK", perPage: 10 }),
  ])

  return (
    <>
      <PageHeader
        eyebrow="Pendataan"
        title="Antrean Cetak"
        description="Pengajuan yang sudah terverifikasi otomatis dan siap diterbitkan KTA & sertifikatnya."
      />

      <ChartCard
        title="Siap diterbitkan"
        description={`${antrean.total.toLocaleString("id-ID")} pengajuan menunggu`}
        bodyClassName="p-0"
      >
        {antrean.rows.length === 0 ? (
          <div className="p-6">
            <EmptyState icon={Printer} title="Antrean kosong" description="Semua pengajuan terverifikasi sudah diterbitkan KTA-nya." />
          </div>
        ) : (
          <ul className="divide-y">
            {antrean.rows.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-4 px-6 py-4">
                <div className="min-w-0 flex-1">
                  <Link href={`/operator/pemohon/${r.id}`} className="text-[17px] font-semibold hover:text-primary">
                    {r.nama}
                  </Link>
                  <p className="text-[15px] text-muted-foreground">
                    {labelProfesi(r.profesi)} · {labelJenis(r.jenis)} · {r.perusahaan ?? "—"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    <span className="font-mono">{r.noRegistrasi}</span> · didata {formatTanggal(r.createdAt, tz)}
                  </p>
                </div>
                <TombolTerbitkan pengajuanId={r.id} nama={r.nama} />
              </li>
            ))}
          </ul>
        )}
      </ChartCard>

      <div className="h-6" />

      <ChartCard title="Baru diterbitkan" description="Cetak ulang KTA atau sertifikat bila diperlukan" bodyClassName="p-0">
        {tercetak.rows.length === 0 ? (
          <p className="p-6 text-[15px] text-muted-foreground">Belum ada KTA yang diterbitkan.</p>
        ) : (
          <ul className="divide-y">
            {tercetak.rows.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-4 px-6 py-4">
                <div className="min-w-0 flex-1">
                  <Link href={`/operator/pemohon/${r.id}`} className="text-[17px] font-semibold hover:text-primary">
                    {r.nama}
                  </Link>
                  <p className="text-[15px] text-muted-foreground">
                    <span className="font-mono">{r.noKta}</span> · {labelProfesi(r.profesi)}
                  </p>
                  {r.dicetakAt && <p className="text-sm text-muted-foreground">Diterbitkan {formatWaktu(r.dicetakAt, tz)}</p>}
                </div>
                {r.kartuId && <TombolPdf kartuId={r.kartuId} />}
              </li>
            ))}
          </ul>
        )}
      </ChartCard>
    </>
  )
}
