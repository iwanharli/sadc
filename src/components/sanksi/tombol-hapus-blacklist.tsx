"use client"

import { ShieldOff } from "lucide-react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { swal } from "@/lib/swal"
import { hapusBlacklist } from "@/server/actions/sanksi"

export function TombolHapusBlacklist({ id, nik }: { id: number; nik: string }) {
  const router = useRouter()
  async function jalankan() {
    const res = await swal.fire({
      icon: "warning",
      title: "Cabut blokir NIK?",
      html: `NIK <b style="font-family:monospace">${nik}</b> akan bisa mengajukan KTA kembali.`,
      input: "textarea",
      inputPlaceholder: "Alasan pencabutan blokir",
      showCancelButton: true,
      confirmButtonText: "Cabut blokir",
      cancelButtonText: "Batal",
      inputValidator: (v) => (!v || v.trim().length < 5 ? "Isi alasan minimal 5 karakter" : undefined),
    })
    if (!res.isConfirmed) return
    const r = await hapusBlacklist(id, res.value)
    if (!r.ok) return swal.fire({ icon: "error", title: "Gagal", text: r.error })
    await swal.fire({ icon: "success", title: "Blokir dicabut", timer: 1600, showConfirmButton: false })
    router.refresh()
  }
  return (
    <Button variant="outline" className="h-10" onClick={jalankan}>
      <ShieldOff className="size-4" /> Cabut blokir
    </Button>
  )
}
