"use client"

import { denganUlang, pesanGalat } from "@/lib/jaringan"

/** Unggah file/blob ke /api/upload, mengembalikan key penyimpanan. Diulang otomatis bila koneksi terputus. */
export async function unggah(file: Blob, nama = "file") {
  try {
    return await denganUlang(async () => {
      const form = new FormData()
      form.append("file", file, nama)
      const res = await fetch("/api/upload", { method: "POST", body: form })
      const json = await res.json().catch(() => ({}))
      if (res.status === 401 || res.status === 403) throw new Error("Sesi Anda berakhir. Muat ulang halaman lalu masuk kembali.")
      if (!res.ok) throw new Error(json.error ?? "Gagal mengunggah file")
      return json.key as string
    })
  } catch (e) {
    throw new Error(pesanGalat(e, "Gagal mengunggah file"))
  }
}

export const fileUrl = (key: string) => `/api/files/${key}`
export const isPdf = (key: string) => key.endsWith(".pdf")
