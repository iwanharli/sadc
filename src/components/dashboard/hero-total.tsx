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
}: {
  periode: number
  total: number
  perubahan: number | null
  rataHarian: number
  satpam: number
  dc: number
}) {
  const sum = satpam + dc
  const naik = (perubahan ?? 0) >= 0

  return (
    <Card className="bg-hero-gradient relative h-full gap-0 overflow-hidden border-0 p-7 text-hero-foreground shadow-lg">
      <div className="pointer-events-none absolute -top-28 -right-20 size-80 rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 left-1/3 size-72 rounded-full bg-white/5 blur-3xl" />

      <div className="relative flex items-center gap-2.5 text-lg font-semibold">
        <Layers className="size-5" /> Pendataan baru
      </div>
      <p className="relative mt-1 text-base text-hero-foreground/80">Pemohon yang didata dalam {periode} hari terakhir</p>

      <div className="relative mt-6 flex flex-wrap items-end gap-x-6 gap-y-3">
        <span className="text-7xl font-bold leading-none tracking-tight tabular-nums lg:text-8xl">{nf.format(total)}</span>
        <div className="space-y-1.5 pb-1.5">
          {perubahan !== null && (
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[15px] font-semibold",
                naik ? "bg-white/20" : "bg-black/20",
              )}
            >
              {naik ? <TrendingUp className="size-4" /> : <TrendingDown className="size-4" />}
              {naik ? "+" : ""}
              {perubahan.toLocaleString("id-ID", { maximumFractionDigits: 1 })}%
              <span className="font-normal text-hero-foreground/80">vs periode sebelumnya</span>
            </span>
          )}
          <p className="text-base text-hero-foreground/85">
            ≈ {rataHarian.toLocaleString("id-ID", { maximumFractionDigits: 1 })} pendataan / hari
          </p>
        </div>
      </div>

      <div className="relative mt-auto pt-10">
        <div className="flex h-3 w-full gap-0.5 overflow-hidden rounded-full bg-white/15">
          {sum > 0 && (
            <>
              <div className="rounded-l-full bg-white" style={{ width: `${(satpam / sum) * 100}%` }} />
              <div className="rounded-r-full bg-[oklch(0.85_0.14_80)]" style={{ width: `${(dc / sum) * 100}%` }} />
            </>
          )}
        </div>
        <div className="mt-4 flex flex-wrap justify-between gap-x-8 gap-y-2 text-base">
          <span className="flex items-center gap-2.5">
            <span className="size-3 rounded-full bg-white" />
            Satpam <b className="text-lg tabular-nums">{nf.format(satpam)}</b>
            <span className="text-hero-foreground/70">({sum ? Math.round((satpam / sum) * 100) : 0}%)</span>
          </span>
          <span className="flex items-center gap-2.5">
            <span className="size-3 rounded-full bg-[oklch(0.85_0.14_80)]" />
            Penagih Utang <b className="text-lg tabular-nums">{nf.format(dc)}</b>
            <span className="text-hero-foreground/70">({sum ? Math.round((dc / sum) * 100) : 0}%)</span>
          </span>
        </div>
      </div>
    </Card>
  )
}
