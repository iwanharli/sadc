import Link from "next/link"
import { BellOff, CalendarClock, FilePen, Printer, ShieldAlert, TimerReset, type LucideIcon } from "lucide-react"
import { EmptyState } from "@/components/empty-state"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { formatWaktu } from "@/lib/waktu"
import type { JenisNotif, Notif } from "@/server/notifikasi"
import { TombolTandaiDibaca } from "./tombol-tandai"

const IKON: Record<JenisNotif, { icon: LucideIcon; cls: string }> = {
  KEDALUWARSA: { icon: CalendarClock, cls: "bg-warning/15 text-warning" },
  DRAF_LAMA: { icon: FilePen, cls: "bg-warning/15 text-warning" },
  SANKSI: { icon: ShieldAlert, cls: "bg-destructive/15 text-destructive" },
  TINJAU_LEWAT: { icon: TimerReset, cls: "bg-destructive/15 text-destructive" },
  CETAK_TERTUNDA: { icon: Printer, cls: "bg-info/15 text-info" },
}

export function DaftarNotifikasi({
  items,
  dibacaAt,
  belumDibaca,
  filter,
  basePath,
  tz,
}: {
  items: Notif[]
  dibacaAt: Date
  belumDibaca: number
  filter: "semua" | "baru"
  basePath: string
  tz: string
}) {
  const tampil = filter === "baru" ? items.filter((i) => i.at > dibacaAt) : items
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        {[
          ["semua", "Semua", items.length],
          ["baru", "Belum dibaca", belumDibaca],
        ].map(([v, t, n]) => (
          <Link
            key={v}
            href={v === "semua" ? basePath : `${basePath}?filter=baru`}
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[15px] font-medium transition-colors",
              filter === v ? "border-transparent bg-primary text-primary-foreground" : "bg-card hover:bg-accent",
            )}
          >
            {v === "baru" && <span className={cn("size-2 rounded-full", filter === v ? "bg-primary-foreground" : "bg-destructive")} />}
            {t} <span className="opacity-75">{n}</span>
          </Link>
        ))}
        {belumDibaca > 0 && <TombolTandaiDibaca />}
      </div>

      {tampil.length === 0 ? (
        <EmptyState icon={BellOff} title="Belum ada notifikasi" description="Pemberitahuan penting akan muncul di sini." />
      ) : (
        <Card className="gap-0 overflow-hidden p-0">
          <ul className="divide-y">
            {tampil.map((n) => {
              const ik = IKON[n.jenis]
              const baru = n.at > dibacaAt
              return (
                <li key={n.id}>
                  <Link href={n.href} className={cn("flex gap-4 px-6 py-5 transition-colors hover:bg-muted/50", baru && "bg-accent/30")}>
                    <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-xl", ik.cls)}>
                      <ik.icon className="size-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 text-[16px] font-semibold">
                        {n.judul}
                        {baru && <span className="size-2 shrink-0 rounded-full bg-destructive" aria-label="belum dibaca" />}
                      </p>
                      <p className="text-[15px] text-muted-foreground">{n.isi}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{formatWaktu(n.at, tz)}</p>
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        </Card>
      )}
    </div>
  )
}
