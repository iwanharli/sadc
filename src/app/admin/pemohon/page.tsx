import { redirect } from "next/navigation"
import { slugProfesi, type FilterParams } from "@/lib/filter-pemohon"

// Daftar dipisah per profesi; alamat lama diarahkan ke daftar yang sesuai.
export default async function Page({ searchParams }: { searchParams: Promise<FilterParams> }) {
  const { profesi, ...sp } = await searchParams
  const qs = new URLSearchParams(Object.entries(sp).filter(([, v]) => v) as [string, string][])
  redirect(`/admin/${slugProfesi(profesi === "DEBT_COLLECTOR" ? "DEBT_COLLECTOR" : "SATPAM")}${qs.size ? `?${qs}` : ""}`)
}
