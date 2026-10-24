import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from "node:crypto"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"

/**
 * Penyimpanan file lokal (sementara, sebelum pindah ke MinIO).
 * Isi file dienkripsi AES-256-GCM sebelum ditulis ke disk; yang disimpan di database hanya `key`-nya.
 * Format file: "SADC1" | iv (12) | tag (16) | ciphertext. File lama tanpa header dibaca apa adanya.
 */
const ROOT = path.resolve(process.env.STORAGE_DIR ?? "storage/uploads")
const MAGIC = Buffer.from("SADC1")

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

let kunci: Buffer | null = null
function kunciEnkripsi() {
  if (kunci) return kunci
  const env = process.env.STORAGE_ENC_KEY
  if (env) {
    kunci = Buffer.from(env, "base64")
    if (kunci.length !== 32) throw new Error("STORAGE_ENC_KEY harus 32 byte (base64)")
  } else {
    if (process.env.NODE_ENV === "production") throw new Error("STORAGE_ENC_KEY wajib diatur di produksi")
    // pengembangan: turunkan dari secret auth agar tetap konsisten antar restart
    kunci = createHash("sha256").update(`sadc-storage:${process.env.BETTER_AUTH_SECRET ?? "dev"}`).digest()
  }
  return kunci
}

export function enkripsi(data: Buffer) {
  const iv = randomBytes(12)
  const c = createCipheriv("aes-256-gcm", kunciEnkripsi(), iv)
  const isi = Buffer.concat([c.update(data), c.final()])
  return Buffer.concat([MAGIC, iv, c.getAuthTag(), isi])
}

export function dekripsi(buf: Buffer) {
  if (!buf.subarray(0, MAGIC.length).equals(MAGIC)) return buf // file lama (belum terenkripsi)
  const iv = buf.subarray(5, 17)
  const tag = buf.subarray(17, 33)
  const d = createDecipheriv("aes-256-gcm", kunciEnkripsi(), iv)
  d.setAuthTag(tag)
  return Buffer.concat([d.update(buf.subarray(33)), d.final()])
}

export const terenkripsi = (buf: Buffer) => buf.subarray(0, MAGIC.length).equals(MAGIC)

export async function simpanFile(data: Buffer, mime: string) {
  const ext = TIPE_DIIZINKAN[mime]
  if (!ext) throw new Error("Tipe file tidak didukung")
  if (data.length > MAX_UPLOAD) throw new Error("Ukuran file melebihi 5 MB")
  const key = `${randomUUID()}.${ext}`
  await mkdir(ROOT, { recursive: true })
  await writeFile(path.join(ROOT, key), enkripsi(data))
  return key
}

export async function bacaFile(key: string) {
  if (!isValidKey(key)) throw new Error("Key tidak valid")
  const ext = key.split(".").pop()!
  const mime = Object.entries(TIPE_DIIZINKAN).find(([, e]) => e === ext)![0]
  return { data: dekripsi(await readFile(path.join(ROOT, key))), mime }
}

export const lokasiFile = (key: string) => path.join(ROOT, key)
export const folderFile = () => ROOT
