import Link from "next/link"
import { ArrowRight, Ban, BadgeCheck, Printer, ShieldAlert, UserPlus, Users } from "lucide-react"
import { ChartCard } from "@/components/dashboard/chart-card"
import { TrenChart } from "@/components/dashboard/charts"
import { HeroTotal } from "@/components/dashboard/hero-total"
import { parsePeriode, PeriodTabs } from "@/components/dashboard/period-tabs"
import { RecentList } from "@/components/dashboard/recent-list"
import { EmptyState } from "@/components/empty-state"
import { PageHeader } from "@/components/page-header"
import { StatCard } from "@/components/stat-card"
import { Button } from "@/components/ui/button"
import { requireUser } from "@/server/auth"
import { getPendataanTerbaru, getPoldaNama, getRingkasan, getTren } from "@/server/queries"
import { getZona } from "@/server/zona"

export default async function OperatorHome({ searchParams }: { searchParams: Promise<{ periode?: string }> }) {
  const periode = parsePeriode((await searchParams).periode)
  const user = await requireUser("OPERATOR")
  const tz = await getZona()
  const [r, wilayah, tren, terbaru] = await Promise.all([
    getRingkasan(user.poldaId),
    getPoldaNama(user.poldaId),
    getTren(periode, user.poldaId, tz),
    getPendataanTerbaru(12, user.poldaId),
  ])

  const satpamPeriode = tren.data.reduce((a, d) => a + d.satpam, 0)
  const dcPeriode = tren.data.reduce((a, d) => a + d.dc, 0)

  return (
    // desktop tinggi: dipaskan satu layar (tinggi layar − header 4rem − padding 3rem); selain itu tersusun & bisa digulir
    <div className="flex flex-col gap-5 fit:h-[calc(100svh-7rem)]">
      <PageHeader
        ringkas
        title={`Halo, ${user.name.split(" ").slice(-2).join(" ")}`}
        description={`Ringkasan pendataan di ${wilayah ?? "wilayah Anda"}`}
        actions={
          <>
            <PeriodTabs value={periode} basePath="/operator" />
            <Button asChild size="lg" className="h-11 px-5 text-[15px]">
              <Link href="/operator/pemohon/baru">
                <UserPlus className="size-5" /> Pendataan Baru
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-5 xl:grid-cols-12 fit:min-h-0 fit:flex-1 fit:grid-rows-[minmax(0,5fr)_minmax(0,6fr)]">
        {/* Baris atas: hero + 4 KPI */}
        <div className="xl:col-span-5">
          <HeroTotal ringkas periode={periode} total={tren.total} perubahan={tren.perubahan} rataHarian={tren.rataHarian} satpam={satpamPeriode} dc={dcPeriode} />
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:col-span-7 fit:grid-rows-2">
          <StatCard ringkas label="KTA aktif" description="Berlaku di wilayah Anda" value={r.aktif} icon={BadgeCheck} tone="success" />
          <StatCard ringkas label="KTA diterbitkan" description="Total terbit di wilayah Anda" value={r.terbit} icon={Printer} tone="info" href="/operator/satpam" />
          <StatCard ringkas label="KTA dibekukan" description="Nonaktif sementara" value={r.dibekukan} icon={ShieldAlert} tone="danger" href="/operator/sanksi" />
          <StatCard ringkas label="KTA dicabut" description="Nonaktif permanen" value={r.dicabut} icon={Ban} tone="danger" href="/operator/sanksi" />
        </div>

        {/* Baris bawah: tren + pendataan terbaru */}
        <ChartCard
          className="xl:col-span-8 fit:h-full"
          title="Pendataan harian"
          description={`Pemohon yang didata per hari, per profesi · ${periode} hari`}
          bodyClassName="pt-4 pb-3"
        >
          <TrenChart data={tren.data} isi />
        </ChartCard>
        <ChartCard
          className="xl:col-span-4 fit:h-full"
          title="Pendataan terbaru"
          description="Di wilayah Anda"
          bodyClassName="overflow-y-auto p-0"
          action={
            <Button variant="ghost" asChild className="h-9">
              <Link href="/operator/satpam">
                Semua <ArrowRight className="size-4" />
              </Link>
            </Button>
          }
        >
          {r.total === 0 ? (
            <div className="p-5">
              <EmptyState icon={Users} title="Belum ada pendataan" description="Mulai mendata Satpam atau Penagih Utang." />
            </div>
          ) : (
            <RecentList items={terbaru} showPolda={false} />
          )}
        </ChartCard>
      </div>
    </div>
  )
}
