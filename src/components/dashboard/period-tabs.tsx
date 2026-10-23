import Link from "next/link"
import { CalendarDays } from "lucide-react"
import { cn } from "@/lib/utils"

export const PERIODE = [7, 30, 90] as const
export type Periode = (typeof PERIODE)[number]

export function parsePeriode(v: string | string[] | undefined): Periode {
  const n = Number(Array.isArray(v) ? v[0] : v)
  return (PERIODE as readonly number[]).includes(n) ? (n as Periode) : 30
}

/** Pilihan periode (7/30/90 hari) lewat query string ?periode= */
export function PeriodTabs({ value, basePath }: { value: Periode; basePath: string }) {
  return (
    <div className="inline-flex rounded-xl border bg-card p-1 shadow-sm">
      {PERIODE.map((p) => (
        <Link
          key={p}
          href={`${basePath}?periode=${p}`}
          scroll={false}
          className={cn(
            "flex items-center gap-2 rounded-lg px-4 py-2 text-[15px] font-medium transition-colors",
            p === value ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {p === value && <CalendarDays className="size-4" />}
          {p} hari
        </Link>
      ))}
    </div>
  )
}
