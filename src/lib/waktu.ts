/** Utilitas tanggal/jam yang mengikuti zona waktu pengguna. */

export const ZONA_DEFAULT = "Asia/Jakarta"
export const COOKIE_ZONA = "tz"

export function zonaValid(tz?: string | null): tz is string {
  if (!tz) return false
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz })
    return true
  } catch {
    return false
  }
}

const SINGKATAN: Record<string, string> = {
  "Asia/Jakarta": "WIB",
  "Asia/Pontianak": "WIB",
  "Asia/Makassar": "WITA",
  "Asia/Jayapura": "WIT",
}

/** Label zona: WIB/WITA/WIT untuk Indonesia, selain itu singkatan bawaan (mis. GMT+9). */
export function labelZona(tz: string) {
  if (SINGKATAN[tz]) return SINGKATAN[tz]
  const part = new Intl.DateTimeFormat("id-ID", { timeZone: tz, timeZoneName: "short" })
    .formatToParts(new Date())
    .find((p) => p.type === "timeZoneName")
  return part?.value ?? tz
}

/** Tanggal hari ini (YYYY-MM-DD) di zona tertentu. */
export function hariIniDi(tz: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(new Date())
}

/**
 * Format tanggal. String "YYYY-MM-DD" (tanggal murni, mis. tanggal lahir) tidak digeser zona;
 * objek Date (waktu kejadian) ditampilkan di zona pengguna.
 */
export function formatTanggal(
  v: string | Date | null | undefined,
  tz: string,
  opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" },
) {
  if (!v) return "—"
  if (typeof v === "string") {
    return new Intl.DateTimeFormat("id-ID", { ...opts, timeZone: "UTC" }).format(new Date(v.slice(0, 10) + "T00:00:00Z"))
  }
  return new Intl.DateTimeFormat("id-ID", { ...opts, timeZone: tz }).format(v)
}

/** Tanggal + jam + label zona, mis. "24 Oktober 2026 06.10 WIB". */
export function formatWaktu(v: Date | null | undefined, tz: string) {
  if (!v) return "—"
  return `${formatTanggal(v, tz, { day: "numeric", month: "long", year: "numeric" })} ${new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: tz,
  }).format(v)} ${labelZona(tz)}`
}
