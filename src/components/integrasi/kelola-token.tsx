"use client"

import { Check, Copy, KeyRound, Loader2, Plus, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"
import { ChartCard } from "@/components/dashboard/chart-card"
import { EmptyState } from "@/components/empty-state"
import { Field } from "@/components/master/field"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { formatIp } from "@/lib/ip"
import { swal } from "@/lib/swal"
import { cn } from "@/lib/utils"
import { cabutToken, salinToken, terbitkanToken } from "@/server/actions/integrasi"

export type BarisToken = {
  id: number
  nama: string
  awalan: string
  ipIzin: string[]
  aktif: boolean
  dibuat: string
  terakhirDipakai: string | null
  ipTerakhir: string | null
  dicabut: string | null
  bisaDisalin: boolean
}

export function KelolaToken({ rows }: { rows: BarisToken[] }) {
  const router = useRouter()
  const [buka, setBuka] = useState(false)
  const aktif = rows.filter((r) => r.aktif).length
  const [tersalin, setTersalin] = useState<number>()

  async function salin(r: BarisToken) {
    const h = await salinToken(r.id)
    if (!h.ok) return void toast.error(h.error)
    try {
      await navigator.clipboard.writeText(h.data.token)
      setTersalin(r.id)
      setTimeout(() => setTersalin((v) => (v === r.id ? undefined : v)), 2000)
      toast.success(`Token ${r.nama} disalin`)
    } catch {
      toast.error("Browser menolak akses clipboard")
    }
  }

  async function cabut(r: BarisToken) {
    const res = await swal.fire({
      icon: "warning",
      title: "Cabut token?",
      html: `Token <b>${r.nama}</b> langsung tidak bisa dipakai lagi. Tindakan ini tidak bisa dibatalkan.`,
      showCancelButton: true,
      confirmButtonText: "Cabut token",
      cancelButtonText: "Batal",
    })
    if (!res.isConfirmed) return
    const h = await cabutToken(r.id)
    if (!h.ok) return swal.fire({ icon: "error", title: "Gagal", text: h.error })
    toast.success("Token dicabut")
    router.refresh()
  }

  return (
    <ChartCard
      title="Token akses"
      description={`${aktif} token aktif`}
      bodyClassName="p-0"
      action={
        <Button className="h-11 px-5 text-[15px]" onClick={() => setBuka(true)}>
          <Plus className="size-5" /> Buat token
        </Button>
      }
    >
      {rows.length === 0 ? (
        <div className="p-6">
          <EmptyState icon={KeyRound} title="Belum ada token" description="Buat token untuk klien integrasi, misalnya Baharkam Command Center." />
        </div>
      ) : (
        <ul className="divide-y">
          {rows.map((r) => (
            <li key={r.id} className={cn("flex flex-wrap items-center gap-4 px-6 py-5", !r.aktif && "opacity-60")}>
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
                <KeyRound className="size-5" />
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <p className="flex flex-wrap items-center gap-2 text-[17px] font-semibold">
                  {r.nama}
                  <span className="font-mono text-sm font-normal text-muted-foreground">sadc_{r.awalan}_…</span>
                  <span className={cn("rounded-full px-2.5 py-0.5 text-sm font-medium", r.aktif ? "bg-success/15 text-success" : "bg-muted text-muted-foreground")}>
                    {r.aktif ? "Aktif" : "Dicabut"}
                  </span>
                </p>
                <p className="text-[15px] text-muted-foreground">
                  IP diizinkan: {r.ipIzin.length ? <span className="font-mono">{r.ipIzin.join(", ")}</span> : "semua IP"}
                </p>
                <p className="text-sm text-muted-foreground">
                  Dibuat {r.dibuat} · {r.terakhirDipakai ? `terakhir dipakai ${r.terakhirDipakai} dari ${formatIp(r.ipTerakhir)}` : "belum pernah dipakai"}
                  {r.dicabut && ` · dicabut ${r.dicabut}`}
                </p>
              </div>
              {r.aktif && r.bisaDisalin && (
                <Button variant="outline" className="h-10" onClick={() => salin(r)}>
                  {tersalin === r.id ? <Check className="size-4 text-success" /> : <Copy className="size-4" />} Salin token
                </Button>
              )}
              {r.aktif && (
                <Button variant="outline" className="h-10 text-destructive hover:text-destructive" onClick={() => cabut(r)}>
                  <Trash2 className="size-4" /> Cabut
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
      {buka && (
        <DialogToken
          onClose={() => {
            setBuka(false)
            router.refresh()
          }}
        />
      )}
    </ChartCard>
  )
}

function DialogToken({ onClose }: { onClose: () => void }) {
  const [nama, setNama] = useState("Baharkam Command Center")
  const [ip, setIp] = useState("")
  const [galat, setGalat] = useState<string>()
  const [proses, setProses] = useState(false)
  const [token, setToken] = useState<string>()
  const [tersalin, setTersalin] = useState(false)

  async function simpan(e: React.FormEvent) {
    e.preventDefault()
    setProses(true)
    const r = await terbitkanToken(nama, ip)
    setProses(false)
    if (!r.ok) return setGalat(r.error)
    setToken(r.data.token)
  }

  async function salin() {
    await navigator.clipboard.writeText(token!)
    setTersalin(true)
    toast.success("Token disalin")
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-xl">{token ? "Token berhasil dibuat" : "Buat token integrasi"}</DialogTitle>
          <DialogDescription className="text-[15px]">
            {token ? "Salin dan kirimkan token ini lewat kanal yang aman." : "Token hanya bisa membaca data lewat /api/integration/*."}
          </DialogDescription>
        </DialogHeader>
        {token ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 rounded-xl border bg-muted/50 p-3">
              <code className="min-w-0 flex-1 break-all font-mono text-[15px]">{token}</code>
              <Button type="button" variant="outline" size="icon" onClick={salin} aria-label="Salin token">
                {tersalin ? <Check className="size-4 text-success" /> : <Copy className="size-4" />}
              </Button>
            </div>
            <Alert>
              <KeyRound />
              <AlertTitle>Simpan token dengan aman</AlertTitle>
              <AlertDescription>Token bisa disalin lagi dari daftar token oleh Admin; setiap penyalinan tercatat di Audit Log.</AlertDescription>
            </Alert>
            <DialogFooter>
              <Button className="h-11" onClick={onClose}>
                Selesai
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={simpan} className="space-y-4">
            <Field label="Nama klien" galat={galat}>
              <Input value={nama} onChange={(e) => setNama(e.target.value)} className="h-11 text-[15px]" />
            </Field>
            <Field label="IP yang diizinkan (kosongkan = semua IP)">
              <Textarea
                value={ip}
                onChange={(e) => setIp(e.target.value)}
                rows={3}
                placeholder="mis. 203.0.113.10, 203.0.113.11"
                className="font-mono text-[15px]"
              />
            </Field>
            <DialogFooter>
              <Button type="button" variant="outline" className="h-11" onClick={onClose}>
                Batal
              </Button>
              <Button type="submit" className="h-11" disabled={proses}>
                {proses && <Loader2 className="size-4 animate-spin" />} Buat token
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
