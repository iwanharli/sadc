"use client"

import { useEffect, useState } from "react"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type Opsi = { kode: string; nama: string }
const cache = new Map<string, Opsi[]>()

async function anak(parent: string) {
  if (cache.has(parent)) return cache.get(parent)!
  const res = await fetch(`/api/wilayah${parent ? `?parent=${encodeURIComponent(parent)}` : ""}`)
  const rows: Opsi[] = res.ok ? await res.json() : []
  cache.set(parent, rows)
  return rows
}

function useOpsi(parent: string | undefined, aktif: boolean) {
  const [opsi, setOpsi] = useState<Opsi[]>([])
  useEffect(() => {
    let batal = false
    if (!aktif) return
    anak(parent ?? "").then((r) => !batal && setOpsi(r))
    return () => {
      batal = true
    }
  }, [parent, aktif])
  return aktif ? opsi : []
}

export type NilaiWilayah = { provinsi?: string; kabupaten?: string; kecamatan?: string; kodeDesa?: string }

/** Pilih alamat bertingkat: provinsi → kab/kota → kecamatan → desa/kelurahan (kode Kemendagri). */
export function WilayahSelect({
  value,
  onChange,
  invalid,
}: {
  value: NilaiWilayah
  onChange: (v: NilaiWilayah) => void
  invalid?: boolean
}) {
  const prov = useOpsi(undefined, true)
  const kab = useOpsi(value.provinsi, !!value.provinsi)
  const kec = useOpsi(value.kabupaten, !!value.kabupaten)
  const desa = useOpsi(value.kecamatan, !!value.kecamatan)

  const level = [
    { label: "Provinsi", opsi: prov, nilai: value.provinsi, set: (v: string) => onChange({ provinsi: v }) },
    { label: "Kabupaten / Kota", opsi: kab, nilai: value.kabupaten, set: (v: string) => onChange({ provinsi: value.provinsi, kabupaten: v }) },
    { label: "Kecamatan", opsi: kec, nilai: value.kecamatan, set: (v: string) => onChange({ provinsi: value.provinsi, kabupaten: value.kabupaten, kecamatan: v }) },
    { label: "Desa / Kelurahan", opsi: desa, nilai: value.kodeDesa, set: (v: string) => onChange({ ...value, kodeDesa: v }) },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {level.map((l, i) => (
        <div key={l.label} className="space-y-2">
          <Label className="text-[15px]">{l.label}</Label>
          <Select value={l.nilai ?? ""} onValueChange={l.set} disabled={i > 0 && !level[i - 1].nilai}>
            <SelectTrigger className="h-11 w-full text-[15px]" aria-invalid={invalid && i === 3 && !l.nilai}>
              <SelectValue placeholder={`Pilih ${l.label.toLowerCase()}`} />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              {l.opsi.map((o) => (
                <SelectItem key={o.kode} value={o.kode} className="text-[15px]">
                  {o.nama}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ))}
    </div>
  )
}
