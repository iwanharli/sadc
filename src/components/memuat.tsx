import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

/**
 * Kerangka halaman saat data dimuat (dipakai oleh loading.tsx).
 * Bentuknya meniru tata letak halaman aslinya agar tidak ada lompatan tampilan.
 */
export type JenisMemuat = "ringkasan" | "daftar" | "detail" | "formulir" | "kartu" | "laporan" | "profil" | "wilayah"

export function Memuat({ jenis = "kartu" }: { jenis?: JenisMemuat }) {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <span className="sr-only">Memuat halaman…</span>
      {jenis === "ringkasan" ? <Ringkasan /> : <Judul aksi={jenis !== "profil"} />}
      {jenis === "daftar" && <Daftar />}
      {jenis === "detail" && <Detail />}
      {jenis === "formulir" && <Formulir />}
      {jenis === "kartu" && <DaftarKartu />}
      {jenis === "laporan" && <Laporan />}
      {jenis === "profil" && <Profil />}
      {jenis === "wilayah" && <Wilayah />}
    </div>
  )
}

function Judul({ aksi = true }: { aksi?: boolean }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="space-y-3">
        <Skeleton className="h-5 w-24 rounded-full" />
        <Skeleton className="h-9 w-72 max-w-full" />
        <Skeleton className="h-5 w-[28rem] max-w-full" />
      </div>
      {aksi && <Skeleton className="h-11 w-44 rounded-xl" />}
    </div>
  )
}

function KepalaKartu() {
  return (
    <div className="space-y-2 border-b px-6 py-5">
      <Skeleton className="h-5 w-48" />
      <Skeleton className="h-4 w-72 max-w-full" />
    </div>
  )
}

function Baris({ n = 8, avatar = true }: { n?: number; avatar?: boolean }) {
  return (
    <ul className="divide-y">
      {Array.from({ length: n }, (_, i) => (
        <li key={i} className="flex items-center gap-4 px-6 py-4">
          {avatar && <Skeleton className="size-10 shrink-0 rounded-full" />}
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4" style={{ width: `${55 - (i % 3) * 10}%` }} />
            <Skeleton className="h-3.5 w-1/3" />
          </div>
          <Skeleton className="hidden h-4 w-24 md:block" />
          <Skeleton className="h-7 w-24 rounded-full" />
        </li>
      ))}
    </ul>
  )
}

function Ringkasan() {
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-3">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-5 w-80 max-w-full" />
        </div>
        <Skeleton className="h-11 w-64 rounded-xl" />
      </div>
      <div className="grid gap-5 xl:grid-cols-12">
        <Skeleton className="h-60 rounded-xl xl:col-span-5" />
        <div className="grid gap-5 sm:grid-cols-2 xl:col-span-7">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      </div>
      <div className="grid gap-5 xl:grid-cols-12">
        <Skeleton className="h-80 rounded-xl xl:col-span-8" />
        <Skeleton className="h-80 rounded-xl xl:col-span-4" />
      </div>
    </>
  )
}

function Daftar() {
  return (
    <Card className="gap-0 overflow-hidden p-0">
      <KepalaKartu />
      <div className="flex flex-wrap items-center gap-3 border-b px-6 py-4">
        <Skeleton className="h-11 min-w-64 flex-1 rounded-lg" />
        <Skeleton className="h-11 w-80 rounded-xl" />
      </div>
      <div className="flex gap-6 border-b px-6 py-3.5">
        {[30, 25, 20, 15].map((w, i) => (
          <Skeleton key={i} className="h-4" style={{ width: `${w}%` }} />
        ))}
      </div>
      <Baris n={8} />
    </Card>
  )
}

function Detail() {
  return (
    <>
      <Skeleton className="h-20 rounded-2xl" />
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Card className="gap-0 overflow-hidden p-0">
            <KepalaKartu />
            <div className="flex gap-6 p-6">
              <Skeleton className="aspect-[3/4] w-36 rounded-xl" />
              <div className="grid flex-1 grid-cols-2 gap-x-8 gap-y-5">
                {Array.from({ length: 8 }, (_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-3.5 w-24" />
                    <Skeleton className="h-5 w-3/4" />
                  </div>
                ))}
              </div>
            </div>
          </Card>
          <Card className="gap-0 overflow-hidden p-0">
            <KepalaKartu />
            <Baris n={4} avatar={false} />
          </Card>
        </div>
        <div className="space-y-6">
          {[44, 36, 52].map((h, i) => (
            <Skeleton key={i} className="rounded-xl" style={{ height: `${h * 4}px` }} />
          ))}
        </div>
      </div>
    </>
  )
}

function Formulir() {
  return (
    <div className="grid gap-6 xl:grid-cols-[300px_1fr]">
      <Card className="h-fit gap-2 p-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="flex items-center gap-3 px-3 py-3">
            <Skeleton className="size-10 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3.5 w-20" />
              <Skeleton className="h-4 w-36" />
            </div>
          </div>
        ))}
      </Card>
      <Card className="gap-0 overflow-hidden p-0">
        <KepalaKartu />
        <div className="space-y-6 p-8">
          <div className="grid gap-4 sm:grid-cols-2">
            <Skeleton className="h-28 rounded-2xl" />
            <Skeleton className="h-28 rounded-2xl" />
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-11 rounded-lg" />
              </div>
            ))}
          </div>
        </div>
        <div className="flex justify-between border-t px-8 py-4">
          <Skeleton className="h-11 w-28 rounded-lg" />
          <Skeleton className="h-11 w-32 rounded-lg" />
        </div>
      </Card>
    </div>
  )
}

function DaftarKartu() {
  return (
    <Card className="gap-0 overflow-hidden p-0">
      <KepalaKartu />
      <Baris n={7} />
    </Card>
  )
}

function Laporan() {
  return (
    <>
      <div className="grid gap-5 xl:grid-cols-5">
        <Skeleton className="h-[420px] rounded-xl xl:col-span-2" />
        <Card className="gap-0 overflow-hidden p-0 xl:col-span-3">
          <KepalaKartu />
          <Baris n={6} avatar={false} />
        </Card>
      </div>
      <Card className="gap-0 overflow-hidden p-0">
        <KepalaKartu />
        <Baris n={5} avatar={false} />
      </Card>
    </>
  )
}

function Profil() {
  return (
    <div className="grid gap-6 xl:grid-cols-3">
      <Card className="gap-0 overflow-hidden p-0">
        <Skeleton className="h-24 rounded-none" />
        <div className="-mt-12 flex flex-col items-center gap-3 px-6 pb-6">
          <Skeleton className="size-24 rounded-full ring-4 ring-card" />
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="space-y-4 border-t p-6">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-5" />
          ))}
        </div>
      </Card>
      <div className="space-y-6 xl:col-span-2">
        {[3, 6].map((n, i) => (
          <Card key={i} className="gap-0 overflow-hidden p-0">
            <KepalaKartu />
            <Baris n={n} />
          </Card>
        ))}
      </div>
    </div>
  )
}

function Wilayah() {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      {[8, 4].map((n, i) => (
        <Card key={i} className={cn("gap-0 overflow-hidden p-0")}>
          <KepalaKartu />
          <Baris n={n} avatar={false} />
        </Card>
      ))}
    </div>
  )
}
