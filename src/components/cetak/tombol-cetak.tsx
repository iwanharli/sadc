"use client"

import { FileBadge, IdCard } from "lucide-react"
import { Button } from "@/components/ui/button"

export function bukaPdf(kartuId: number, jenis: "kta" | "sertifikat") {
  window.open(`/api/kartu/${kartuId}/${jenis}`, "_blank", "noopener")
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
