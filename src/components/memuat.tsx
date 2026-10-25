import { Skeleton } from "@/components/ui/skeleton"

/** Kerangka halaman saat data dimuat — tampil seketika saat berpindah menu. */
export function Memuat() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Memuat halaman">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-3">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-5 w-96 max-w-full" />
        </div>
        <Skeleton className="h-11 w-56 rounded-xl" />
      </div>
      <div className="grid gap-5 xl:grid-cols-12">
        <Skeleton className="h-60 rounded-xl xl:col-span-5" />
        <div className="grid gap-5 sm:grid-cols-2 xl:col-span-7">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      </div>
      <div className="grid gap-5 xl:grid-cols-12">
        <Skeleton className="h-80 rounded-xl xl:col-span-8" />
        <Skeleton className="h-80 rounded-xl xl:col-span-4" />
      </div>
    </div>
  )
}
