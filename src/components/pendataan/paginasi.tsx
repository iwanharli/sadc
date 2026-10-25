"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem } from "@/components/ui/pagination"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PILIHAN_PER_HALAMAN } from "@/lib/filter-pemohon"
import { cn } from "@/lib/utils"

const nf = new Intl.NumberFormat("id-ID")

/** Nomor halaman yang ditampilkan: awal, akhir, dan sekitar halaman aktif; celah diganti "…". */
function nomorHalaman(page: number, pages: number): (number | "…")[] {
  const set = new Set([1, pages, page - 1, page, page + 1])
  if (page <= 3) [2, 3, 4].forEach((n) => set.add(n))
  if (page >= pages - 2) [pages - 1, pages - 2, pages - 3].forEach((n) => set.add(n))
  const urut = [...set].filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b)
  const hasil: (number | "…")[] = []
  urut.forEach((n, i) => {
    if (i > 0 && n - urut[i - 1] > 1) hasil.push(n - urut[i - 1] === 2 ? n - 1 : "…")
    hasil.push(n)
  })
  return hasil
}

/**
 * Paginasi tabel: info jumlah data, pilihan baris per halaman, nomor halaman, & lompat ke halaman.
 * Memakai Link Next.js (tanpa muat ulang penuh); filter lain dipertahankan lewat `query`.
 */
export function Paginasi({
  page,
  pages,
  total,
  perPage,
  basePath,
  query,
}: {
  page: number
  pages: number
  total: number
  perPage: number
  basePath: string
  query: Record<string, string | undefined>
}) {
  const router = useRouter()
  const href = (ubah: { page?: number; per?: number }) => {
    const sp = new URLSearchParams()
    for (const [k, v] of Object.entries(query)) if (v && k !== "page" && k !== "per") sp.set(k, v)
    const per = ubah.per ?? perPage
    if (per !== 20) sp.set("per", String(per))
    const p = ubah.page ?? 1
    if (p > 1) sp.set("page", String(p))
    const s = sp.toString()
    return s ? `${basePath}?${s}` : basePath
  }
  const dari = total === 0 ? 0 : (page - 1) * perPage + 1
  const sampai = Math.min(total, page * perPage)

  const Tombol = ({ ke, label, children, aktif }: { ke: number; label: string; children: React.ReactNode; aktif?: boolean }) => {
    const nonaktif = ke < 1 || ke > pages || (ke === page && !aktif)
    return (
      <Button
        asChild={!nonaktif}
        variant={aktif ? "default" : "ghost"}
        size="icon"
        className={cn("size-10 text-[15px]", aktif && "pointer-events-none shadow-sm")}
        disabled={nonaktif}
        aria-label={label}
        aria-current={aktif ? "page" : undefined}
      >
        {nonaktif ? <span>{children}</span> : <Link href={href({ page: ke })} scroll={false}>{children}</Link>}
      </Button>
    )
  }

  return (
    <div className="flex flex-col gap-4 border-t px-6 py-3.5 xl:flex-row xl:items-center xl:justify-between">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[15px] whitespace-nowrap text-muted-foreground xl:flex-nowrap">
        <span>
          Menampilkan <b className="font-semibold text-foreground tabular-nums">{nf.format(dari)}–{nf.format(sampai)}</b> dari{" "}
          <b className="font-semibold text-foreground tabular-nums">{nf.format(total)}</b> data
        </span>
        <span className="hidden h-5 w-px bg-border sm:block" aria-hidden />
        <span className="flex items-center gap-2">
          Per halaman
          <Select value={String(perPage)} onValueChange={(v) => router.push(href({ per: Number(v) }), { scroll: false })}>
            <SelectTrigger className="h-9 w-[76px] text-[15px]" aria-label="Baris per halaman">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PILIHAN_PER_HALAMAN.map((n) => (
                <SelectItem key={n} value={String(n)} className="text-[15px]">
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </span>
      </div>

      {pages > 1 && (
        <div className="flex items-center gap-4">
          <Pagination className="mx-0 w-auto">
            <PaginationContent className="gap-1">
              <PaginationItem>
                <Tombol ke={1} label="Halaman pertama"><ChevronsLeft className="size-4" /></Tombol>
              </PaginationItem>
              <PaginationItem>
                <Tombol ke={page - 1} label="Halaman sebelumnya"><ChevronLeft className="size-4" /></Tombol>
              </PaginationItem>
              {nomorHalaman(page, pages).map((n, i) =>
                n === "…" ? (
                  <PaginationItem key={`e${i}`} className="hidden sm:block">
                    <PaginationEllipsis className="size-10" />
                  </PaginationItem>
                ) : (
                  <PaginationItem key={n} className={cn(Math.abs(n - page) > 1 && n !== 1 && n !== pages && "hidden sm:block")}>
                    <Tombol ke={n} label={`Halaman ${n}`} aktif={n === page}>
                      <span className="tabular-nums">{nf.format(n)}</span>
                    </Tombol>
                  </PaginationItem>
                ),
              )}
              <PaginationItem>
                <Tombol ke={page + 1} label="Halaman berikutnya"><ChevronRight className="size-4" /></Tombol>
              </PaginationItem>
              <PaginationItem>
                <Tombol ke={pages} label="Halaman terakhir"><ChevronsRight className="size-4" /></Tombol>
              </PaginationItem>
            </PaginationContent>
          </Pagination>

          <form
            className="hidden items-center gap-2 border-l pl-4 text-[15px] whitespace-nowrap text-muted-foreground 2xl:flex"
            onSubmit={(e) => {
              e.preventDefault()
              const n = Number(new FormData(e.currentTarget).get("ke"))
              if (Number.isInteger(n) && n >= 1 && n <= pages) router.push(href({ page: n }), { scroll: false })
            }}
          >
            Ke halaman
            <Input name="ke" type="number" min={1} max={pages} placeholder={String(page)} className="h-9 w-20 text-center text-[15px]" aria-label="Nomor halaman" />
          </form>
        </div>
      )}
    </div>
  )
}
