import Link from "next/link"
import { CalendarClock, FileText, ShieldCheck } from "lucide-react"
import { ChartCard } from "@/components/dashboard/chart-card"
import { EmptyState } from "@/components/empty-state"
import { labelProfesi, StatusBadge } from "@/components/pendataan/status-badge"
import { cn } from "@/lib/utils"
import { formatTanggal, formatWaktu, hariIniDi } from "@/lib/waktu"
import type { daftarSanksi } from "@/server/pengawasan"

type Rows = Awaited<ReturnType<typeof daftarSanksi>>

export function DaftarSanksi({ rows, basePath, tz, showPolda }: { rows: Rows; basePath: string; tz: string; showPolda?: boolean }) {
  const hariIni = hariIniDi(tz)
  const beku = rows.filter((r) => r.status === "DIBEKUKAN").length
  const lewat = rows.filter((r) => r.status === "DIBEKUKAN" && r.tinjauSd && r.tinjauSd < hariIni).length

  return (
    <ChartCard
      title="KTA dibekukan & dicabut"
      description={`${beku} dibekukan · ${rows.length - beku} dicabut${lewat ? ` · ${lewat} melewati batas tinjau ulang` : ""}`}
      bodyClassName="p-0"
    >
      {rows.length === 0 ? (
        <div className="p-6">
          <EmptyState icon={ShieldCheck} title="Tidak ada KTA yang dibekukan atau dicabut" />
        </div>
      ) : (
        <ul className="divide-y">
          {rows.map((r) => {
            const terlambat = r.status === "DIBEKUKAN" && r.tinjauSd && r.tinjauSd < hariIni
            return (
              <li key={r.kartuId} className="flex flex-wrap items-start gap-4 px-6 py-5">
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <Link href={`${basePath}/${r.pengajuanId}`} className="text-[17px] font-semibold hover:text-primary">
                      {r.nama}
                    </Link>
                    <StatusBadge status="DICETAK" kartu={r.status} />
                  </div>
                  <p className="text-[15px] text-muted-foreground">
                    <span className="font-mono">{r.noKta}</span> · {labelProfesi(r.profesi)}
                    {showPolda && <> · {r.polda.replace(/^Polda /, "")}</>}
                  </p>
                  {r.alasan && (
                    <p className="text-[15px]">
                      <b>{r.alasan}</b>
                      {r.keterangan && <span className="text-muted-foreground"> — {r.keterangan}</span>}
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    {r.at ? formatWaktu(r.at, tz) : "—"} · oleh {r.oleh ?? "—"}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  {r.status === "DIBEKUKAN" && r.tinjauSd && (
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium",
                        terlambat ? "bg-destructive/15 text-destructive" : "bg-muted text-muted-foreground",
                      )}
                    >
                      <CalendarClock className="size-4" /> Tinjau s.d. {formatTanggal(r.tinjauSd, tz)}
                    </span>
                  )}
                  {r.buktiUrl && (
                    <a href={`/api/files/${r.buktiUrl}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
                      <FileText className="size-4" /> Bukti
                    </a>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </ChartCard>
  )
}
