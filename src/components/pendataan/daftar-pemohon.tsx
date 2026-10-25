import Link from "next/link"
import { ChevronLeft, ChevronRight, Search, Users } from "lucide-react"
import { EmptyState } from "@/components/empty-state"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { formatTanggal } from "@/lib/waktu"
import type { daftarPemohon } from "@/server/pendataan"
import { labelProfesi, StatusBadge } from "./status-badge"

type Hasil = Awaited<ReturnType<typeof daftarPemohon>>
type Params = { q?: string; status?: string; profesi?: string; polda?: string; page?: string }

const STATUS = [
  { v: "", t: "Semua" },
  { v: "AKTIF", t: "Aktif" },
  { v: "DIBEKUKAN", t: "Dibekukan" },
  { v: "DICABUT", t: "Dicabut" },
  { v: "KEDALUWARSA", t: "Kedaluwarsa" },
]
const PROFESI = [
  { v: "", t: "Semua profesi" },
  { v: "SATPAM", t: "Satpam" },
  { v: "DEBT_COLLECTOR", t: "Penagih Utang" },
]


export function DaftarPemohon({
  hasil,
  params,
  basePath,
  showPolda,
  tz,
  filterTambahan,
}: {
  hasil: Hasil
  params: Params
  basePath: string
  showPolda?: boolean
  tz: string
  filterTambahan?: React.ReactNode
}) {
  const href = (ubah: Partial<Params>) => {
    const sp = new URLSearchParams()
    const gabung = { ...params, page: undefined, ...ubah }
    for (const [k, v] of Object.entries(gabung)) if (v) sp.set(k, v)
    const s = sp.toString()
    return s ? `${basePath}?${s}` : basePath
  }
  const dari = (hasil.page - 1) * hasil.perPage + 1
  const sampai = Math.min(hasil.total, hasil.page * hasil.perPage)

  return (
    <Card className="gap-0 overflow-hidden p-0">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-6 py-5">
        <div>
          <h3 className="text-lg font-semibold">Daftar pemohon</h3>
          <p className="text-[15px] text-muted-foreground">{hasil.total.toLocaleString("id-ID")} pendataan ditemukan</p>
        </div>
        {hasil.total > 0 && (
          <span className="rounded-full bg-muted px-3 py-1 text-sm font-medium tabular-nums">
            {dari.toLocaleString("id-ID")}–{sampai.toLocaleString("id-ID")} / {hasil.total.toLocaleString("id-ID")}
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3 border-b px-6 py-4">
        <form action={basePath} className="relative min-w-64 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            name="q"
            defaultValue={params.q}
            placeholder="Cari nama, no. registrasi, NIK lengkap, atau 6 digit awal NIK..."
            className="h-11 pl-10 text-[15px]"
          />
          {params.status && <input type="hidden" name="status" value={params.status} />}
          {params.profesi && <input type="hidden" name="profesi" value={params.profesi} />}
          {params.polda && <input type="hidden" name="polda" value={params.polda} />}
        </form>
        <Segmen opsi={STATUS} aktif={params.status ?? ""} href={(v) => href({ status: v || undefined })} />
        <Segmen opsi={PROFESI} aktif={params.profesi ?? ""} href={(v) => href({ profesi: v || undefined })} />
        {filterTambahan}
      </div>

      {hasil.rows.length === 0 ? (
        <div className="p-6">
          <EmptyState icon={Users} title="Tidak ada data" description="Coba ubah kata kunci atau filter." />
        </div>
      ) : (
        <Table className="text-[15px]">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="h-12 pl-6 text-sm font-semibold uppercase tracking-wide">Pemohon</TableHead>
              <TableHead className="h-12 text-sm font-semibold uppercase tracking-wide">Profesi & perusahaan</TableHead>
              {showPolda && <TableHead className="h-12 text-sm font-semibold uppercase tracking-wide">Polda</TableHead>}
              <TableHead className="h-12 text-sm font-semibold uppercase tracking-wide">Tanggal</TableHead>
              <TableHead className="h-12 pr-6 text-sm font-semibold uppercase tracking-wide">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {hasil.rows.map((r) => (
              <TableRow key={r.id} className="group cursor-pointer">
                <TableCell className="py-4 pl-6">
                  <Link href={`${basePath}/${r.id}`} className="flex items-center gap-3">
                    <span
                      className={cn(
                        "flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white",
                        r.profesi === "SATPAM" ? "bg-series-satpam" : "bg-series-dc",
                      )}
                    >
                      {r.nama.split(" ").slice(0, 2).map((w) => w[0]).join("")}
                    </span>
                    <span className="min-w-0">
                      <span className="block font-semibold group-hover:text-primary">{r.nama}</span>
                      <span className="block font-mono text-sm text-muted-foreground">{r.nik}</span>
                    </span>
                  </Link>
                </TableCell>
                <TableCell>
                  <span className="block font-medium">{labelProfesi(r.profesi)}</span>
                  <span className="block max-w-64 truncate text-sm text-muted-foreground">{r.perusahaan ?? "—"}</span>
                </TableCell>
                {showPolda && <TableCell>{r.polda.replace(/^Polda /, "")}</TableCell>}
                <TableCell>
                  <span className="block">{formatTanggal(r.createdAt, tz, { day: "numeric", month: "short", year: "numeric" })}</span>
                  <span className="block font-mono text-sm text-muted-foreground">{r.noRegistrasi}</span>
                </TableCell>
                <TableCell className="pr-6">
                  <StatusBadge status={r.status} kartu={r.kartu} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {hasil.pages > 1 && (
        <div className="flex items-center justify-between gap-3 border-t px-6 py-4">
          <p className="text-[15px] text-muted-foreground">
            Halaman {hasil.page} dari {hasil.pages}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" asChild={hasil.page > 1} disabled={hasil.page <= 1}>
              {hasil.page > 1 ? (
                <Link href={href({ page: String(hasil.page - 1) })}>
                  <ChevronLeft className="size-4" /> Sebelumnya
                </Link>
              ) : (
                <span>
                  <ChevronLeft className="size-4" /> Sebelumnya
                </span>
              )}
            </Button>
            <Button variant="outline" asChild={hasil.page < hasil.pages} disabled={hasil.page >= hasil.pages}>
              {hasil.page < hasil.pages ? (
                <Link href={href({ page: String(hasil.page + 1) })}>
                  Berikutnya <ChevronRight className="size-4" />
                </Link>
              ) : (
                <span>
                  Berikutnya <ChevronRight className="size-4" />
                </span>
              )}
            </Button>
          </div>
        </div>
      )}
    </Card>
  )
}

function Segmen({ opsi, aktif, href }: { opsi: { v: string; t: string }[]; aktif: string; href: (v: string) => string }) {
  return (
    <div className="inline-flex rounded-xl border bg-background p-1">
      {opsi.map((o) => (
        <Link
          key={o.v}
          href={href(o.v)}
          className={cn(
            "rounded-lg px-3.5 py-1.5 text-[15px] font-medium transition-colors",
            aktif === o.v ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {o.t}
        </Link>
      ))}
    </div>
  )
}
