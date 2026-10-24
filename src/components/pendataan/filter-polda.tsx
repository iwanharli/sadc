"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

/** Dropdown filter Polda (Admin) yang menyimpan pilihan di query string ?polda= */
export function FilterPolda({ polda, basePath }: { polda: { id: number; nama: string }[]; basePath: string }) {
  const router = useRouter()
  const sp = useSearchParams()
  return (
    <Select
      value={sp.get("polda") ?? "semua"}
      onValueChange={(v) => {
        const p = new URLSearchParams(sp)
        p.delete("page")
        if (v === "semua") p.delete("polda")
        else p.set("polda", v)
        router.push(p.size ? `${basePath}?${p}` : basePath)
      }}
    >
      <SelectTrigger className="h-11 w-56 text-[15px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="max-h-80">
        <SelectItem value="semua" className="text-[15px]">
          Semua Polda
        </SelectItem>
        {polda.map((p) => (
          <SelectItem key={p.id} value={String(p.id)} className="text-[15px]">
            {p.nama.replace(/^Polda /, "")}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
