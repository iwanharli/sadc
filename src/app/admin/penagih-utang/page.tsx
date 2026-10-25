import { HalamanDaftar } from "@/components/pendataan/halaman-daftar"
import type { FilterParams } from "@/lib/filter-pemohon"

export default async function Page({ searchParams }: { searchParams: Promise<FilterParams> }) {
  return <HalamanDaftar role="ADMIN" slug="penagih-utang" sp={await searchParams} />
}
