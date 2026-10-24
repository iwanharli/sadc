import "server-only"
import { headers } from "next/headers"

/**
 * Pembatas laju sederhana di memori (per proses). Cukup untuk satu instance;
 * bila aplikasi dijalankan beberapa instance, pindahkan ke Redis/Postgres.
 */
const ember = new Map<string, number[]>()

export async function ipKlien() {
  const h = await headers()
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "lokal"
}

/** true bila masih di bawah batas `maks` permintaan dalam `detik` terakhir. */
export function izinkan(kunci: string, maks: number, detik: number) {
  const kini = Date.now()
  const batas = kini - detik * 1000
  const jejak = (ember.get(kunci) ?? []).filter((t) => t > batas)
  if (jejak.length >= maks) {
    ember.set(kunci, jejak)
    return false
  }
  jejak.push(kini)
  ember.set(kunci, jejak)
  // bersihkan sesekali agar map tidak membengkak
  if (ember.size > 10_000) for (const [k, v] of ember) if (!v.some((t) => t > batas)) ember.delete(k)
  return true
}
