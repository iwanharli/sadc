import { ShieldCheck } from "lucide-react"
import { ChartCard } from "@/components/dashboard/chart-card"
import { EmptyState } from "@/components/empty-state"
import { PageHeader } from "@/components/page-header"
import { TombolHapusBlacklist } from "@/components/sanksi/tombol-hapus-blacklist"
import { formatTanggal, formatWaktu } from "@/lib/waktu"
import { requireUser } from "@/server/auth"
import { daftarBlacklist } from "@/server/pengawasan"
import { getZona } from "@/server/zona"

export default async function BlacklistPage() {
  await requireUser("ADMIN")
  const [rows, tz] = await Promise.all([daftarBlacklist(), getZona()])
  return (
    <>
      <PageHeader
        eyebrow="Pengawasan"
        title="Blacklist NIK"
        description="NIK yang diblokir tidak bisa terverifikasi otomatis. Otomatis terisi saat KTA dicabut karena dokumen palsu."
      />
      <ChartCard title="NIK diblokir" description={`${rows.length} NIK aktif diblokir`} bodyClassName="p-0">
        {rows.length === 0 ? (
          <div className="p-6">
            <EmptyState icon={ShieldCheck} title="Belum ada NIK yang diblokir" />
          </div>
        ) : (
          <ul className="divide-y">
            {rows.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-4 px-6 py-5">
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="text-[17px] font-semibold">
                    {r.nama ?? "—"} <span className="ml-2 font-mono text-[15px] font-normal text-muted-foreground">{r.nik}</span>
                  </p>
                  <p className="text-[15px]">{r.alasan}</p>
                  <p className="text-sm text-muted-foreground">
                    Diblokir {formatWaktu(r.createdAt, tz)} · berlaku s.d. {r.berlakuSd ? formatTanggal(r.berlakuSd, tz) : "tanpa batas"}
                  </p>
                </div>
                <TombolHapusBlacklist id={r.id} nik={r.nik} />
              </li>
            ))}
          </ul>
        )}
      </ChartCard>
    </>
  )
}
