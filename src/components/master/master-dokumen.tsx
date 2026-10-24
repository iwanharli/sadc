"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, Pencil, Plus } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"
import { ChartCard } from "@/components/dashboard/chart-card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { jenisDokumenSchema, type JenisDokumenInput } from "@/lib/master-schema"
import { swal } from "@/lib/swal"
import { cn } from "@/lib/utils"
import { simpanJenisDokumen } from "@/server/actions/master"
import { Cek, Field } from "./field"

type Jenis = "BARU" | "PERPANJANGAN" | "PENGGANTIAN"
export type Dok = {
  id: number
  kode: string
  nama: string
  profesi: "UMUM" | "SATPAM" | "DEBT_COLLECTOR"
  wajib: boolean
  wajibUntuk: Jenis[] | null
  adaMasaBerlaku: boolean
  urutan: number
  aktif: boolean
}

const GRUP = [
  { v: "UMUM", t: "Umum (semua profesi)" },
  { v: "SATPAM", t: "Khusus Satpam" },
  { v: "DEBT_COLLECTOR", t: "Khusus Debt Collector" },
] as const
const JENIS: { v: Jenis; t: string }[] = [
  { v: "BARU", t: "Baru" },
  { v: "PERPANJANGAN", t: "Perpanjangan" },
  { v: "PENGGANTIAN", t: "Penggantian" },
]

export function MasterDokumen({ rows }: { rows: Dok[] }) {
  const router = useRouter()
  const [form, setForm] = useState<Dok | "baru" | null>(null)

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button className="h-11 px-5 text-[15px]" onClick={() => setForm("baru")}>
          <Plus className="size-5" /> Tambah dokumen
        </Button>
      </div>
      {GRUP.map((g) => {
        const isi = rows.filter((r) => r.profesi === g.v)
        return (
          <ChartCard key={g.v} title={g.t} description={`${isi.filter((r) => r.aktif).length} dokumen aktif`} bodyClassName="p-0">
            <ul className="divide-y">
              {isi.map((d) => (
                <li key={d.id} className={cn("flex flex-wrap items-center gap-4 px-6 py-4", !d.aktif && "opacity-55")}>
                  <span className="w-8 text-center font-mono text-sm text-muted-foreground">{d.urutan}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[16px] font-semibold">
                      {d.nama} <span className="ml-2 font-mono text-sm font-normal text-muted-foreground">{d.kode}</span>
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-2">
                      <Tag cls={d.wajib ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"}>
                        {d.wajib ? (d.wajibUntuk?.length ? `Wajib untuk ${d.wajibUntuk.map((w) => w.toLowerCase()).join(", ")}` : "Wajib") : "Opsional"}
                      </Tag>
                      {d.adaMasaBerlaku && <Tag cls="bg-info/10 text-info">Ada masa berlaku</Tag>}
                      {!d.aktif && <Tag cls="bg-muted text-muted-foreground">Nonaktif</Tag>}
                    </div>
                  </div>
                  <Button variant="outline" className="h-10" onClick={() => setForm(d)}>
                    <Pencil className="size-4" /> Ubah
                  </Button>
                </li>
              ))}
              {isi.length === 0 && <li className="px-6 py-5 text-[15px] text-muted-foreground">Belum ada dokumen.</li>}
            </ul>
          </ChartCard>
        )
      })}
      {form && (
        <FormDokumen
          key={form === "baru" ? "baru" : form.id}
          awal={form === "baru" ? null : form}
          urutanBaru={Math.max(0, ...rows.map((r) => r.urutan)) + 1}
          onClose={() => setForm(null)}
          onSaved={() => {
            setForm(null)
            router.refresh()
          }}
        />
      )}
    </div>
  )
}

function Tag({ cls, children }: { cls: string; children: React.ReactNode }) {
  return <span className={cn("rounded-full px-2.5 py-0.5 text-sm font-medium", cls)}>{children}</span>
}

function FormDokumen({ awal, urutanBaru, onClose, onSaved }: { awal: Dok | null; urutanBaru: number; onClose: () => void; onSaved: () => void }) {
  const f = useForm<JenisDokumenInput>({
    resolver: zodResolver(jenisDokumenSchema),
    defaultValues: awal
      ? { ...awal, wajibUntuk: awal.wajibUntuk ?? [] }
      : { kode: "", nama: "", profesi: "UMUM", wajib: true, wajibUntuk: [], adaMasaBerlaku: false, urutan: urutanBaru, aktif: true },
  })
  const err = f.formState.errors

  const simpan = f.handleSubmit(async (v) => {
    const r = await simpanJenisDokumen(v, awal?.id)
    if (!r.ok) return void toast.error(r.error)
    onSaved()
    await new Promise((res) => setTimeout(res, 200))
    swal.fire({ icon: "success", title: "Persyaratan disimpan", text: "Berlaku untuk pendataan berikutnya.", timer: 1800, showConfirmButton: false })
  })

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-xl">{awal ? "Ubah persyaratan dokumen" : "Tambah persyaratan dokumen"}</DialogTitle>
          <DialogDescription className="text-[15px]">Perubahan dipakai oleh formulir pendataan dan verifikasi otomatis.</DialogDescription>
        </DialogHeader>
        <form onSubmit={simpan} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
            <Field label="Nama dokumen" galat={err.nama?.message}>
              <Input {...f.register("nama")} className="h-11 text-[15px]" />
            </Field>
            <Field label="Urutan" galat={err.urutan?.message}>
              <Input {...f.register("urutan")} inputMode="numeric" className="h-11 text-[15px]" />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Kode" galat={err.kode?.message}>
              <Input {...f.register("kode")} className="h-11 font-mono text-[15px] uppercase" placeholder="SKCK" />
            </Field>
            <Field label="Berlaku untuk">
              <Controller
                control={f.control}
                name="profesi"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="h-11 w-full text-[15px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {GRUP.map((g) => (
                        <SelectItem key={g.v} value={g.v} className="text-[15px]">
                          {g.t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Controller control={f.control} name="wajib" render={({ field }) => <Cek checked={field.value} onChange={field.onChange} label="Wajib" ket="Harus diunggah agar lolos verifikasi" />} />
            <Controller control={f.control} name="adaMasaBerlaku" render={({ field }) => <Cek checked={field.value} onChange={field.onChange} label="Ada masa berlaku" ket="Dicek tidak boleh kedaluwarsa" />} />
          </div>
          <Field label="Wajib hanya untuk jenis pengajuan (kosongkan = semua jenis)">
            <Controller
              control={f.control}
              name="wajibUntuk"
              render={({ field }) => (
                <div className="flex flex-wrap gap-2">
                  {JENIS.map((j) => {
                    const on = field.value.includes(j.v)
                    return (
                      <button
                        key={j.v}
                        type="button"
                        onClick={() => field.onChange(on ? field.value.filter((x) => x !== j.v) : [...field.value, j.v])}
                        className={cn("rounded-lg border-2 px-4 py-2 text-[15px] font-medium", on ? "border-primary bg-accent/60" : "border-border")}
                      >
                        {j.t}
                      </button>
                    )
                  })}
                </div>
              )}
            />
          </Field>
          <Controller control={f.control} name="aktif" render={({ field }) => <Cek checked={field.value} onChange={field.onChange} label="Aktif" ket="Nonaktifkan bila persyaratan tidak dipakai lagi" />} />
          <DialogFooter>
            <Button type="button" variant="outline" className="h-11" onClick={onClose}>
              Batal
            </Button>
            <Button type="submit" className="h-11" disabled={f.formState.isSubmitting}>
              {f.formState.isSubmitting && <Loader2 className="size-4 animate-spin" />} Simpan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
