"use client"

/** Unggah file/blob ke /api/upload, mengembalikan key penyimpanan. */
export async function unggah(file: Blob, nama = "file") {
  const form = new FormData()
  form.append("file", file, nama)
  const res = await fetch("/api/upload", { method: "POST", body: form })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error ?? "Gagal mengunggah file")
  return json.key as string
}

export const fileUrl = (key: string) => `/api/files/${key}`
export const isPdf = (key: string) => key.endsWith(".pdf")
