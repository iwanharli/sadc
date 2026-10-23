import { CheckCircle2, FilePen, Printer } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

type Item = {
  id: number
  noRegistrasi: string
  profesi: "SATPAM" | "DEBT_COLLECTOR"
  status: "DRAF" | "TERVERIFIKASI" | "DICETAK"
  createdAt: Date
  nama: string
  polda: string
}

const statusInfo = {
  DRAF: { label: "Draf", icon: FilePen, className: "bg-warning/15 text-warning" },
  TERVERIFIKASI: { label: "Terverifikasi", icon: CheckCircle2, className: "bg-info/15 text-info" },
  DICETAK: { label: "Dicetak", icon: Printer, className: "bg-success/15 text-success" },
} as const

const rtf = new Intl.RelativeTimeFormat("id-ID", { numeric: "auto" })
function relatif(d: Date) {
  const menit = Math.round((d.getTime() - Date.now()) / 60_000)
  if (Math.abs(menit) < 60) return rtf.format(menit, "minute")
  const jam = Math.round(menit / 60)
  if (Math.abs(jam) < 24) return rtf.format(jam, "hour")
  return rtf.format(Math.round(jam / 24), "day")
}

function inisial(nama: string) {
  return nama.split(" ").slice(0, 2).map((w) => w[0]).join("")
}

export function RecentList({ items, showPolda = true }: { items: Item[]; showPolda?: boolean }) {
  return (
    <ul className="divide-y">
      {items.map((it) => {
        const s = statusInfo[it.status]
        return (
          <li key={it.id} className="flex items-center gap-4 px-6 py-4 transition-colors hover:bg-muted/40">
            <div
              className={cn(
                "flex size-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white",
                it.profesi === "SATPAM" ? "bg-series-satpam" : "bg-series-dc",
              )}
            >
              {inisial(it.nama)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-semibold">{it.nama}</p>
              <p className="truncate text-sm text-muted-foreground">
                {it.profesi === "SATPAM" ? "Satpam" : "Debt Collector"}
                {showPolda && <> · {it.polda.replace(/^Polda /, "")}</>}
              </p>
            </div>
            <div className="hidden shrink-0 text-right sm:block">
              <Badge className={cn("gap-1.5 border-0 px-2.5 py-1 text-sm font-medium", s.className)}>
                <s.icon className="size-3.5" /> {s.label}
              </Badge>
              <p className="mt-1 text-sm text-muted-foreground">{relatif(it.createdAt)}</p>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
