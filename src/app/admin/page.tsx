import Link from "next/link"
import { ArrowRight, Ban, BadgeCheck, CalendarClock, FilePen, Printer, ShieldAlert } from "lucide-react"
import { ChartCard } from "@/components/dashboard/chart-card"
import { PoldaChart, TrenChart } from "@/components/dashboard/charts"
import { HeroTotal } from "@/components/dashboard/hero-total"
import { parsePeriode, PeriodTabs } from "@/components/dashboard/period-tabs"
import { RecentList } from "@/components/dashboard/recent-list"
import { PageHeader, SectionLabel } from "@/components/page-header"
import { StatCard } from "@/components/stat-card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
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
    getPendataanTerbaru(6),
  ])

  const satpamPeriode = tren.data.reduce((a, d) => a + d.satpam, 0)
  const dcPeriode = tren.data.reduce((a, d) => a + d.dc, 0)
  const rekapUrut = [...rekap].sort((a, b) => b.total - a.total)
  const top = rekapUrut.slice(0, 8)
  const maxPolda = Math.max(1, rekapUrut[0]?.total ?? 1)
  const mulai = new Date(Date.now() - (periode - 1) * 86_400_000)

  return (
    <>
      <PageHeader
        title="Ringkasan"
        description={`${tglPanjang(mulai)} – ${tglPanjang(new Date())} · ${periode} hari · Nasional`}
        actions={<PeriodTabs value={periode} basePath="/admin" />}
      />

      {/* Baris 1: hero + KPI utama */}
      <div className="grid gap-5 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <HeroTotal
            periode={periode}
            total={tren.total}
            perubahan={tren.perubahan}
            rataHarian={tren.rataHarian}
            satpam={satpamPeriode}
            dc={dcPeriode}
          />
        </div>
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-1">
          <StatCard
            label="KTA aktif"
            description="Kartu berlaku saat ini, seluruh Polda"
            value={r.aktif}
            hint={`dari ${nf.format(r.total)} total pendataan`}
            icon={BadgeCheck}
            tone="success"
          />
          <StatCard
            label="Menunggu cetak"
            description="Terverifikasi otomatis, belum dicetak"
            value={r.menungguCetak}
            hint="siap dicetak Operator"
            icon={Printer}
            tone="info"
          />
        </div>
      </div>

      <SectionLabel title="Perlu perhatian" hint="pantau dan tindak lanjuti" />
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Draf belum lengkap" description="Persyaratan belum terpenuhi" value={r.draf} hint="menunggu Operator melengkapi" icon={FilePen} tone="warning" />
        <StatCard label="Segera kedaluwarsa" description="Berakhir ≤ 30 hari lagi" value={r.segeraKedaluwarsa} hint="ingatkan perpanjangan" icon={CalendarClock} tone="warning" />
        <StatCard label="KTA dibekukan" description="Nonaktif sementara" value={r.dibekukan} hint="perlu tindak lanjut" icon={ShieldAlert} tone="danger" href="/admin/sanksi" />
        <StatCard label="KTA dicabut" description="Nonaktif permanen" value={r.dicabut} hint="lihat daftar & alasan" icon={Ban} tone="danger" href="/admin/sanksi" />
      </div>

      <SectionLabel title="Tren & sebaran" hint={`${periode} hari terakhir`} />
      <div className="grid gap-5 xl:grid-cols-5">
        <ChartCard
          className="xl:col-span-3"
          title="Pendataan harian"
          description="Jumlah pemohon yang didata per hari, per profesi"
        >
          <TrenChart data={tren.data} />
        </ChartCard>
        <ChartCard
          className="xl:col-span-2"
          title="Polda teratas"
          description="Total pendataan sepanjang waktu"
          bodyClassName="pt-4"
        >
          <PoldaChart data={top} />
        </ChartCard>
      </div>

      <SectionLabel title="Aktivitas & rekap" />
      <div className="grid gap-5 xl:grid-cols-5">
        <ChartCard
          className="xl:col-span-2"
          title="Pendataan terbaru"
          description="Dari seluruh Polda"
          bodyClassName="p-0"
          action={
            <Button variant="ghost" asChild>
              <Link href="/admin/pemohon">
                Semua <ArrowRight className="size-4" />
              </Link>
            </Button>
          }
        >
          <RecentList items={terbaru} />
        </ChartCard>

        <ChartCard
          className="xl:col-span-3"
          title="Rekap per Polda"
          description={`${rekap.length} Polda · diurutkan dari terbanyak`}
          bodyClassName="max-h-[460px] overflow-y-auto p-0"
        >
          <Table className="text-[15px]">
            <TableHeader className="sticky top-0 z-10 bg-card">
              <TableRow className="hover:bg-transparent">
                <TableHead className="h-12 pl-6 text-sm font-semibold">Polda</TableHead>
                <TableHead className="h-12 text-right text-sm font-semibold">Satpam</TableHead>
                <TableHead className="h-12 text-right text-sm font-semibold">Debt Collector</TableHead>
                <TableHead className="h-12 w-[30%] pr-6 text-sm font-semibold">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rekapUrut.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="py-3.5 pl-6 font-medium">{row.nama.replace(/^Polda /, "")}</TableCell>
                  <TableCell className="text-right tabular-nums">{nf.format(row.satpam)}</TableCell>
                  <TableCell className="text-right tabular-nums">{nf.format(row.dc)}</TableCell>
                  <TableCell className="pr-6">
                    <div className="flex items-center gap-3">
                      <Progress value={(row.total / maxPolda) * 100} className="h-2" />
                      <span className="w-14 text-right font-semibold tabular-nums">{nf.format(row.total)}</span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ChartCard>
      </div>

    </>
  )
}
