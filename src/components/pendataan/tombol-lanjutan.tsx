"use client"

import { CopyPlus, Loader2, RefreshCcw } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { confirmDialog, swal } from "@/lib/swal"
import { buatPengajuanLanjutan } from "@/server/actions/pendataan"

/** Tombol "Perpanjang KTA" & "Ajukan penggantian" di halaman detail pemohon. */
export function TombolLanjutan({ pengajuanId, statusKartu, noKta }: { pengajuanId: number; statusKartu: string; noKta: string }) {
  const router = useRouter()
  const [proses, setProses] = useState<string | null>(null)
  if (statusKartu !== "AKTIF" && statusKartu !== "KEDALUWARSA") return null

  async function jalankan(jenis: "PERPANJANGAN" | "PENGGANTIAN") {
    const perpanjang = jenis === "PERPANJANGAN"
    const ok = await confirmDialog({
      title: perpanjang ? "Perpanjang KTA?" : "Ajukan penggantian KTA?",
      html: `Pengajuan baru dibuat dari <b style="font-family:monospace">${noKta}</b>. Biodata, perusahaan, dokumen tetap, sidik jari & tanda tangan disalin; <b>foto wajah dan dokumen bermasa berlaku (SKCK, surat sehat, dll.) perlu diperbarui</b>.`,
      confirmText: perpanjang ? "Buat perpanjangan" : "Buat penggantian",
    })
    if (!ok) return
    setProses(jenis)
    const r = await buatPengajuanLanjutan(pengajuanId, jenis)
    if (!r.ok) {
      setProses(null)
      await swal.fire({ icon: "error", title: "Tidak bisa dibuat", text: r.error, confirmButtonText: "Tutup" })
      return
    }
    router.push(`/operator/pemohon/${r.data.id}/lengkapi`)
  }

  return (
    <>
      <Button size="lg" className="h-11 px-5 text-[15px]" disabled={!!proses} onClick={() => jalankan("PERPANJANGAN")}>
        {proses === "PERPANJANGAN" ? <Loader2 className="size-4 animate-spin" /> : <RefreshCcw className="size-4" />} Perpanjang KTA
      </Button>
      {statusKartu === "AKTIF" && (
        <Button variant="outline" size="lg" className="h-11 text-[15px]" disabled={!!proses} onClick={() => jalankan("PENGGANTIAN")}>
          {proses === "PENGGANTIAN" ? <Loader2 className="size-4 animate-spin" /> : <CopyPlus className="size-4" />} Penggantian
        </Button>
      )}
    </>
  )
}
