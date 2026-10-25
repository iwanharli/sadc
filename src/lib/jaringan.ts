/** Penanganan gangguan jaringan di sisi klien (mis. server sedang restart atau koneksi putus). */

export const PESAN_JARINGAN = "Koneksi ke server terputus. Periksa jaringan Anda, lalu coba lagi."

/** Error karena permintaan tidak sampai ke server (bukan penolakan dari server). */
export function galatJaringan(e: unknown) {
  if (!(e instanceof Error)) return false
  return e.name === "TypeError" || /failed to fetch|networkerror|load failed|network request failed|fetch failed/i.test(e.message)
}

/** Pesan yang ramah untuk ditampilkan ke pengguna. */
export function pesanGalat(e: unknown, cadangan = "Terjadi kesalahan. Silakan coba lagi.") {
  if (galatJaringan(e)) return PESAN_JARINGAN
  return e instanceof Error && e.message ? e.message : cadangan
}

/** Jalankan ulang `fn` bila gagal karena jaringan (hanya untuk operasi yang aman diulang). */
export async function denganUlang<T>(fn: () => Promise<T>, kali = 1, jedaMs = 800): Promise<T> {
  try {
    return await fn()
  } catch (e) {
    if (kali <= 0 || !galatJaringan(e)) throw e
    await new Promise((r) => setTimeout(r, jedaMs))
    return denganUlang(fn, kali - 1, jedaMs * 2)
  }
}
