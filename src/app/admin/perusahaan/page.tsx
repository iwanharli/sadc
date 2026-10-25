import { redirect } from "next/navigation"

// Daftar perusahaan dipisah per jenis; alamat lama diarahkan ke submenu yang sesuai.
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const { jenis, ...sp } = await searchParams
  const qs = new URLSearchParams(Object.entries(sp).filter(([, v]) => v) as [string, string][])
  redirect(`/admin/perusahaan/${jenis === "PEMBIAYAAN" ? "pjpu" : "bujp"}${qs.size ? `?${qs}` : ""}`)
}
