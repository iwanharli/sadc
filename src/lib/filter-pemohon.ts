export const STATUS_KTA = ["AKTIF", "DIBEKUKAN", "DICABUT", "KEDALUWARSA"] as const
export type StatusKta = (typeof STATUS_KTA)[number]

export type FilterParams = { q?: string; status?: string; profesi?: string; polda?: string; page?: string; per?: string }

/** Ubah query string direktori menjadi filter yang tervalidasi. */
export function parseFilter(sp: FilterParams) {
  return {
    q: sp.q,
    status: STATUS_KTA.includes(sp.status as StatusKta) ? (sp.status as StatusKta) : undefined,
    profesi: ["SATPAM", "DEBT_COLLECTOR"].includes(sp.profesi ?? "") ? (sp.profesi as "SATPAM") : undefined,
    poldaId: Number(sp.polda) || undefined,
  }
}

/** Halaman daftar per profesi: slug URL ↔ kode profesi. */
export const DAFTAR_PROFESI = {
  satpam: { profesi: "SATPAM", judul: "Daftar Satpam", label: "Satpam" },
  "petugas-penagih": { profesi: "DEBT_COLLECTOR", judul: "Daftar Petugas Penagih", label: "Petugas Penagih" },
} as const
export type SlugProfesi = keyof typeof DAFTAR_PROFESI
export const slugProfesi = (p: "SATPAM" | "DEBT_COLLECTOR"): SlugProfesi => (p === "SATPAM" ? "satpam" : "petugas-penagih")

/** Pilihan baris per halaman pada tabel berpaginasi (default 20). */
export const PILIHAN_PER_HALAMAN = [10, 20, 50, 100] as const
export const parsePerHalaman = (v?: string) => ((PILIHAN_PER_HALAMAN as readonly number[]).includes(Number(v)) ? Number(v) : 20)
