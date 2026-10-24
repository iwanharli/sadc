export type FilterParams = { q?: string; status?: string; profesi?: string; polda?: string; page?: string }

/** Ubah query string direktori menjadi filter yang tervalidasi. */
export function parseFilter(sp: FilterParams) {
  return {
    q: sp.q,
    status: ["DRAF", "TERVERIFIKASI", "DICETAK"].includes(sp.status ?? "") ? (sp.status as "DRAF") : undefined,
    profesi: ["SATPAM", "DEBT_COLLECTOR"].includes(sp.profesi ?? "") ? (sp.profesi as "SATPAM") : undefined,
    poldaId: Number(sp.polda) || undefined,
  }
}
