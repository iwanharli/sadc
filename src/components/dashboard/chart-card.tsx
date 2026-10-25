import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export function ChartCard({
  title,
  description,
  action,
  className,
  bodyClassName,
  children,
}: {
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
  bodyClassName?: string
  children: React.ReactNode
}) {
  return (
    <Card className={cn("gap-0 overflow-hidden p-0", className)}>
      <div className="flex shrink-0 flex-wrap items-start justify-between gap-3 border-b px-6 py-4">
        <div>
          <h3 className="text-lg font-semibold">{title}</h3>
          {description && <p className="mt-0.5 text-[15px] text-muted-foreground">{description}</p>}
        </div>
        {action}
      </div>
      <div className={cn("min-h-0 flex-1 p-6", bodyClassName)}>{children}</div>
    </Card>
  )
}
