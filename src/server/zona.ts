import "server-only"
import { cookies } from "next/headers"
import { COOKIE_ZONA, ZONA_DEFAULT, zonaValid } from "@/lib/waktu"

/** Zona waktu pengguna dari cookie yang diisi browser (lihat TimezoneSync); default WIB. */
export async function getZona() {
  const tz = (await cookies()).get(COOKIE_ZONA)?.value
  return zonaValid(tz) ? tz : ZONA_DEFAULT
}
