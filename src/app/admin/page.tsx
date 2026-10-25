import Link from "next/link"
import { ArrowRight, Ban, BadgeCheck, Printer, ShieldAlert } from "lucide-react"
import { ChartCard } from "@/components/dashboard/chart-card"
import { PoldaChart, TrenChart } from "@/components/dashboard/charts"
import { HeroTotal } from "@/components/dashboard/hero-total"
import { PetaSebaran } from "@/components/dashboard/peta-sebaran"
import { parsePeriode, PeriodTabs } from "@/components/dashboard/period-tabs"
import { RecentList } from "@/components/dashboard/recent-list"
import { PageHeader } from "@/components/page-header"
import { StatCard } from "@/components/stat-card"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatTanggal } from "@/lib/waktu"
import { getPendataanTerbaru, getRekapPerPolda, getRingkasan, getTren } from "@/server/queries"
import { getZona } from "@/server/zona"

const nf = new Intl.NumberFormat("id-ID")

export default async function AdminDashboard({ searchParams }: { searchParams: Promise<{ periode?: string }> }) {
  const periode = parsePeriode((await searchParams).periode)
  const tz = await getZona()
  const tglPanjang = (d: Date) => formatTanggal(d, tz, { day: "numeric", month: "short", year: "numeric" })
  const [r, rekap, tren, terbaru] = await Promise.all([
    getRingkasan(),
    getRekapPerPolda(),
    getTren(periode, null, tz),
    getPendataanTerbaru(12),
  ])

  const satpamPeriode = tren.data.reduce((a, d) => a + d.satpam, 0)
  const dcPeriode = tren.data.reduce((a, d) => a + d.dc, 0)
  const rekapUrut = [...rekap].sort((a, b) => b.total - a.total)
  const maxPolda = Math.max(1, rekapUrut[0]?.total ?? 1)
  const mulai = new Date(Date.now() - (periode - 1) * 86_400_000)

  return (
    // desktop tinggi: dipaskan satu layar (tinggi layar − header 4rem − padding 3rem); selain itu tersusun & bisa digulir
    <div className="flex flex-col gap-5 fit:h-[calc(100svh-7rem)]">
      <PageHeader
        ringkas
        title="Ringkasan"
        description={`${tglPanjang(mulai)} – ${tglPanjang(new Date())} · ${periode} hari · Nasional`}
        actions={<PeriodTabs value={periode} basePath="/admin" />}
      />

      <div className="grid gap-5 xl:grid-cols-12 fit:min-h-0 fit:flex-1 fit:grid-rows-[minmax(0,5fr)_minmax(0,6fr)]">
        {/* Baris atas: hero + 4 KPI */}
        <div className="xl:col-span-5">
          <HeroTotal ringkas periode={periode} total={tren.total} perubahan={tren.perubahan} rataHarian={tren.rataHarian} satpam={satpamPeriode} dc={dcPeriode} />
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:col-span-7 fit:grid-rows-2">
          <StatCard ringkas label="KTA aktif" description="Berlaku saat ini, seluruh Polda" value={r.aktif} icon={BadgeCheck} tone="success" />
          <StatCard ringkas label="KTA diterbitkan" description="Seluruh KTA yang pernah terbit" value={r.terbit} icon={Printer} tone="info" />
          <StatCard ringkas label="KTA dibekukan" description="Nonaktif sementara" value={r.dibekukan} icon={ShieldAlert} tone="danger" href="/admin/sanksi" />
          <StatCard ringkas label="KTA dicabut" description="Nonaktif permanen" value={r.dicabut} icon={Ban} tone="danger" href="/admin/sanksi" />
        </div>

        {/* Baris bawah: tren + tab sebaran/aktivitas */}
        <ChartCard
          className="xl:col-span-7 fit:h-full"
          title="Pendataan harian"
          description={`Pemohon yang didata per hari, per profesi · ${periode} hari`}
          bodyClassName="pt-4 pb-3"
        >
          <TrenChart data={tren.data} isi />
        </ChartCard>

        <Card className="gap-0 overflow-hidden p-0 xl:col-span-5 fit:h-full">
          <Tabs defaultValue="peta" className="flex h-full min-h-0 flex-col gap-0">
            <div className="flex shrink-0 items-center justify-between gap-2 border-b px-4 py-3">
              <TabsList className="h-10">
                <TabsTrigger value="peta" className="px-3 text-[15px]">Peta</TabsTrigger>
                <TabsTrigger value="polda" className="px-3 text-[15px]">Polda teratas</TabsTrigger>
                <TabsTrigger value="terbaru" className="px-3 text-[15px]">Terbaru</TabsTrigger>
                <TabsTrigger value="rekap" className="px-3 text-[15px]">Rekap</TabsTrigger>
              </TabsList>
              <Button variant="ghost" asChild className="h-9 shrink-0 px-2 2xl:px-3" title="Buka Laporan">
                <Link href="/admin/laporan">
                  <span className="hidden 2xl:inline">Laporan</span> <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>

            <TabsContent value="peta" className="min-h-0 flex-1 p-5">
              <PetaSebaran rekap={rekap} isi />
            </TabsContent>
            <TabsContent value="polda" className="min-h-0 flex-1 overflow-y-auto p-5">
              <PoldaChart data={rekapUrut.slice(0, 10)} />
            </TabsContent>
            <TabsContent value="terbaru" className="min-h-0 flex-1 overflow-y-auto">
              <RecentList items={terbaru} />
            </TabsContent>
            <TabsContent value="rekap" className="min-h-0 flex-1 overflow-y-auto">
              <Table className="text-[15px]">
                <TableHeader className="sticky top-0 z-10 bg-card">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="h-11 pl-5 text-sm font-semibold">Polda</TableHead>
                    <TableHead className="h-11 text-right text-sm font-semibold">Satpam</TableHead>
                    <TableHead className="h-11 text-right text-sm font-semibold">Penagih Utang</TableHead>
                    <TableHead className="h-11 w-[32%] pr-5 text-sm font-semibold">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rekapUrut.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="py-3 pl-5 font-medium">{row.nama.replace(/^Polda /, "")}</TableCell>
                      <TableCell className="text-right tabular-nums">{nf.format(row.satpam)}</TableCell>
                      <TableCell className="text-right tabular-nums">{nf.format(row.dc)}</TableCell>
                      <TableCell className="pr-5">
                        <div className="flex items-center gap-2">
                          <Progress value={(row.total / maxPolda) * 100} className="h-2" />
                          <span className="w-12 text-right font-semibold tabular-nums">{nf.format(row.total)}</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  )
}
