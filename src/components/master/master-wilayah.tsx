"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Building, Clock, Loader2, MapPinned, Pencil, Plus, Search } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useMemo, useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"
import { ChartCard } from "@/components/dashboard/chart-card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { poldaSchema, polresSchema, ZONA_WAKTU, type PoldaInput, type PolresInput } from "@/lib/master-schema"
import { swal } from "@/lib/swal"
import { cn } from "@/lib/utils"
import { simpanPolda, simpanPolres } from "@/server/actions/master"
import { Cek, Field } from "./field"

export type Polda = {
  id: number
  kode: string
  nama: string
  provinsi: string
  provinsiKode: string[]
  zonaWaktu: string
  jumlahPolres: number
  jumlahOperator: number
}
export type Polres = { id: number; poldaId: number; nama: string; kabupatenKode: string[]; aktif: boolean }
type Opsi = { kode: string; nama: string }

const labelZona = (z: string) => ZONA_WAKTU.find((x) => x.v === z)?.t.split(" ")[0] ?? z

export function MasterWilayah({
  polda,
  polres,
  provinsi,
  kabupaten,
  aktifId,
}: {
  polda: Polda[]
  polres: Polres[]
  provinsi: Opsi[]
  kabupaten: Opsi[]
  aktifId: number | null
}) {
  const router = useRouter()
  const [q, setQ] = useState("")
  const [formPolda, setFormPolda] = useState<Polda | "baru" | null>(null)
  const [formPolres, setFormPolres] = useState<Polres | "baru" | null>(null)
  const namaProv = useMemo(() => new Map(provinsi.map((p) => [p.kode, p.nama])), [provinsi])
  const namaKab = useMemo(() => new Map(kabupaten.map((k) => [k.kode, k.nama])), [kabupaten])
  const aktif = polda.find((p) => p.id === aktifId) ?? null
  const tampil = polda.filter((p) => !q || p.nama.toLowerCase().includes(q.toLowerCase()) || p.kode.toLowerCase().includes(q.toLowerCase()))
  const selesai = (setter: (v: null) => void) => () => {
    setter(null)
    router.refresh()
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <ChartCard
        title="Polda"
        description={`${polda.length} Polda · klik untuk melihat Polres`}
        bodyClassName="p-0"
        action={
          <Button className="h-10" onClick={() => setFormPolda("baru")}>
            <Plus className="size-4" /> Tambah Polda
          </Button>
        }
      >
        <div className="border-b px-6 py-3">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari Polda..." className="h-11 pl-10 text-[15px]" />
          </div>
        </div>
        <ul className="max-h-[680px] divide-y overflow-y-auto">
          {tampil.map((p) => (
            <li key={p.id} className={cn("flex items-start gap-3 px-6 py-4", p.id === aktifId && "bg-accent/50")}>
              <Link href={`/admin/master/wilayah?polda=${p.id}`} scroll={false} className="min-w-0 flex-1">
                <p className="text-[16px] font-semibold">
                  {p.nama} <span className="ml-1 font-mono text-sm font-normal text-muted-foreground">{p.kode}</span>
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {p.provinsiKode.map((k) => (
                    <span key={k} className="rounded-full bg-primary/10 px-2.5 py-0.5 text-sm text-primary">
                      {namaProv.get(k) ?? k}
                    </span>
                  ))}
                </div>
                <p className="mt-1.5 flex flex-wrap gap-x-4 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><Clock className="size-3.5" /> {labelZona(p.zonaWaktu)}</span>
                  <span className="inline-flex items-center gap-1"><Building className="size-3.5" /> {p.jumlahPolres} Polres</span>
                  <span>{p.jumlahOperator} operator</span>
                </p>
              </Link>
              <Button variant="ghost" size="icon" onClick={() => setFormPolda(p)} aria-label={`Ubah ${p.nama}`}>
                <Pencil className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      </ChartCard>

      <ChartCard
        title={aktif ? `Polres — ${aktif.nama}` : "Polres"}
        description={aktif ? "Wilayah hukum Polres berdasarkan kab/kota" : "Pilih Polda di sebelah kiri"}
        bodyClassName="p-0"
        action={
          aktif && (
            <Button className="h-10" onClick={() => setFormPolres("baru")}>
              <Plus className="size-4" /> Tambah Polres
            </Button>
          )
        }
      >
        {!aktif ? (
          <div className="flex flex-col items-center gap-2 py-16 text-muted-foreground">
            <MapPinned className="size-8" />
            <p className="text-[15px]">Pilih Polda untuk mengelola Polres-nya.</p>
          </div>
        ) : (
          <ul className="divide-y">
            {polres.map((r) => (
              <li key={r.id} className={cn("flex items-start gap-3 px-6 py-4", !r.aktif && "opacity-55")}>
                <div className="min-w-0 flex-1">
                  <p className="text-[16px] font-semibold">
                    {r.nama} {!r.aktif && <span className="text-sm font-normal text-muted-foreground">(nonaktif)</span>}
                  </p>
                  <p className="mt-1 text-[15px] text-muted-foreground">
                    {r.kabupatenKode.length ? r.kabupatenKode.map((k) => namaKab.get(k) ?? k).join(", ") : "Belum ada kab/kota"}
                  </p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setFormPolres(r)} aria-label={`Ubah ${r.nama}`}>
                  <Pencil className="size-4" />
                </Button>
              </li>
            ))}
            {polres.length === 0 && <li className="px-6 py-8 text-[15px] text-muted-foreground">Belum ada Polres untuk Polda ini.</li>}
          </ul>
        )}
      </ChartCard>

      {formPolda && (
        <FormPolda awal={formPolda === "baru" ? null : formPolda} provinsi={provinsi} onClose={() => setFormPolda(null)} onSaved={selesai(setFormPolda)} />
      )}
      {formPolres && aktif && (
        <FormPolres
          awal={formPolres === "baru" ? null : formPolres}
          polda={aktif}
          kabupaten={kabupaten.filter((k) => aktif.provinsiKode.includes(k.kode.slice(0, 2)))}
          onClose={() => setFormPolres(null)}
          onSaved={selesai(setFormPolres)}
        />
      )}
    </div>
  )
}

async function sukses(judul: string) {
  await new Promise((r) => setTimeout(r, 200))
  swal.fire({ icon: "success", title: judul, timer: 1500, showConfirmButton: false })
}

function PilihBanyak({ opsi, nilai, onChange, cari }: { opsi: Opsi[]; nilai: string[]; onChange: (v: string[]) => void; cari?: boolean }) {
  const [q, setQ] = useState("")
  const tampil = opsi.filter((o) => !q || o.nama.toLowerCase().includes(q.toLowerCase()))
  return (
    <div className="rounded-xl border">
      {cari && (
        <div className="border-b p-2">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari..." className="h-9 text-[15px]" />
        </div>
      )}
      <div className="grid max-h-56 gap-1 overflow-y-auto p-2 sm:grid-cols-2">
        {tampil.map((o) => {
          const on = nilai.includes(o.kode)
          return (
            <label key={o.kode} className={cn("flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-[15px] hover:bg-accent/50", on && "bg-accent/60")}>
              <input
                type="checkbox"
                checked={on}
                onChange={() => onChange(on ? nilai.filter((v) => v !== o.kode) : [...nilai, o.kode])}
                className="size-4 accent-[var(--primary)]"
              />
              {o.nama}
            </label>
          )
        })}
      </div>
      <p className="border-t px-3 py-1.5 text-sm text-muted-foreground">{nilai.length} dipilih</p>
    </div>
  )
}

function FormPolda({ awal, provinsi, onClose, onSaved }: { awal: Polda | null; provinsi: Opsi[]; onClose: () => void; onSaved: () => void }) {
  const f = useForm<PoldaInput>({
    resolver: zodResolver(poldaSchema),
    defaultValues: awal
      ? { kode: awal.kode, nama: awal.nama, provinsi: awal.provinsi, provinsiKode: awal.provinsiKode, zonaWaktu: awal.zonaWaktu as PoldaInput["zonaWaktu"] }
      : { kode: "", nama: "Polda ", provinsi: "", provinsiKode: [], zonaWaktu: "Asia/Jakarta" },
  })
  const err = f.formState.errors
  const simpan = f.handleSubmit(async (v) => {
    const r = await simpanPolda(v, awal?.id)
    if (!r.ok) return void toast.error(r.error)
    onSaved()
    sukses("Polda disimpan")
  })
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-xl">{awal ? "Ubah Polda" : "Tambah Polda"}</DialogTitle>
          <DialogDescription className="text-[15px]">Provinsi cakupan dipakai untuk peta sebaran & validasi Polres.</DialogDescription>
        </DialogHeader>
        <form onSubmit={simpan} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-[1fr_150px]">
            <Field label="Nama" galat={err.nama?.message}>
              <Input {...f.register("nama")} className="h-11 text-[15px]" />
            </Field>
            <Field label="Kode" galat={err.kode?.message}>
              <Input {...f.register("kode")} className="h-11 font-mono text-[15px] uppercase" />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nama provinsi utama" galat={err.provinsi?.message}>
              <Input {...f.register("provinsi")} className="h-11 text-[15px]" />
            </Field>
            <Field label="Zona waktu">
              <Controller
                control={f.control}
                name="zonaWaktu"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="h-11 w-full text-[15px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ZONA_WAKTU.map((z) => (
                        <SelectItem key={z.v} value={z.v} className="text-[15px]">
                          {z.t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
          </div>
          <Field label="Provinsi cakupan" galat={err.provinsiKode?.message}>
            <Controller control={f.control} name="provinsiKode" render={({ field }) => <PilihBanyak opsi={provinsi} nilai={field.value} onChange={field.onChange} cari />} />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" className="h-11" onClick={onClose}>Batal</Button>
            <Button type="submit" className="h-11" disabled={f.formState.isSubmitting}>
              {f.formState.isSubmitting && <Loader2 className="size-4 animate-spin" />} Simpan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function FormPolres({ awal, polda, kabupaten, onClose, onSaved }: { awal: Polres | null; polda: Polda; kabupaten: Opsi[]; onClose: () => void; onSaved: () => void }) {
  const f = useForm<PolresInput>({
    resolver: zodResolver(polresSchema),
    defaultValues: awal
      ? { poldaId: polda.id, nama: awal.nama, kabupatenKode: awal.kabupatenKode, aktif: awal.aktif }
      : { poldaId: polda.id, nama: "Polres ", kabupatenKode: [], aktif: true },
  })
  const err = f.formState.errors
  const simpan = f.handleSubmit(async (v) => {
    const r = await simpanPolres(v, awal?.id)
    if (!r.ok) return void toast.error(r.error)
    onSaved()
    sukses("Polres disimpan")
  })
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-xl">{awal ? "Ubah Polres" : "Tambah Polres"}</DialogTitle>
          <DialogDescription className="text-[15px]">{polda.nama}</DialogDescription>
        </DialogHeader>
        <form onSubmit={simpan} className="space-y-4">
          <Field label="Nama Polres / Polresta / Polrestabes" galat={err.nama?.message}>
            <Input {...f.register("nama")} className="h-11 text-[15px]" />
          </Field>
          <Field label="Kab/kota wilayah hukum">
            <Controller control={f.control} name="kabupatenKode" render={({ field }) => <PilihBanyak opsi={kabupaten} nilai={field.value} onChange={field.onChange} cari />} />
          </Field>
          <Controller control={f.control} name="aktif" render={({ field }) => <Cek checked={field.value} onChange={field.onChange} label="Aktif" />} />
          <DialogFooter>
            <Button type="button" variant="outline" className="h-11" onClick={onClose}>Batal</Button>
            <Button type="submit" className="h-11" disabled={f.formState.isSubmitting}>
              {f.formState.isSubmitting && <Loader2 className="size-4 animate-spin" />} Simpan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
