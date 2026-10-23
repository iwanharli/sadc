import { Badge } from "@/components/ui/badge"

export function PageHeader({
  title,
  description,
  eyebrow,
  actions,
}: {
  title: string
  description?: React.ReactNode
  eyebrow?: string
  actions?: React.ReactNode
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="space-y-1.5">
        {eyebrow && (
          <Badge variant="secondary" className="mb-1 bg-accent text-accent-foreground">
            {eyebrow}
          </Badge>
        )}
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{title}</h1>
        {description && <div className="text-lg text-muted-foreground">{description}</div>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

export function SectionLabel({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="mb-4 mt-10 flex items-center gap-3">
      <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">{title}</h2>
      {hint && <span className="text-[15px] text-muted-foreground/80">{hint}</span>}
      <div className="h-px flex-1 bg-border" />
    </div>
  )
}
