import { FileDown } from "lucide-react"
import { ChartCard } from "@/components/dashboard/chart-card"
import { PerusahaanChart } from "@/components/dashboard/charts"
import { parsePeriode, PeriodTabs } from "@/components/dashboard/period-tabs"
import { PageHeader, SectionLabel } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { requireUser } from "@/server/auth"
import { kinerjaOperator, rekapPerusahaan } from "@/server/laporan"

const nf = new Intl.NumberFormat("id-ID")
const th = "h-12 text-sm font-semibold uppercase tracking-wide"

export default async function LaporanPage({ searchParams }: { searchParams: Promise<{ periode?: string }> }) {
  await requireUser("ADMIN")
  const periode = parsePeriode((await searchParams).periode)
  const [perusahaan, operator] = await Promise.all([rekapPerusahaan(periode), kinerjaOperator(periode)])
  const top = perusahaan.filter((p) => p.pendataan > 0).slice(0, 12)
  const maxOp = Math.max(1, ...operator.map((o) => o.pendataan))

  return (
    <>
      <PageHeader
        eyebrow="Data"
        title="Laporan"
        description={`Rekap per perusahaan & kinerja operator · ${periode} hari terakhir`}
        actions={
          <>
            <PeriodTabs value={periode} basePath="/admin/laporan" />
            <Button asChild size="lg" className="h-11 px-5 text-[15px]">
              <a href={`/api/laporan?periode=${periode}`} target="_blank" rel="noreferrer">
                <FileDown className="size-5" /> Unduh PDF
              </a>
            </Button>
          </>
        }
      />

      <SectionLabel title="Perusahaan" hint="BUJP & PJPU" />
      <div className="grid gap-5 xl:grid-cols-5">
        <ChartCard className="xl:col-span-2" title="Pendataan terbanyak" description={`12 perusahaan teratas · ${periode} hari`}>
          {top.length ? (
            <>
              <PerusahaanChart data={top} />
              <div className="mt-3 flex gap-5 text-sm text-muted-foreground">
                <span className="flex items-center gap-2"><span className="size-3 rounded-sm bg-series-satpam" /> BUJP</span>
                <span className="flex items-center gap-2"><span className="size-3 rounded-sm bg-series-dc" /> PJPU</span>
              </div>
            </>
          ) : (
            <p className="text-[15px] text-muted-foreground">Belum ada pendataan pada periode ini.</p>
          )}
        </ChartCard>
        <ChartCard className="xl:col-span-3" title="Rekap perusahaan" description="Diurutkan dari pendataan terbanyak" bodyClassName="max-h-[560px] overflow-y-auto p-0">
          <Table className="text-[15px]">
            <TableHeader className="sticky top-0 z-10 bg-card">
              <TableRow className="hover:bg-transparent">
                <TableHead className={cn(th, "pl-6")}>Perusahaan</TableHead>
                <TableHead className={cn(th, "text-right")}>Didata</TableHead>
                <TableHead className={cn(th, "text-right")}>KTA terbit</TableHead>
                <TableHead className={cn(th, "pr-6 text-right")}>KTA aktif</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {perusahaan.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="py-3.5 pl-6">
                    <p className="font-semibold">{p.nama}</p>
                    <p className="text-sm text-muted-foreground">
                      {p.jenis === "BUJP" ? "BUJP" : "PJPU"} · {p.polda.replace(/^Polda /, "")}
                    </p>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{nf.format(p.pendataan)}</TableCell>
                  <TableCell className="text-right tabular-nums">{nf.format(p.terbit)}</TableCell>
                  <TableCell className="pr-6 text-right font-semibold tabular-nums">{nf.format(p.aktif)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ChartCard>
      </div>

      <SectionLabel title="Kinerja operator" hint={`${operator.length} operator`} />
      <ChartCard title="Aktivitas operator" description="Pendataan, KTA yang diterbitkan, dan sanksi dalam periode" bodyClassName="p-0">
        <Table className="text-[15px]">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className={cn(th, "pl-6")}>Operator</TableHead>
              <TableHead className={cn(th, "w-[34%]")}>Pendataan</TableHead>
              <TableHead className={cn(th, "text-right")}>KTA terbit</TableHead>
              <TableHead className={cn(th, "pr-6 text-right")}>Sanksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {operator.map((o) => (
              <TableRow key={o.id} className={cn(!o.aktif && "opacity-55")}>
                <TableCell className="py-3.5 pl-6">
                  <p className="font-semibold">{o.nama}</p>
                  <p className="text-sm text-muted-foreground">
                    <span className="font-mono">{o.username}</span> · {o.polda?.replace(/^Polda /, "") ?? "—"}
                  </p>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${(o.pendataan / maxOp) * 100}%` }} />
                    </div>
                    <span className="w-10 text-right font-semibold tabular-nums">{nf.format(o.pendataan)}</span>
                  </div>
                </TableCell>
                <TableCell className="text-right tabular-nums">{nf.format(o.terbit)}</TableCell>
                <TableCell className="pr-6 text-right tabular-nums">{nf.format(o.sanksi)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ChartCard>
    </>
  )
}
