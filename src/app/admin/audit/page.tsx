import Link from "next/link"
import { and, count, desc, eq, ilike, inArray, type SQL } from "drizzle-orm"
import { ChevronLeft, ChevronRight, ScrollText } from "lucide-react"
import { ChartCard } from "@/components/dashboard/chart-card"
import { EmptyState } from "@/components/empty-state"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatIp } from "@/lib/ip"
import { cn } from "@/lib/utils"
import { formatWaktu } from "@/lib/waktu"
import { requireUser } from "@/server/auth"
import { db, schema } from "@/server/db"
import { getZona } from "@/server/zona"

const LABEL: Record<string, { t: string; cls: string }> = {
  BUAT_PENDATAAN: { t: "Buat pendataan", cls: "bg-primary/12 text-primary" },
  UBAH_PENDATAAN: { t: "Ubah pendataan", cls: "bg-primary/12 text-primary" },
  LIHAT_PEMOHON: { t: "Lihat data pemohon", cls: "bg-muted text-muted-foreground" },
  TERBITKAN_KTA: { t: "Terbitkan KTA", cls: "bg-success/15 text-success" },
  CETAK_KTA: { t: "Cetak KTA", cls: "bg-success/15 text-success" },
  CETAK_SERTIFIKAT: { t: "Cetak sertifikat", cls: "bg-success/15 text-success" },
  BEKUKAN_KTA: { t: "Bekukan KTA", cls: "bg-warning/15 text-warning" },
  CABUT_KTA: { t: "Cabut KTA", cls: "bg-destructive/15 text-destructive" },
  PULIHKAN_KTA: { t: "Pulihkan KTA", cls: "bg-info/15 text-info" },
  HAPUS_BLACKLIST: { t: "Cabut blokir NIK", cls: "bg-warning/15 text-warning" },
  BUAT_PENGGUNA: { t: "Buat pengguna", cls: "bg-info/15 text-info" },
  UBAH_PENGGUNA: { t: "Ubah pengguna", cls: "bg-info/15 text-info" },
  RESET_SANDI: { t: "Reset sandi", cls: "bg-warning/15 text-warning" },
  EKSPOR_PEMOHON: { t: "Ekspor data", cls: "bg-destructive/15 text-destructive" },
}
const KELOMPOK = [
  { v: "", t: "Semua" },
  { v: "data", t: "Pendataan", aksi: ["BUAT_PENDATAAN", "UBAH_PENDATAAN", "LIHAT_PEMOHON"] },
  { v: "kta", t: "KTA", aksi: ["TERBITKAN_KTA", "CETAK_KTA", "CETAK_SERTIFIKAT", "BEKUKAN_KTA", "CABUT_KTA", "PULIHKAN_KTA", "HAPUS_BLACKLIST"] },
  { v: "akun", t: "Akun", aksi: ["BUAT_PENGGUNA", "UBAH_PENGGUNA", "RESET_SANDI"] },
  { v: "ekspor", t: "Ekspor", aksi: ["EKSPOR_PEMOHON"] },
]
const PER = 30

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ q?: string; k?: string; page?: string }> }) {
  await requireUser("ADMIN")
  const sp = await searchParams
  const tz = await getZona()
  const page = Math.max(1, Number(sp.page) || 1)
  const kelompok = KELOMPOK.find((g) => g.v === sp.k && g.aksi)
  const where = and(
    ...([
      kelompok?.aksi ? inArray(schema.auditLog.aksi, kelompok.aksi) : undefined,
      sp.q ? ilike(schema.user.name, `%${sp.q}%`) : undefined,
    ] as (SQL | undefined)[]),
  )

  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        id: schema.auditLog.id,
        aksi: schema.auditLog.aksi,
        entitas: schema.auditLog.entitas,
        entitasId: schema.auditLog.entitasId,
        ip: schema.auditLog.ip,
        data: schema.auditLog.data,
        at: schema.auditLog.at,
        nama: schema.user.name,
        role: schema.user.role,
        polda: schema.polda.nama,
      })
      .from(schema.auditLog)
      .leftJoin(schema.user, eq(schema.auditLog.userId, schema.user.id))
      .leftJoin(schema.polda, eq(schema.user.poldaId, schema.polda.id))
      .where(where)
      .orderBy(desc(schema.auditLog.at))
      .limit(PER)
      .offset((page - 1) * PER),
    db.select({ total: count() }).from(schema.auditLog).leftJoin(schema.user, eq(schema.auditLog.userId, schema.user.id)).where(where),
  ])
  const pages = Math.max(1, Math.ceil(total / PER))
  const href = (ubah: Record<string, string | undefined>) => {
    const p = new URLSearchParams()
    for (const [k, v] of Object.entries({ q: sp.q, k: sp.k, ...ubah })) if (v) p.set(k, v)
    return p.size ? `/admin/audit?${p}` : "/admin/audit"
  }

  return (
    <>
      <PageHeader
        eyebrow="Administrasi"
        title="Audit Log"
        description="Jejak akses & perubahan data pribadi oleh seluruh pengguna (UU PDP)."
      />
      <ChartCard title="Aktivitas" description={`${total.toLocaleString("id-ID")} catatan`} bodyClassName="p-0">
        <div className="flex flex-wrap items-center gap-3 border-b px-6 py-4">
          <form action="/admin/audit" className="min-w-64 flex-1">
            <Input name="q" defaultValue={sp.q} placeholder="Cari nama pengguna..." className="h-11 text-[15px]" />
            {sp.k && <input type="hidden" name="k" value={sp.k} />}
          </form>
          <div className="inline-flex rounded-xl border bg-background p-1">
            {KELOMPOK.map((g) => (
              <Link
                key={g.v}
                href={href({ k: g.v || undefined, page: undefined })}
                className={cn(
                  "rounded-lg px-3.5 py-1.5 text-[15px] font-medium",
                  (sp.k ?? "") === g.v ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {g.t}
              </Link>
            ))}
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="p-6">
            <EmptyState icon={ScrollText} title="Belum ada catatan" />
          </div>
        ) : (
          <Table className="text-[15px]">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="h-12 pl-6 text-sm font-semibold uppercase tracking-wide">Waktu</TableHead>
                <TableHead className="h-12 text-sm font-semibold uppercase tracking-wide">Pengguna</TableHead>
                <TableHead className="h-12 text-sm font-semibold uppercase tracking-wide">Aksi</TableHead>
                <TableHead className="h-12 text-sm font-semibold uppercase tracking-wide">Objek</TableHead>
                <TableHead className="h-12 pr-6 text-sm font-semibold uppercase tracking-wide">IP</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => {
                const l = LABEL[r.aksi] ?? { t: r.aksi, cls: "bg-muted" }
                return (
                  <TableRow key={r.id}>
                    <TableCell className="py-3.5 pl-6 whitespace-nowrap">{formatWaktu(r.at, tz)}</TableCell>
                    <TableCell>
                      <p className="font-medium">{r.nama ?? "Sistem"}</p>
                      <p className="text-sm text-muted-foreground">{r.role === "ADMIN" ? "Admin" : (r.polda ?? "—")}</p>
                    </TableCell>
                    <TableCell>
                      <span className={cn("rounded-full px-2.5 py-1 text-sm font-medium whitespace-nowrap", l.cls)}>{l.t}</span>
                    </TableCell>
                    <TableCell>
                      {r.entitas === "pengajuan" && r.entitasId ? (
                        <Link href={`/admin/pemohon/${r.entitasId}`} className="text-primary hover:underline">
                          Pengajuan #{r.entitasId}
                        </Link>
                      ) : (
                        <span>
                          {r.entitas}
                          {r.entitasId ? ` #${r.entitasId.slice(0, 8)}` : ""}
                        </span>
                      )}
                      {r.data != null && (
                        <p className="max-w-md truncate font-mono text-sm text-muted-foreground">{JSON.stringify(r.data)}</p>
                      )}
                    </TableCell>
                    <TableCell className="pr-6 font-mono text-sm">{formatIp(r.ip)}</TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}

        {pages > 1 && (
          <div className="flex items-center justify-between border-t px-6 py-4">
            <p className="text-[15px] text-muted-foreground">
              Halaman {page} dari {pages}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" asChild disabled={page <= 1}>
                <Link href={href({ page: String(Math.max(1, page - 1)) })} aria-disabled={page <= 1} className={cn(page <= 1 && "pointer-events-none opacity-50")}>
                  <ChevronLeft className="size-4" /> Sebelumnya
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href={href({ page: String(Math.min(pages, page + 1)) })} className={cn(page >= pages && "pointer-events-none opacity-50")}>
                  Berikutnya <ChevronRight className="size-4" />
                </Link>
              </Button>
            </div>
          </div>
        )}
      </ChartCard>
    </>
  )
}
