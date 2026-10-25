"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Building2, Loader2, Pencil, Plus, Search } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { perusahaanSchema, type PerusahaanInput } from "@/lib/master-schema"
import { swal } from "@/lib/swal"
import { FilterPolda } from "@/components/pendataan/filter-polda"
import { Paginasi } from "@/components/pendataan/paginasi"
import { cn } from "@/lib/utils"
import { simpanPerusahaan } from "@/server/actions/master"
import { Cek, Field } from "./field"

export type Perusahaan = {
  id: number
  nama: string
  jenis: "BUJP" | "PEMBIAYAAN"
  nib: string | null
  noIzin: string | null
  alamat: string | null
  poldaId: number | null
  polda: string | null
  aktif: boolean
  pemohon: number
}
type Polda = { id: number; nama: string }

type Params = { q?: string; polda?: string; per?: string }

/** Daftar perusahaan satu jenis (BUJP / PJPU): pencarian, filter Polda & paginasi diproses di server. */
export function MasterPerusahaan({
  jenis,
  basePath: BASE,
  rows,
  polda,
  total,
  page,
  pages,
  perPage,
  params,
}: {
  jenis: "BUJP" | "PEMBIAYAAN"
  basePath: string
  rows: Perusahaan[]
  polda: Polda[]
  total: number
  page: number
  pages: number
  perPage: number
  params: Params
}) {
  const router = useRouter()
  const [form, setForm] = useState<Perusahaan | "baru" | null>(null)
  const tampil = rows

  return (
    <Card className="gap-0 overflow-hidden p-0">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-6 py-5">
        <div>
          <h3 className="text-lg font-semibold">Data {jenis === "BUJP" ? "BUJP" : "PJPU"}</h3>
          <p className="text-[15px] text-muted-foreground">{total.toLocaleString("id-ID")} perusahaan ditemukan</p>
        </div>
        <Button className="h-11 px-5 text-[15px]" onClick={() => setForm("baru")}>
          <Plus className="size-5" /> Tambah {jenis === "BUJP" ? "BUJP" : "PJPU"}
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-b px-6 py-4">
        <form action={BASE} className="relative min-w-64 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input name="q" defaultValue={params.q} placeholder="Cari nama atau NIB..." className="h-11 pl-10 text-[15px]" />
          {params.polda && <input type="hidden" name="polda" value={params.polda} />}
          {params.per && <input type="hidden" name="per" value={params.per} />}
        </form>
        <FilterPolda polda={polda} basePath={BASE} />
      </div>

      <Table className="text-[15px]">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="h-12 pl-6 text-sm font-semibold uppercase tracking-wide">Perusahaan</TableHead>
            <TableHead className="h-12 text-sm font-semibold uppercase tracking-wide">Polda</TableHead>
            <TableHead className="h-12 text-right text-sm font-semibold uppercase tracking-wide">Pemohon</TableHead>
            <TableHead className="h-12 pr-6 text-right text-sm font-semibold uppercase tracking-wide">Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tampil.map((r) => (
            <TableRow key={r.id} className={cn(!r.aktif && "opacity-55")}>
              <TableCell className="py-4 pl-6">
                <p className="font-semibold">{r.nama}</p>
                <p className="text-sm text-muted-foreground">
                  NIB <span className="font-mono">{r.nib ?? "—"}</span>
                  {!r.aktif && " · nonaktif"}
                </p>
              </TableCell>
              <TableCell>{r.polda?.replace(/^Polda /, "") ?? "—"}</TableCell>
              <TableCell className="text-right tabular-nums">{r.pemohon.toLocaleString("id-ID")}</TableCell>
              <TableCell className="pr-6 text-right">
                <Button variant="ghost" size="icon" onClick={() => setForm(r)} aria-label="Ubah">
                  <Pencil className="size-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {tampil.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
          <Building2 className="size-8" />
          <p className="text-[15px]">Tidak ada perusahaan yang cocok.</p>
        </div>
      )}
      {total > 0 && <Paginasi page={page} pages={pages} total={total} perPage={perPage} basePath={BASE} query={params} />}

      {form && (
        <FormPerusahaan
          key={form === "baru" ? "baru" : form.id}
          awal={form === "baru" ? null : form}
          jenisAwal={jenis}
          polda={polda}
          onClose={() => setForm(null)}
          onSaved={() => {
            setForm(null)
            router.refresh()
          }}
        />
      )}
    </Card>
  )
}

function FormPerusahaan({
  awal,
  jenisAwal,
  polda,
  onClose,
  onSaved,
}: {
  awal: Perusahaan | null
  jenisAwal: "BUJP" | "PEMBIAYAAN"
  polda: Polda[]
  onClose: () => void
  onSaved: () => void
}) {
  const f = useForm<PerusahaanInput>({
    resolver: zodResolver(perusahaanSchema),
    defaultValues: awal
      ? { nama: awal.nama, jenis: awal.jenis, nib: awal.nib ?? "", noIzin: awal.noIzin ?? "", alamat: awal.alamat ?? "", poldaId: awal.poldaId ?? undefined, aktif: awal.aktif }
      : { nama: "", jenis: jenisAwal, nib: "", noIzin: "", alamat: "", poldaId: undefined, aktif: true },
  })
  const err = f.formState.errors

  const simpan = f.handleSubmit(async (v) => {
    const r = await simpanPerusahaan(v, awal?.id)
    if (!r.ok) return void toast.error(r.error)
    onSaved()
    await new Promise((res) => setTimeout(res, 200))
    swal.fire({ icon: "success", title: "Perusahaan disimpan", timer: 1500, showConfirmButton: false })
  })

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-xl">{awal ? "Ubah perusahaan" : "Tambah perusahaan"}</DialogTitle>
          <DialogDescription className="text-[15px]">BUJP untuk Satpam, PJPU untuk Petugas Penagih.</DialogDescription>
        </DialogHeader>
        <form onSubmit={simpan} className="space-y-4">
          <Field label="Nama perusahaan" galat={err.nama?.message}>
            <Input {...f.register("nama")} className="h-11 text-[15px]" placeholder="PT ..." />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Jenis">
              <Controller
                control={f.control}
                name="jenis"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="h-11 w-full text-[15px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BUJP" className="text-[15px]">BUJP (jasa pengamanan)</SelectItem>
                      <SelectItem value="PEMBIAYAAN" className="text-[15px]">PJPU</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
            <Field label="Polda" galat={err.poldaId?.message}>
              <Controller
                control={f.control}
                name="poldaId"
                render={({ field }) => (
                  <Select value={field.value ? String(field.value) : ""} onValueChange={field.onChange}>
                    <SelectTrigger className="h-11 w-full text-[15px]" aria-invalid={!!err.poldaId}>
                      <SelectValue placeholder="Pilih Polda" />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      {polda.map((p) => (
                        <SelectItem key={p.id} value={String(p.id)} className="text-[15px]">
                          {p.nama}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
            <Field label="NIB" galat={err.nib?.message}>
              <Input {...f.register("nib")} className="h-11 font-mono text-[15px]" />
            </Field>
            <Field label="Nomor izin operasional" galat={err.noIzin?.message}>
              <Input {...f.register("noIzin")} className="h-11 text-[15px]" />
            </Field>
          </div>
          <Field label="Alamat">
            <Textarea {...f.register("alamat")} rows={2} className="text-[15px]" />
          </Field>
          <Controller
            control={f.control}
            name="aktif"
            render={({ field }) => <Cek checked={field.value} onChange={field.onChange} label="Aktif" ket="Perusahaan nonaktif tidak bisa dipilih & gagal verifikasi otomatis" />}
          />
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
