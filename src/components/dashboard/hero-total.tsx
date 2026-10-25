import { Layers, TrendingDown, TrendingUp } from "lucide-react"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

const nf = new Intl.NumberFormat("id-ID")

/** Kartu utama: total periode, perubahan vs periode sebelumnya, komposisi profesi. */
export function HeroTotal({
  periode,
  total,
  perubahan,
  rataHarian,
  satpam,
  dc,
  ringkas,
}: {
  periode: number
  total: number
  perubahan: number | null
  rataHarian: number
  satpam: number
  dc: number
  /** versi padat untuk dashboard satu layar */
  ringkas?: boolean
}) {
  const sum = satpam + dc
  const naik = (perubahan ?? 0) >= 0
  const persen = (n: number) => (sum ? Math.round((n / sum) * 100) : 0)
  const lencana =
    perubahan !== null ? (
      <span
        className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[15px] font-semibold", naik ? "bg-white/20" : "bg-black/20")}
        title="Dibanding periode sebelumnya"
      >
        {naik ? <TrendingUp className="size-4" /> : <TrendingDown className="size-4" />}
        {naik ? "+" : ""}
        {perubahan.toLocaleString("id-ID", { maximumFractionDigits: 1 })}%
        <span className="font-normal text-hero-foreground/80">{ringkas ? "vs sebelumnya" : "vs periode sebelumnya"}</span>
      </span>
    ) : null

  return (
    <Card className={cn("bg-hero-gradient relative h-full gap-0 overflow-hidden border-0 text-hero-foreground shadow-lg", ringkas ? "p-6" : "p-7")}>
      <div className="pointer-events-none absolute -top-28 -right-20 size-80 rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 left-1/3 size-72 rounded-full bg-white/5 blur-3xl" />

      <div className="relative flex items-center gap-2.5 text-lg font-semibold">
        <Layers className="size-5" /> Pendataan baru
        {ringkas && <span className="font-normal text-hero-foreground/75">· {periode} hari terakhir</span>}
      </div>
      {!ringkas && <p className="relative mt-1 text-base text-hero-foreground/80">Pemohon yang didata dalam {periode} hari terakhir</p>}

      <div className={cn("relative flex flex-wrap items-end gap-x-5 gap-y-2", ringkas ? "mt-auto pt-3" : "mt-6")}>
        <span className={cn("font-bold leading-none tracking-tight tabular-nums", ringkas ? "text-6xl 2xl:text-7xl" : "text-7xl lg:text-8xl")}>
          {nf.format(total)}
        </span>
        <div className="space-y-1.5 pb-1">
          {lencana}
          <p className="text-base text-hero-foreground/85">
            ≈ {rataHarian.toLocaleString("id-ID", { maximumFractionDigits: 1 })} pendataan / hari
          </p>
        </div>
      </div>

      <div className={cn("relative", ringkas ? "mt-auto pt-4" : "mt-auto pt-10")}>
        <div className={cn("flex w-full gap-0.5 overflow-hidden rounded-full bg-white/15", ringkas ? "h-2.5" : "h-3")}>
          {sum > 0 && (
            <>
              <div className="rounded-l-full bg-white" style={{ width: `${persen(satpam)}%` }} />
              <div className="rounded-r-full bg-[oklch(0.85_0.14_80)]" style={{ width: `${persen(dc)}%` }} />
            </>
          )}
        </div>
        <div className={cn("flex flex-wrap justify-between gap-x-6 gap-y-1", ringkas ? "mt-3 text-[15px]" : "mt-4 text-base")}>
          <span className="flex items-center gap-2">
            <span className="size-3 rounded-full bg-white" />
            Satpam <b className="tabular-nums">{nf.format(satpam)}</b>
            <span className="text-hero-foreground/70">({persen(satpam)}%)</span>
          </span>
          <span className="flex items-center gap-2">
            <span className="size-3 rounded-full bg-[oklch(0.85_0.14_80)]" />
            Penagih Utang <b className="tabular-nums">{nf.format(dc)}</b>
            <span className="text-hero-foreground/70">({persen(dc)}%)</span>
          </span>
        </div>
      </div>
    </Card>
  )
}
