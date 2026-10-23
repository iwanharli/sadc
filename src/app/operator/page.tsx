import Link from "next/link"
import { ArrowRight, BadgeCheck, CalendarClock, FilePen, Printer, ShieldAlert, UserPlus, Users } from "lucide-react"
import { ChartCard } from "@/components/dashboard/chart-card"
import { TrenChart } from "@/components/dashboard/charts"
import { HeroTotal } from "@/components/dashboard/hero-total"
import { parsePeriode, PeriodTabs } from "@/components/dashboard/period-tabs"
import { RecentList } from "@/components/dashboard/recent-list"
import { EmptyState } from "@/components/empty-state"
import { PageHeader, SectionLabel } from "@/components/page-header"
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
    getPendataanTerbaru(6, user.poldaId),
  ])

  const satpamPeriode = tren.data.reduce((a, d) => a + d.satpam, 0)
  const dcPeriode = tren.data.reduce((a, d) => a + d.dc, 0)

  return (
    <>
      <PageHeader
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
          <StatCard label="KTA aktif" description="Kartu berlaku di wilayah Anda" value={r.aktif} icon={BadgeCheck} tone="success" />
          <StatCard
            label="Menunggu cetak"
            description="Sudah terverifikasi otomatis"
            value={r.menungguCetak}
            hint="buka antrean cetak"
            icon={Printer}
            tone="info"
            href="/operator/cetak"
          />
        </div>
      </div>

      <SectionLabel title="Perlu perhatian" />
      <div className="grid gap-5 sm:grid-cols-3">
        <StatCard label="Draf belum lengkap" description="Lengkapi persyaratannya" value={r.draf} icon={FilePen} tone="warning" href="/operator/pemohon" />
        <StatCard label="Segera kedaluwarsa" description="Berakhir ≤ 30 hari lagi" value={r.segeraKedaluwarsa} icon={CalendarClock} tone="warning" />
        <StatCard label="Dibekukan / dicabut" description="KTA di wilayah Anda" value={r.dibekukan + r.dicabut} icon={ShieldAlert} tone="danger" href="/operator/sanksi" />
      </div>

      <SectionLabel title="Aktivitas" hint={`${periode} hari terakhir`} />
      {r.total === 0 ? (
        <EmptyState
          icon={Users}
          title="Belum ada pendataan"
          description="Mulai mendata Satpam atau Debt Collector yang mengajukan KTA & sertifikat."
          action={
            <Button asChild>
              <Link href="/operator/pemohon/baru">
                <UserPlus className="size-4" /> Pendataan Baru
              </Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-5 xl:grid-cols-5">
          <ChartCard className="xl:col-span-3" title="Pendataan harian" description="Pemohon yang didata per hari, per profesi">
            <TrenChart data={tren.data} />
          </ChartCard>
          <ChartCard
            className="xl:col-span-2"
            title="Pendataan terbaru"
            description="Di wilayah Anda"
            bodyClassName="p-0"
            action={
              <Button variant="ghost" asChild>
                <Link href="/operator/pemohon">
                  Semua <ArrowRight className="size-4" />
                </Link>
              </Button>
            }
          >
            <RecentList items={terbaru} showPolda={false} />
          </ChartCard>
        </div>
      )}
    </>
  )
}
