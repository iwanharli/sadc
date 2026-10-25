import Link from "next/link"
import { CopyPlus, RefreshCcw } from "lucide-react"
import { Button } from "@/components/ui/button"

/**
 * Tombol "Perpanjang KTA" & "Penggantian": membuka formulir pendataan yang sudah terisi
 * dari pengajuan ini. KTA baru terbit saat formulir disimpan dengan data lengkap.
 */
export function TombolLanjutan({ pengajuanId, statusKartu }: { pengajuanId: number; statusKartu: string }) {
  if (statusKartu !== "AKTIF" && statusKartu !== "KEDALUWARSA") return null
  return (
    <>
      <Button asChild size="lg" className="h-11 px-5 text-[15px]">
        <Link href={`/operator/pemohon/baru?dari=${pengajuanId}&jenis=PERPANJANGAN`}>
          <RefreshCcw className="size-4" /> Perpanjang KTA
        </Link>
      </Button>
      {statusKartu === "AKTIF" && (
        <Button asChild variant="outline" size="lg" className="h-11 text-[15px]">
          <Link href={`/operator/pemohon/baru?dari=${pengajuanId}&jenis=PENGGANTIAN`}>
            <CopyPlus className="size-4" /> Penggantian
          </Link>
        </Button>
      )}
    </>
  )
}
