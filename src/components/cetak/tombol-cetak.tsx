"use client"

import { FileBadge, IdCard, Loader2, Printer } from "lucide-react"
import { useRouter } from "next/navigation"
import { useTransition } from "react"
import { Button } from "@/components/ui/button"
import { confirmDialog, swal } from "@/lib/swal"
import { terbitkanKta } from "@/server/actions/kartu"

export function bukaPdf(kartuId: number, jenis: "kta" | "sertifikat") {
  window.open(`/api/kartu/${kartuId}/${jenis}`, "_blank", "noopener")
}

/** Tombol terbitkan KTA untuk satu pengajuan terverifikasi. */
export function TombolTerbitkan({ pengajuanId, nama }: { pengajuanId: number; nama: string }) {
  const router = useRouter()
  const [pending, start] = useTransition()

  function jalankan() {
    start(async () => {
      const ok = await confirmDialog({
        title: "Terbitkan KTA?",
        html: `KTA & sertifikat untuk <b>${nama}</b> akan diterbitkan dan langsung berstatus aktif.`,
        confirmText: "Terbitkan",
      })
      if (!ok) return
      const res = await terbitkanKta(pengajuanId)
      if (!res.ok) {
        await swal.fire({ icon: "error", title: "Gagal", text: res.error, confirmButtonText: "Tutup" })
        return
      }
      const pilih = await swal.fire({
        icon: "success",
        title: "KTA diterbitkan",
        html: `Nomor KTA <b style="font-family:monospace">${res.data.noKta}</b>`,
        showDenyButton: true,
        showCancelButton: true,
        confirmButtonText: "Cetak KTA",
        denyButtonText: "Cetak sertifikat",
        cancelButtonText: "Nanti",
        customClass: { popup: "sadc-swal", confirmButton: "swal-btn-primary", denyButton: "swal-btn-outline", cancelButton: "swal-btn-ghost" },
      })
      if (pilih.isConfirmed) bukaPdf(res.data.kartuId, "kta")
      if (pilih.isDenied) bukaPdf(res.data.kartuId, "sertifikat")
      router.refresh()
    })
  }

  return (
    <Button onClick={jalankan} disabled={pending} className="h-10">
      {pending ? <Loader2 className="size-4 animate-spin" /> : <Printer className="size-4" />} Terbitkan KTA
    </Button>
  )
}

export function TombolPdf({ kartuId }: { kartuId: number }) {
  return (
    <div className="flex gap-2">
      <Button variant="outline" className="h-10" onClick={() => bukaPdf(kartuId, "kta")}>
        <IdCard className="size-4" /> KTA
      </Button>
      <Button variant="outline" className="h-10" onClick={() => bukaPdf(kartuId, "sertifikat")}>
        <FileBadge className="size-4" /> Sertifikat
      </Button>
    </div>
  )
}
