export const STATUS_KTA = ["AKTIF", "DIBEKUKAN", "DICABUT", "KEDALUWARSA"] as const
export type StatusKta = (typeof STATUS_KTA)[number]

export type FilterParams = { q?: string; status?: string; profesi?: string; polda?: string; page?: string }

/** Ubah query string direktori menjadi filter yang tervalidasi. */
export function parseFilter(sp: FilterParams) {
  return {
    q: sp.q,
    status: STATUS_KTA.includes(sp.status as StatusKta) ? (sp.status as StatusKta) : undefined,
    profesi: ["SATPAM", "DEBT_COLLECTOR"].includes(sp.profesi ?? "") ? (sp.profesi as "SATPAM") : undefined,
    poldaId: Number(sp.polda) || undefined,
  }
}
