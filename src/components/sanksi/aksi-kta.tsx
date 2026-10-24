"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Ban, Loader2, RotateCcw, ShieldAlert } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { FileField } from "@/components/pendataan/file-field"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { ALASAN_SANKSI, sanksiSchema, type SanksiInput } from "@/lib/sanksi"
import { toast } from "sonner"
import { swal } from "@/lib/swal"
import { ubahStatusKta } from "@/server/actions/sanksi"

type Jenis = "BEKU" | "CABUT" | "PULIH"
const INFO: Record<Jenis, { judul: string; ket: string; tombol: string }> = {
  BEKU: { judul: "Bekukan KTA", ket: "KTA nonaktif sementara. Scan QR akan menampilkan DIBEKUKAN.", tombol: "Bekukan" },
  CABUT: { judul: "Cabut KTA", ket: "KTA nonaktif permanen dan tidak bisa dipulihkan.", tombol: "Cabut KTA" },
  PULIH: { judul: "Pulihkan KTA", ket: "KTA kembali aktif dan berlaku seperti semula.", tombol: "Pulihkan" },
}

/** Tombol & dialog bekukan / cabut / pulihkan untuk satu KTA. */
export function AksiKta({ kartuId, status, noKta }: { kartuId: number; status: string; noKta: string }) {
  const [jenis, setJenis] = useState<Jenis | null>(null)

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {status === "AKTIF" && (
          <Button variant="outline" className="h-10 border-warning/50 text-warning hover:bg-warning/10" onClick={() => setJenis("BEKU")}>
            <ShieldAlert className="size-4" /> Bekukan
          </Button>
        )}
        {(status === "AKTIF" || status === "DIBEKUKAN") && (
          <Button variant="outline" className="h-10 border-destructive/40 text-destructive hover:bg-destructive/10" onClick={() => setJenis("CABUT")}>
            <Ban className="size-4" /> Cabut
          </Button>
        )}
        {status === "DIBEKUKAN" && (
          <Button variant="outline" className="h-10" onClick={() => setJenis("PULIH")}>
            <RotateCcw className="size-4" /> Pulihkan
          </Button>
        )}
      </div>
      {jenis && <FormSanksi key={jenis} jenis={jenis} kartuId={kartuId} noKta={noKta} onClose={() => setJenis(null)} />}
    </>
  )
}

function FormSanksi({ jenis, kartuId, noKta, onClose }: { jenis: Jenis; kartuId: number; noKta: string; onClose: () => void }) {
  const router = useRouter()
  const info = INFO[jenis]
  const form = useForm<SanksiInput>({
    resolver: zodResolver(sanksiSchema),
    defaultValues: { kartuId, jenis, alasan: jenis === "PULIH" ? "Lainnya" : "", keterangan: "", berlakuSd: "" },
  })
  const { register, control, handleSubmit, formState, watch } = form
  const alasan = watch("alasan")

  // dialog ini sendiri adalah konfirmasi; SweetAlert baru tampil setelah dialog tertutup
  // (dialog modal Radix menahan klik ke elemen di luar dialog)
  const kirim = handleSubmit(async (v) => {
    const res = await ubahStatusKta(v)
    if (!res.ok) {
      toast.error(res.error)
      return
    }
    onClose()
    await new Promise((r) => setTimeout(r, 200))
    await swal.fire({
      icon: "success",
      title: "Status KTA diperbarui",
      text: res.data.blacklist ? "NIK pemegang telah dimasukkan ke blacklist." : undefined,
      timer: 2200,
      showConfirmButton: false,
    })
    router.refresh()
  })

  const err = formState.errors
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl">{info.judul}</DialogTitle>
          <DialogDescription className="text-[15px]">
            <span className="font-mono">{noKta}</span> · {info.ket}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={kirim} className="space-y-4">
          {jenis !== "PULIH" && (
            <div className="space-y-2">
              <Label className="text-[15px]">Alasan</Label>
              <Controller
                control={control}
                name="alasan"
                render={({ field: f }) => (
                  <Select value={f.value} onValueChange={f.onChange}>
                    <SelectTrigger className="h-11 w-full text-[15px]" aria-invalid={!!err.alasan}>
                      <SelectValue placeholder="Pilih alasan" />
                    </SelectTrigger>
                    <SelectContent>
                      {ALASAN_SANKSI.map((a) => (
                        <SelectItem key={a} value={a} className="text-[15px]">
                          {a}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {err.alasan && <p className="text-sm text-destructive">{err.alasan.message}</p>}
              {jenis === "CABUT" && alasan === "Dokumen palsu" && (
                <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  KTA dicabut permanen dan <b>NIK pemegang otomatis masuk blacklist</b>.
                </p>
              )}
            </div>
          )}
          <div className="space-y-2">
            <Label className="text-[15px]">{jenis === "PULIH" ? "Dasar pemulihan" : "Keterangan"}</Label>
            <Textarea {...register("keterangan")} rows={4} className="text-[15px]" placeholder="Jelaskan kronologi / dasar keputusan" />
            {err.keterangan && <p className="text-sm text-destructive">{err.keterangan.message}</p>}
          </div>
          {jenis === "BEKU" && (
            <div className="space-y-2">
              <Label className="text-[15px]">
                Tinjau ulang paling lambat <span className="font-normal text-muted-foreground">(opsional)</span>
              </Label>
              <Input type="date" {...register("berlakuSd")} className="h-11 text-[15px]" />
            </div>
          )}
          <div className="space-y-2">
            <Label className="text-[15px]">
              Bukti pendukung <span className="font-normal text-muted-foreground">(opsional · BAP, laporan, surat)</span>
            </Label>
            <Controller control={control} name="buktiKey" render={({ field: f }) => <FileField value={f.value} onChange={f.onChange} />} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" className="h-11" onClick={onClose}>
              Batal
            </Button>
            <Button
              type="submit"
              className={jenis === "PULIH" ? "h-11" : "h-11 bg-destructive text-white hover:bg-destructive/90"}
              disabled={formState.isSubmitting}
            >
              {formState.isSubmitting && <Loader2 className="size-4 animate-spin" />} {info.tombol}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
