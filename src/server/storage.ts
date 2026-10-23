import { randomUUID } from "node:crypto"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"

/**
 * Penyimpanan file lokal (sementara, sebelum pindah ke MinIO).
 * File disimpan di STORAGE_DIR (default ./storage/uploads) dengan nama acak;
 * yang disimpan di database hanya `key`-nya.
 */
const ROOT = path.resolve(process.env.STORAGE_DIR ?? "storage/uploads")

export const MAX_UPLOAD = 5 * 1024 * 1024 // 5 MB

export const TIPE_DIIZINKAN: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
}

const KEY_RE = /^[0-9a-f-]{36}\.(pdf|jpg|png|webp)$/

export function isValidKey(key: string) {
  return KEY_RE.test(key)
}

export async function simpanFile(data: Buffer, mime: string) {
  const ext = TIPE_DIIZINKAN[mime]
  if (!ext) throw new Error("Tipe file tidak didukung")
  if (data.length > MAX_UPLOAD) throw new Error("Ukuran file melebihi 5 MB")
  const key = `${randomUUID()}.${ext}`
  await mkdir(ROOT, { recursive: true })
  await writeFile(path.join(ROOT, key), data)
  return key
}

export async function bacaFile(key: string) {
  if (!isValidKey(key)) throw new Error("Key tidak valid")
  const ext = key.split(".").pop()!
  const mime = Object.entries(TIPE_DIIZINKAN).find(([, e]) => e === ext)![0]
  return { data: await readFile(path.join(ROOT, key)), mime }
}
