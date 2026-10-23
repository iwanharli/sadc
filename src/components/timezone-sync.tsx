"use client"

import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { COOKIE_ZONA } from "@/lib/waktu"

/** Simpan zona waktu browser ke cookie agar server menampilkan waktu sesuai zona pengguna. */
export function TimezoneSync() {
  const router = useRouter()
  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    const sekarang = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_ZONA}=([^;]*)`))?.[1]
    if (!tz || decodeURIComponent(sekarang ?? "") === tz) return
    document.cookie = `${COOKIE_ZONA}=${encodeURIComponent(tz)}; path=/; max-age=31536000; samesite=lax`
    router.refresh()
  }, [router])
  return null
}
