import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <main className="min-h-svh bg-muted/40 px-4 py-8" aria-busy="true">
      <span className="sr-only">Memeriksa KTA…</span>
      <div className="mx-auto flex max-w-lg items-center gap-3 pb-6">
        <Skeleton className="size-11 rounded-xl" />
        <div className="space-y-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-40" />
        </div>
      </div>
      <Card className="mx-auto max-w-lg gap-0 overflow-hidden p-0">
        <Skeleton className="h-24 rounded-none" />
        <div className="flex gap-5 p-6">
          <Skeleton className="aspect-[3/4] w-28 rounded-xl" />
          <div className="flex-1 space-y-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-3.5 w-20" />
                <Skeleton className="h-5 w-3/4" />
              </div>
            ))}
          </div>
        </div>
      </Card>
    </main>
  )
}
