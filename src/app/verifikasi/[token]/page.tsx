import type { Metadata } from "next"
import { Ban, CircleCheck, CircleHelp, ShieldAlert, ShieldCheck, TimerOff } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { formatTanggal, formatWaktu, hariIniDi } from "@/lib/waktu"
import { ipKlien, izinkan } from "@/server/rate-limit"
import { kartuPublik, samarkanNama } from "@/server/verifikasi-publik"
import { getZona } from "@/server/zona"

export const metadata: Metadata = { title: "Verifikasi KTA — SADC", robots: { index: false, follow: false } }

const STATUS = {
  AKTIF: { judul: "KTA SAH & BERLAKU", ket: "Kartu terdaftar resmi dan masih berlaku.", icon: CircleCheck, cls: "bg-success text-white" },
  DIBEKUKAN: { judul: "KTA DIBEKUKAN", ket: "Kartu sedang dinonaktifkan sementara. Pemegang tidak boleh bertugas.", icon: ShieldAlert, cls: "bg-warning text-warning-foreground" },
  DICABUT: { judul: "KTA DICABUT", ket: "Kartu telah dicabut dan tidak berlaku lagi.", icon: Ban, cls: "bg-destructive text-white" },
  KEDALUWARSA: { judul: "KTA TIDAK BERLAKU", ket: "Masa berlaku kartu telah habis atau sudah diganti kartu baru.", icon: TimerOff, cls: "bg-muted-foreground text-white" },
} as const

export default async function VerifikasiPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  // batasi 30 pengecekan per menit per IP agar token tidak bisa ditebak beruntun
  if (!izinkan(`verifikasi:${await ipKlien()}`, 30, 60)) {
    return (
      <main className="flex min-h-svh items-center justify-center bg-muted/40 p-6 text-center">
        <div className="max-w-md space-y-2">
          <p className="text-2xl font-bold">Terlalu banyak permintaan</p>
          <p className="text-[16px] text-muted-foreground">Tunggu satu menit lalu pindai ulang kode QR.</p>
        </div>
      </main>
    )
  }
  const [k, tz] = await Promise.all([kartuPublik(token), getZona()])
  // kartu AKTIF yang lewat masa berlaku diperlakukan sebagai kedaluwarsa
  const status = k ? (k.status === "AKTIF" && k.berlakuSd < hariIniDi(tz) ? "KEDALUWARSA" : k.status) : null
  const s = status ? STATUS[status] : null

  return (
    <main className="min-h-svh bg-muted/40 px-4 py-8">
      <div className="mx-auto flex max-w-lg items-center justify-between pb-6">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-info text-primary-foreground">
            <ShieldCheck className="size-6" />
          </div>
          <div className="leading-tight">
            <p className="font-bold">Verifikasi KTA</p>
            <p className="text-sm text-muted-foreground">SADC · Baharkam Polri</p>
          </div>
        </div>
        <ThemeToggle />
      </div>

      <Card className="mx-auto max-w-lg gap-0 overflow-hidden p-0 shadow-xl">
        {!k || !s ? (
          <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <CircleHelp className="size-8" />
            </div>
            <p className="text-2xl font-bold">KTA tidak ditemukan</p>
            <p className="text-[16px] text-muted-foreground">
              Kode QR tidak terdaftar di sistem. Kartu kemungkinan <b>palsu</b>. Laporkan ke kantor Polri terdekat atau
              hubungi 110.
            </p>
          </div>
        ) : (
          <>
            <div className={cn("flex items-center gap-4 px-6 py-5", s.cls)}>
              <s.icon className="size-10 shrink-0" />
              <div>
                <p className="text-xl font-bold tracking-wide">{s.judul}</p>
                <p className="text-[15px] opacity-90">{s.ket}</p>
              </div>
            </div>
            <div className="flex gap-5 px-6 py-6">
              {k.fotoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`/verifikasi/${token}/foto`}
                  alt="Foto pemegang kartu"
                  className={cn("aspect-[3/4] w-28 shrink-0 rounded-xl border object-cover", status !== "AKTIF" && "grayscale")}
                />
              ) : (
                <div className="aspect-[3/4] w-28 shrink-0 rounded-xl bg-muted" />
              )}
              <dl className="min-w-0 space-y-3">
                <Baris label="Nama" nilai={samarkanNama(k.nama)} />
                <Baris label="Profesi" nilai={k.profesi === "SATPAM" ? "Satuan Pengamanan (Satpam)" : "Penagih Utang"} />
                <Baris label="Nomor KTA" nilai={k.noKta} mono />
              </dl>
            </div>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 border-t px-6 py-5">
              <Baris label={k.profesi === "SATPAM" ? "BUJP / perusahaan" : "Perusahaan pembiayaan"} nilai={k.perusahaan ?? "—"} className="col-span-2" />
              <Baris label="Wilayah" nilai={k.polda} />
              <Baris label="Berlaku sampai" nilai={formatTanggal(k.berlakuSd, tz)} />
            </dl>
            <p className="border-t bg-muted/40 px-6 py-3 text-sm text-muted-foreground">
              Dicek {formatWaktu(new Date(), tz)}. Cocokkan foto dengan pemegang kartu.
            </p>
          </>
        )}
      </Card>
      <p className="mx-auto mt-6 max-w-lg text-center text-sm text-muted-foreground">
        Halaman ini hanya menampilkan data seminimal mungkin sesuai prinsip pelindungan data pribadi.
      </p>
    </main>
  )
}

function Baris({ label, nilai, mono, className }: { label: string; nilai: string; mono?: boolean; className?: string }) {
  return (
    <div className={className}>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className={cn("text-[17px] font-semibold", mono && "font-mono")}>{nilai}</dd>
    </div>
  )
}
