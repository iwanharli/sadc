import { cn } from "@/lib/utils"
import { StatusBadge } from "@/components/pendataan/status-badge"

type Item = {
  id: number
  noRegistrasi: string
  profesi: "SATPAM" | "DEBT_COLLECTOR"
  status: "DRAF" | "TERVERIFIKASI" | "DICETAK"
  kartu: "AKTIF" | "DIBEKUKAN" | "DICABUT" | "KEDALUWARSA" | null
  createdAt: Date
  nama: string
  polda: string
}

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
                {it.profesi === "SATPAM" ? "Satpam" : "Penagih Utang"}
                {showPolda && <> · {it.polda.replace(/^Polda /, "")}</>}
              </p>
            </div>
            <div className="hidden shrink-0 text-right sm:block">
              <StatusBadge status={it.status} kartu={it.kartu} />
              <p className="mt-1 text-sm text-muted-foreground">{relatif(it.createdAt)}</p>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
