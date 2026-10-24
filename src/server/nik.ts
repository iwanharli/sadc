import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes } from "node:crypto"

/**
 * Perlindungan NIK di database:
 * - nik_hash   : HMAC-SHA256 → pencarian persis, keunikan, cek ganda & blacklist
 * - nik_enc    : AES-256-GCM → hanya didekripsi saat ditampilkan
 * - nik_wilayah: 6 digit awal (kode kecamatan, bukan data pribadi) → cek wilayah & cari per wilayah
 * Kunci dari NIK_KEY (32 byte base64). KEHILANGAN KUNCI = NIK TIDAK BISA DIBACA; simpan cadangannya.
 */
let kunci: { enc: Buffer; mac: Buffer } | null = null

function getKunci() {
  if (kunci) return kunci
  let akar: Buffer
  const env = process.env.NIK_KEY
  if (env) {
    akar = Buffer.from(env, "base64")
    if (akar.length !== 32) throw new Error("NIK_KEY harus 32 byte (base64)")
  } else {
    if (process.env.NODE_ENV === "production") throw new Error("NIK_KEY wajib diatur di produksi")
    akar = createHash("sha256").update(`sadc-nik:${process.env.BETTER_AUTH_SECRET ?? "dev"}`).digest()
  }
  // turunkan dua kunci terpisah agar hash & enkripsi tidak memakai kunci yang sama
  kunci = {
    enc: createHash("sha256").update(Buffer.concat([akar, Buffer.from("enc")])).digest(),
    mac: createHash("sha256").update(Buffer.concat([akar, Buffer.from("mac")])).digest(),
  }
  return kunci
}

export function hashNik(nik: string) {
  return createHmac("sha256", getKunci().mac).update(nik.trim()).digest("hex")
}

export function enkripsiNik(nik: string) {
  const iv = randomBytes(12)
  const c = createCipheriv("aes-256-gcm", getKunci().enc, iv)
  const isi = Buffer.concat([c.update(nik.trim(), "utf8"), c.final()])
  return Buffer.concat([iv, c.getAuthTag(), isi]).toString("base64")
}

export function dekripsiNik(enc: string | null | undefined) {
  if (!enc) return ""
  const buf = Buffer.from(enc, "base64")
  const d = createDecipheriv("aes-256-gcm", getKunci().enc, buf.subarray(0, 12))
  d.setAuthTag(buf.subarray(12, 28))
  return Buffer.concat([d.update(buf.subarray(28)), d.final()]).toString("utf8")
}

/** Nilai kolom pemohon/blacklist untuk sebuah NIK. */
export function kolomNik(nik: string) {
  return { nikHash: hashNik(nik), nikEnc: enkripsiNik(nik), nikWilayah: nik.trim().slice(0, 6) }
}

/** NIK disamarkan untuk tampilan ringkas, mis. 3273••••••••0012. */
export const samarkanNik = (nik: string) => (nik.length === 16 ? `${nik.slice(0, 4)}••••••••${nik.slice(12)}` : nik)
