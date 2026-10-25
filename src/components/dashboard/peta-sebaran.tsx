"use client"

import { geoArea, geoMercator, geoPath } from "d3-geo"
import type { Feature, FeatureCollection, Geometry } from "geojson"
import { useEffect, useMemo, useState } from "react"
import { cn } from "@/lib/utils"

type Rekap = { id: number; nama: string; provinsiKode: string[]; satpam: number; dc: number; total: number }
type Prop = { kode: string; nama: string }
type Geo = FeatureCollection<Geometry, Prop>

const W = 1000
const H = 380
const KELAS = 5
const nf = new Intl.NumberFormat("id-ID")

/** d3-geo mengharapkan cincin luar searah jarum jam; balik poligon yang luasnya > setengah bola. */
function rapikan(geo: Geo): Geo {
  for (const f of geo.features) {
    const g = f.geometry
    const polys = g.type === "Polygon" ? [g.coordinates] : g.type === "MultiPolygon" ? g.coordinates : []
    for (const poly of polys) {
      if (geoArea({ type: "Polygon", coordinates: poly }) > 2 * Math.PI) poly.forEach((ring) => ring.reverse())
    }
  }
  return geo
}

let cache: Promise<Geo> | null = null
const muatGeo = () =>
  (cache ??= fetch("/geo/provinsi.geojson")
    .then((r) => r.json())
    .then(rapikan)
    .catch((e) => {
      cache = null // izinkan dicoba lagi pada render berikutnya
      throw e
    }))

/** Peta choropleth jumlah pendataan per Polda (provinsi diwarnai menurut Polda yang mencakupnya). */
export function PetaSebaran({ rekap, isi }: { rekap: Rekap[]; isi?: boolean }) {
  const [geo, setGeo] = useState<Geo | null>(null)
  const [hover, setHover] = useState<{ p: Prop; x: number; y: number } | null>(null)

  useEffect(() => {
    muatGeo()
      .then(setGeo)
      .catch(() => {})
  }, [])

  const perProv = useMemo(() => {
    const m = new Map<string, Rekap>()
    for (const r of rekap) for (const k of r.provinsiKode) m.set(k, r)
    return m
  }, [rekap])

  // batas kelas: kuantil agar warna tersebar merata walau data timpang
  const batas = useMemo(() => {
    const v = rekap.map((r) => r.total).filter((n) => n > 0).sort((a, b) => a - b)
    if (!v.length) return []
    return Array.from({ length: KELAS - 1 }, (_, i) => v[Math.floor(((i + 1) / KELAS) * (v.length - 1))])
  }, [rekap])
  const kelas = (n: number) => (n <= 0 ? 0 : 1 + batas.filter((b) => n > b).length)

  const path = useMemo(() => {
    if (!geo) return null
    return geoPath(geoMercator().fitExtent([[8, 8], [W - 8, H - 8]], geo))
  }, [geo])

  const aktif = hover ? perProv.get(hover.p.kode) : null
  const rentang = [0, ...batas]

  return (
    <div className={cn("relative", isi && "fit:flex fit:h-full fit:flex-col")}>
      <div className={cn("relative w-full", isi && "fit:min-h-0 fit:flex-1")} onMouseLeave={() => setHover(null)}>
        {!geo || !path ? (
          <div className="flex aspect-[1000/380] items-center justify-center rounded-xl bg-muted/50 text-[15px] text-muted-foreground">
            Memuat peta...
          </div>
        ) : (
          <svg
            viewBox={`0 0 ${W} ${H}`}
            preserveAspectRatio="xMidYMid meet"
            className={cn("h-auto w-full", isi && "fit:h-full")}
            role="img"
            aria-label="Peta sebaran pendataan per Polda"
          >
            {geo.features.map((f: Feature<Geometry, Prop>) => {
              const r = perProv.get(f.properties.kode)
              const sama = aktif && r && aktif.id === r.id
              return (
                <path
                  key={f.properties.kode}
                  d={path(f) ?? ""}
                  fill={`var(--seq-${kelas(r?.total ?? 0)})`}
                  stroke="var(--card)"
                  strokeWidth={sama ? 1.6 : 0.6}
                  className={cn("cursor-pointer transition-[opacity,stroke-width]", aktif && !sama && "opacity-55")}
                  onMouseMove={(e) => {
                    const box = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect()
                    setHover({ p: f.properties, x: e.clientX - box.left, y: e.clientY - box.top })
                  }}
                />
              )
            })}
          </svg>
        )}

        {hover && (
          <div
            className="pointer-events-none absolute z-10 min-w-56 rounded-xl border bg-popover px-4 py-3 text-popover-foreground shadow-lg"
            style={{ left: Math.min(hover.x + 14, 9999), top: hover.y + 14, transform: hover.x > 600 ? "translateX(-110%)" : undefined }}
          >
            <p className="text-[15px] font-semibold">{aktif?.nama ?? "Belum dipetakan"}</p>
            <p className="text-sm text-muted-foreground">Provinsi {hover.p.nama}</p>
            {aktif && (
              <dl className="mt-2 space-y-1 text-[15px]">
                <Baris warna="var(--series-satpam)" label="Satpam" n={aktif.satpam} />
                <Baris warna="var(--series-dc)" label="Penagih Utang" n={aktif.dc} />
                <div className="flex justify-between border-t pt-1 font-semibold">
                  <span>Total</span>
                  <span className="tabular-nums">{nf.format(aktif.total)}</span>
                </div>
              </dl>
            )}
          </div>
        )}
      </div>

      {/* legenda */}
      <div className="mt-3 flex shrink-0 flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
        <span className="font-medium text-foreground">Jumlah pendataan</span>
        <span className="flex items-center gap-2">
          <span className="size-3.5 rounded-sm" style={{ background: "var(--seq-0)" }} /> 0
        </span>
        {rentang.map((lo, i) => (
          <span key={i} className="flex items-center gap-2">
            <span className="size-3.5 rounded-sm" style={{ background: `var(--seq-${i + 1})` }} />
            {i === rentang.length - 1 ? `> ${nf.format(lo)}` : `${nf.format(lo + 1)}–${nf.format(rentang[i + 1])}`}
          </span>
        ))}
      </div>
    </div>
  )
}

function Baris({ warna, label, n }: { warna: string; label: string; n: number }) {
  return (
    <div className="flex items-center justify-between gap-6">
      <span className="flex items-center gap-2">
        <span className="size-2.5 rounded-full" style={{ background: warna }} /> {label}
      </span>
      <span className="tabular-nums">{nf.format(n)}</span>
    </div>
  )
}
