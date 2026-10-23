"use client"

import { ArrowRight, FlaskConical, Loader2, Lock, Search, ShieldCheck, UserCog } from "lucide-react"
import { useRouter } from "next/navigation"
import { useMemo, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { authClient } from "@/lib/auth-client"
import { errorDialog } from "@/lib/swal"
import { cn } from "@/lib/utils"

export type DemoAccount = {
  username: string
  name: string
  role: "ADMIN" | "OPERATOR"
  wilayah: string | null
}

const PUSAT = "Pusat (Mabes)"

const roleInfo = {
  ADMIN: {
    label: "Admin",
    desc: "Pantau rekapitulasi nasional, kelola pengguna, master data, sanksi & blacklist.",
    icon: ShieldCheck,
    chip: "bg-primary/12 text-primary",
  },
  OPERATOR: {
    label: "Operator",
    desc: "Data pemohon, unggah dokumen, cetak KTA, bekukan/cabut di wilayahnya.",
    icon: UserCog,
    chip: "bg-warning/15 text-warning",
  },
} as const

export function DemoLoginDialog({ accounts, password }: { accounts: DemoAccount[]; password: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)

  const groups = useMemo(() => {
    const map = new Map<string, DemoAccount[]>()
    for (const a of accounts) {
      const key = a.role === "ADMIN" ? PUSAT : (a.wilayah ?? "Lainnya")
      map.set(key, [...(map.get(key) ?? []), a])
    }
    return [...map.entries()].sort(([a], [b]) => (a === PUSAT ? -1 : b === PUSAT ? 1 : a.localeCompare(b)))
  }, [accounts])

  const [active, setActive] = useState(groups[0]?.[0] ?? PUSAT)
  const [q, setQ] = useState("")
  const shown = groups.filter(([key]) => key.toLowerCase().includes(q.trim().toLowerCase()))
  // bila wilayah aktif tersaring keluar, tampilkan hasil pencarian pertama
  const current = shown.some(([k]) => k === active) ? active : shown[0]?.[0]
  const list = groups.find(([k]) => k === current)?.[1] ?? []

  async function login(username: string) {
    setLoading(username)
    const { error } = await authClient.signIn.username({ username, password })
    if (error) {
      setLoading(null)
      await errorDialog("Gagal masuk", error.status === 429 ? "Terlalu banyak percobaan, tunggu sebentar." : "Akun demo tidak dapat digunakan.")
      return
    }
    router.replace("/")
    router.refresh()
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className="mx-auto flex items-center gap-2 rounded-full border border-dashed border-warning/60 bg-warning/10 px-4 py-1.5 text-sm font-medium text-warning transition-colors hover:bg-warning/20"
        >
          <FlaskConical className="size-4" /> Akun demo · masuk 1 klik
        </button>
      </DialogTrigger>

      <DialogContent className="flex max-h-[calc(100svh-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl">
        <DialogHeader className="shrink-0 border-b px-6 py-5 text-left">
          <DialogTitle className="text-xl">Masuk dengan akun demo</DialogTitle>
          <DialogDescription>Pilih wilayah, lalu klik salah satu akun.</DialogDescription>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col sm:h-[min(520px,calc(100svh-15rem))] sm:flex-none sm:flex-row">
          {/* Kolom wilayah: judul & pencarian tetap, daftar bisa digulir */}
          <aside className="flex min-h-0 shrink-0 flex-col border-b sm:w-64 sm:border-r sm:border-b-0">
            <div className="shrink-0 space-y-2 p-3 pb-2">
              <p className="hidden px-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground sm:block">
                Wilayah · {groups.length}
              </p>
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari Polda..." className="h-9 pl-8 text-sm" />
              </div>
            </div>
            <nav className="flex min-h-0 gap-1 overflow-x-auto px-3 pb-3 sm:flex-1 sm:flex-col sm:overflow-x-hidden sm:overflow-y-auto">
              {shown.length === 0 && <p className="px-2 py-4 text-sm text-muted-foreground">Polda tidak ditemukan.</p>}
              {shown.map(([key, items]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActive(key)}
                  className={cn(
                    "flex shrink-0 items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm whitespace-nowrap transition-colors sm:whitespace-normal",
                    current === key
                      ? "bg-primary font-medium text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground",
                  )}
                >
                  <span className="sm:truncate" title={key}>{key.replace(/^Polda /, "")}</span>
                  <span
                    className={cn(
                      "rounded-full px-1.5 text-[11px] tabular-nums",
                      current === key ? "bg-primary-foreground/20" : "bg-muted",
                    )}
                  >
                    {items.length}
                  </span>
                </button>
              ))}
            </nav>
          </aside>

          {/* Daftar akun */}
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            <p className="shrink-0 border-b bg-muted/30 px-5 py-2.5 text-xs font-medium text-muted-foreground">
              {current ?? "-"} · {list.length} akun
            </p>
            <ul className="min-h-0 flex-1 divide-y overflow-y-auto">
              {list.map((a) => {
                const info = roleInfo[a.role]
                const Icon = info.icon
                return (
                  <li key={a.username}>
                    <button
                      type="button"
                      disabled={!!loading}
                      onClick={() => login(a.username)}
                      className="group flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-accent/60 disabled:opacity-60"
                    >
                      <div className={cn("flex size-11 shrink-0 items-center justify-center rounded-xl", info.chip)}>
                        <Icon className="size-5" />
                      </div>
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <p className="flex flex-wrap items-baseline gap-x-2">
                          <span className="font-semibold">{info.label}</span>
                          <span className="text-xs text-muted-foreground">{a.wilayah ?? "Seluruh Indonesia"}</span>
                        </p>
                        <p className="text-sm">{a.name}</p>
                        <p className="text-xs leading-relaxed text-muted-foreground">{info.desc}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <code className="hidden rounded-md bg-muted px-2 py-1 font-mono text-xs text-muted-foreground md:block">
                          {a.username}
                        </code>
                        {loading === a.username ? (
                          <Loader2 className="size-4 animate-spin text-primary" />
                        ) : (
                          <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                        )}
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2 border-t bg-muted/40 px-6 py-3 text-sm text-muted-foreground">
          <Lock className="size-3.5" /> Sandi semua akun:
          <code className="rounded bg-background px-1.5 py-0.5 font-mono font-semibold text-foreground">{password}</code>
        </div>
      </DialogContent>
    </Dialog>
  )
}
