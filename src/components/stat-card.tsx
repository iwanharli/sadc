import Link from "next/link"
import { ArrowUpRight, type LucideIcon } from "lucide-react"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

const tones = {
  primary: { chip: "bg-primary/12 text-primary", card: "" },
  success: { chip: "bg-success/15 text-success", card: "" },
  warning: { chip: "bg-warning/15 text-warning", card: "" },
  info: { chip: "bg-info/15 text-info", card: "" },
  danger: {
    chip: "bg-destructive/15 text-destructive",
    card: "border-destructive/30 bg-gradient-to-br from-destructive/10 to-transparent",
  },
} as const

export type Tone = keyof typeof tones

export function StatCard({
  label,
  description,
  value,
  hint,
  icon: Icon,
  tone = "primary",
  href,
}: {
  label: string
  description?: string
  value: number | string
  hint?: React.ReactNode
  icon?: LucideIcon
  tone?: Tone
  href?: string
}) {
  const t = tones[tone]
  const isDanger = tone === "danger"

  const body = (
    <Card
      className={cn(
        "group h-full gap-0 p-6 transition-all",
        href && "hover:-translate-y-0.5 hover:shadow-lg",
        t.card,
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className={cn("text-lg font-semibold leading-snug", isDanger && "text-destructive")}>{label}</p>
          {description && (
            <p className={cn("mt-1 text-[15px] text-muted-foreground", isDanger && "text-destructive/80")}>{description}</p>
          )}
        </div>
        {Icon && (
          <div className={cn("flex size-12 shrink-0 items-center justify-center rounded-xl", t.chip)}>
            <Icon className="size-6" />
          </div>
        )}
      </div>
      <p className={cn("mt-6 text-5xl font-bold tracking-tight tabular-nums", isDanger && "text-destructive")}>
        {typeof value === "number" ? value.toLocaleString("id-ID") : value}
      </p>
      {(hint || href) && (
        <div className="mt-3 flex items-center justify-between gap-2">
          {hint && <p className={cn("text-[15px] text-muted-foreground", isDanger && "text-destructive/85")}>{hint}</p>}
          {href && (
            <ArrowUpRight
              className={cn(
                "ml-auto size-5 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5",
                isDanger && "text-destructive",
              )}
            />
          )}
        </div>
      )}
    </Card>
  )

  return href ? (
    <Link href={href} className="block h-full rounded-xl focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
      {body}
    </Link>
  ) : (
    body
  )
}
