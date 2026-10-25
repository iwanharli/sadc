import { Ban, CheckCircle2, FilePen, Printer, ShieldAlert, ShieldCheck, TimerOff } from "lucide-react"
import { cn } from "@/lib/utils"

type StatusPengajuan = "DRAF" | "TERVERIFIKASI" | "DICETAK"
type StatusKartu = "AKTIF" | "DIBEKUKAN" | "DICABUT" | "KEDALUWARSA"

const INFO = {
  DRAF: { label: "Draf", icon: FilePen, cls: "bg-warning/15 text-warning" },
  TERVERIFIKASI: { label: "Terverifikasi", icon: CheckCircle2, cls: "bg-info/15 text-info" },
  DICETAK: { label: "Dicetak", icon: Printer, cls: "bg-success/15 text-success" },
  AKTIF: { label: "KTA aktif", icon: ShieldCheck, cls: "bg-success/15 text-success" },
  DIBEKUKAN: { label: "Dibekukan", icon: ShieldAlert, cls: "bg-destructive/15 text-destructive" },
  DICABUT: { label: "Dicabut", icon: Ban, cls: "bg-destructive/15 text-destructive" },
  KEDALUWARSA: { label: "Kedaluwarsa", icon: TimerOff, cls: "bg-muted text-muted-foreground" },
} as const

/** Lencana status; status kartu (bila ada) lebih informatif daripada status pengajuan. */
export function StatusBadge({
  status,
  kartu,
  besar,
}: {
  status: StatusPengajuan
  kartu?: StatusKartu | null
  besar?: boolean
}) {
  const s = INFO[kartu ?? status]
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-medium whitespace-nowrap",
        besar ? "px-3.5 py-1.5 text-[15px]" : "px-2.5 py-1 text-sm",
        s.cls,
      )}
    >
      <s.icon className={besar ? "size-4" : "size-3.5"} />
      {s.label}
    </span>
  )
}

export const labelProfesi = (p: "SATPAM" | "DEBT_COLLECTOR") => (p === "SATPAM" ? "Satpam" : "Penagih Utang")
export const labelJenis = (j: "BARU" | "PERPANJANGAN" | "PENGGANTIAN") =>
  ({ BARU: "Baru", PERPANJANGAN: "Perpanjangan", PENGGANTIAN: "Penggantian" })[j]
