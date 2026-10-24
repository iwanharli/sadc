import { and, desc, eq, inArray } from "drizzle-orm"
import { Activity, Building2, CalendarDays, LogIn, MapPin, Monitor, ShieldCheck, UserRound } from "lucide-react"
import { ChartCard } from "@/components/dashboard/chart-card"
import { PageHeader } from "@/components/page-header"
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatIp } from "@/lib/ip"
import { formatTanggal, formatWaktu, labelZona } from "@/lib/waktu"
import { db, schema } from "@/server/db"
import { GantiSandi } from "./ganti-sandi"

const LABEL: Record<string, string> = {
  BUAT_PENDATAAN: "Membuat pendataan",
  UBAH_PENDATAAN: "Mengubah pendataan",
  LIHAT_PEMOHON: "Melihat data pemohon",
  TERBITKAN_KTA: "Menerbitkan KTA",
  CETAK_KTA: "Mencetak KTA",
  CETAK_SERTIFIKAT: "Mencetak sertifikat",
  BEKUKAN_KTA: "Membekukan KTA",
  CABUT_KTA: "Mencabut KTA",
  PULIHKAN_KTA: "Memulihkan KTA",
  HAPUS_BLACKLIST: "Mencabut blokir NIK",
  BUAT_PENGGUNA: "Membuat pengguna",
  UBAH_PENGGUNA: "Mengubah pengguna",
  RESET_SANDI: "Mereset sandi pengguna",
  EKSPOR_PEMOHON: "Mengekspor data pemohon",
  UBAH_MASTER: "Mengubah master data",
  GANTI_SANDI: "Mengganti kata sandi",
}

function perangkat(ua: string | null) {
  if (!ua) return "Peramban"
  const b = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "Peramban"
  const os = /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iOS" : /Mac OS X/.test(ua) ? "macOS" : /Windows/.test(ua) ? "Windows" : /Linux/.test(ua) ? "Linux" : ""
  return [b, os].filter(Boolean).join(" · ")
}

export async function HalamanProfil({ userId, tz }: { userId: string; tz: string }) {
  const [u] = await db
    .select({ user: schema.user, polda: schema.polda.nama, zona: schema.polda.zonaWaktu })
    .from(schema.user)
    .leftJoin(schema.polda, eq(schema.user.poldaId, schema.polda.id))
    .where(eq(schema.user.id, userId))
  const [sesi, aktivitas] = await Promise.all([
    db.select().from(schema.session).where(eq(schema.session.userId, userId)).orderBy(desc(schema.session.createdAt)).limit(5),
    db
      .select()
      .from(schema.auditLog)
      .where(and(eq(schema.auditLog.userId, userId), inArray(schema.auditLog.aksi, Object.keys(LABEL))))
      .orderBy(desc(schema.auditLog.at))
      .limit(12),
  ])
  const user = u.user
  const inisial = user.name.split(" ").slice(-2).map((w) => w[0]).join("").toUpperCase()

  return (
    <>
      <PageHeader eyebrow="Akun" title="Profil saya" />
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6">
          <Card className="gap-0 overflow-hidden p-0">
            <div className="bg-hero-gradient h-24" />
            <div className="-mt-12 flex flex-col items-center px-6 pb-6 text-center">
              <div className="flex size-24 items-center justify-center rounded-full bg-gradient-to-br from-primary to-info text-3xl font-bold text-primary-foreground ring-4 ring-card">
                {inisial}
              </div>
              <p className="mt-3 text-2xl font-bold">{user.name}</p>
              <p className="font-mono text-[15px] text-muted-foreground">{user.username}</p>
              <div className="mt-3 flex gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/12 px-3 py-1 text-sm font-medium text-primary">
                  <ShieldCheck className="size-4" /> {user.role === "ADMIN" ? "Admin" : "Operator"}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-success/15 px-3 py-1 text-sm font-medium text-success">
                  <span className="size-2 rounded-full bg-success" /> Aktif
                </span>
              </div>
            </div>
            <dl className="divide-y border-t">
              <Baris icon={UserRound} label="Nama" nilai={user.name} />
              <Baris icon={Building2} label="Satuan" nilai={u.polda ?? "Baharkam Polri (nasional)"} />
              <Baris icon={MapPin} label="Zona waktu tampilan" nilai={`${labelZona(tz)} · ${tz}`} />
              <Baris icon={LogIn} label="Terakhir masuk" nilai={sesi[0] ? formatWaktu(sesi[0].createdAt, tz) : "—"} />
              <Baris icon={CalendarDays} label="Bergabung" nilai={formatTanggal(user.createdAt, tz)} />
            </dl>
            <div className="border-t p-5">
              <GantiSandi />
            </div>
          </Card>
        </div>

        <div className="space-y-6 xl:col-span-2">
          <ChartCard title="Sesi masuk" description="Perangkat yang sedang/pernah masuk dengan akun ini" bodyClassName="p-0">
            <ul className="divide-y">
              {sesi.map((s, i) => (
                <li key={s.id} className="flex items-center gap-4 px-6 py-4">
                  <span className="flex size-10 items-center justify-center rounded-lg bg-muted">
                    <Monitor className="size-5 text-muted-foreground" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-semibold">
                      {perangkat(s.userAgent)} {i === 0 && <span className="ml-1 rounded-full bg-success/15 px-2 py-0.5 text-sm font-medium text-success">Terbaru</span>}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Masuk {formatWaktu(s.createdAt, tz)} · IP <span className="font-mono">{formatIp(s.ipAddress)}</span>
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </ChartCard>

          <ChartCard title="Aktivitas terakhir" description="Tercatat di audit log" bodyClassName="p-0">
            {aktivitas.length === 0 ? (
              <p className="flex items-center gap-2 p-6 text-[15px] text-muted-foreground">
                <Activity className="size-4" /> Belum ada aktivitas.
              </p>
            ) : (
              <Table className="text-[15px]">
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="h-12 pl-6 text-sm font-semibold uppercase tracking-wide">Waktu</TableHead>
                    <TableHead className="h-12 text-sm font-semibold uppercase tracking-wide">Aktivitas</TableHead>
                    <TableHead className="h-12 pr-6 text-sm font-semibold uppercase tracking-wide">IP</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {aktivitas.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="py-3.5 pl-6 whitespace-nowrap">{formatWaktu(a.at, tz)}</TableCell>
                      <TableCell>
                        <span className="flex items-center gap-2">
                          <span className="size-2 rounded-full bg-primary" /> {LABEL[a.aksi] ?? a.aksi}
                        </span>
                      </TableCell>
                      <TableCell className="pr-6 font-mono text-sm">{formatIp(a.ip)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </ChartCard>
        </div>
      </div>
    </>
  )
}

function Baris({ icon: Icon, label, nilai }: { icon: typeof UserRound; label: string; nilai: string }) {
  return (
    <div className="flex items-center gap-3 px-6 py-3.5">
      <Icon className="size-4 shrink-0 text-muted-foreground" />
      <dt className="text-[15px] text-muted-foreground">{label}</dt>
      <dd className="ml-auto text-right text-[15px] font-semibold">{nilai}</dd>
    </div>
  )
}
