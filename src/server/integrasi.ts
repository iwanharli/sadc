import "server-only"
import { createHash, randomBytes } from "node:crypto"
import { and, eq, isNull, sql, type SQL } from "drizzle-orm"
import { db, schema } from "./db"
import { izinkan } from "./rate-limit"

/**
 * API integrasi baca-saja untuk klien luar (Baharkam Command Center).
 * Token bearer disimpan sebagai SHA-256; hanya berlaku untuk /api/integration/*.
 * Kontrak respons: docs/Tanggapan-API-Integrasi-sadc.md (v0.2).
 */
export const BATAS_PER_MENIT = 60
const LIMIT_BAWAAN = 500
const LIMIT_MAKS = 2000

export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex")

/** Token baru: `sadc_<awalan>_<rahasia>`. Nilai utuh hanya ditampilkan sekali saat dibuat. */
export function buatToken() {
  const awalan = randomBytes(4).toString("hex")
  const token = `sadc_${awalan}_${randomBytes(24).toString("base64url")}`
  return { token, awalan, tokenHash: hashToken(token) }
}

export type Token = typeof schema.integrasiToken.$inferSelect

export function galat(status: number, code: string, message: string, headers?: HeadersInit) {
  return Response.json({ error: { code, message } }, { status, headers })
}

/** IP asli klien: Cloudflare → X-Forwarded-For → X-Real-IP. */
export function ipKlien(req: Request) {
  const h = req.headers
  const ip = h.get("cf-connecting-ip") || h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || ""
  return ip.replace(/^::ffff:/i, "")
}

/** Periksa token, IP & batas laju. Mengembalikan token, atau Response galat. */
export async function otentikasi(req: Request): Promise<{ token: Token; ip: string } | Response> {
  const m = req.headers.get("authorization")?.match(/^Bearer\s+(\S+)$/i)
  if (!m) return galat(401, "UNAUTHORIZED", "Header Authorization: Bearer <token> wajib")
  const [token] = await db
    .select()
    .from(schema.integrasiToken)
    .where(and(eq(schema.integrasiToken.tokenHash, hashToken(m[1])), eq(schema.integrasiToken.aktif, true), isNull(schema.integrasiToken.dicabutAt)))
  if (!token) return galat(401, "UNAUTHORIZED", "Token tidak valid atau sudah dicabut")

  const ip = ipKlien(req)
  if (token.ipIzin.length && !token.ipIzin.includes(ip)) return galat(403, "FORBIDDEN", `IP ${ip || "tidak dikenal"} tidak diizinkan untuk token ini`)
  if (!izinkan(`integrasi:${token.id}`, BATAS_PER_MENIT, 60))
    return galat(429, "RATE_LIMITED", `Batas ${BATAS_PER_MENIT} permintaan per menit terlampaui`, { "Retry-After": "60" })

  await db.update(schema.integrasiToken).set({ terakhirDipakai: new Date(), ipTerakhir: ip }).where(eq(schema.integrasiToken.id, token.id))
  return { token, ip }
}

export class GalatParam extends Error {}

/** Parameter umum: limit, cursor, updatedSince, polda. */
export function paramUmum(url: URL) {
  const sp = url.searchParams
  const limitStr = sp.get("limit")
  const limit = limitStr == null ? LIMIT_BAWAAN : Number(limitStr)
  if (!Number.isInteger(limit) || limit < 1 || limit > LIMIT_MAKS) throw new GalatParam(`limit harus 1–${LIMIT_MAKS}`)

  let updatedSince: string | null = null
  const us = sp.get("updatedSince")
  if (us) {
    const d = new Date(us)
    if (Number.isNaN(d.getTime())) throw new GalatParam("updatedSince harus ISO 8601")
    updatedSince = d.toISOString()
  }

  let cursor: { t: string; id: number } | null = null
  const c = sp.get("cursor")
  if (c) {
    try {
      const v = JSON.parse(Buffer.from(c, "base64url").toString())
      if (typeof v.t !== "string" || !Number.isInteger(v.id)) throw new Error()
      cursor = v
    } catch {
      throw new GalatParam("cursor tidak valid")
    }
  }
  const polda = sp.get("polda")?.toUpperCase() || null
  return { limit, updatedSince, cursor, polda }
}

/** Parameter pilihan dari daftar nilai yang sah. */
export function paramPilihan<T extends string>(url: URL, nama: string, sah: readonly T[]): T | null {
  const v = url.searchParams.get(nama)
  if (!v) return null
  if (!sah.includes(v as T)) throw new GalatParam(`${nama} harus salah satu dari: ${sah.join(", ")}`)
  return v as T
}

/**
 * Syarat sinkron bertahap + kursor pada kolom/ekspresi `waktu` (timestamp UTC) & `id`.
 * Kursor menyimpan teks timestamp penuh (mikrodetik) agar tidak ada baris terlewat.
 */
export function syaratKursor(waktu: SQL, id: SQL, p: ReturnType<typeof paramUmum>) {
  const s: SQL[] = []
  if (p.updatedSince) s.push(sql`${waktu} >= (${p.updatedSince}::timestamptz at time zone 'UTC')`)
  if (p.cursor) s.push(sql`(${waktu}, ${id}) > (${p.cursor.t}::timestamp, ${p.cursor.id})`)
  return s
}

/** Potong hasil (diambil limit+1) dan bentuk nextCursor dari baris terakhir. */
export function halaman<R extends { _t: string; _id: number }>(rows: R[], limit: number) {
  const ada = rows.length > limit
  const isi = ada ? rows.slice(0, limit) : rows
  const akhir = isi.at(-1)
  const nextCursor = ada && akhir ? Buffer.from(JSON.stringify({ t: akhir._t, id: akhir._id })).toString("base64url") : null
  return { isi, nextCursor }
}

/** Timestamp UTC tanpa zona dari Postgres → ISO 8601 dengan Z. */
export const iso = (v: string | Date | null | undefined) => {
  if (v == null) return null
  if (v instanceof Date) return v.toISOString()
  return new Date(v.replace(" ", "T") + (/[zZ+]/.test(v.slice(10)) ? "" : "Z")).toISOString()
}

/** Bungkus handler: autentikasi, galat parameter, audit, bentuk respons daftar. */
export function endpoint(nama: string, ambil: (url: URL) => Promise<{ data: unknown[]; nextCursor: string | null }>) {
  return async function GET(req: Request) {
    const auth = await otentikasi(req)
    if (auth instanceof Response) return auth
    const url = new URL(req.url)
    try {
      const { data, nextCursor } = await ambil(url)
      await db.insert(schema.auditLog).values({
        userId: null,
        aksi: "API_INTEGRASI",
        entitas: nama,
        entitasId: String(auth.token.id),
        ip: auth.ip || null,
        data: { token: auth.token.nama, params: Object.fromEntries(url.searchParams), jumlah: data.length },
      })
      return Response.json({ data, nextCursor, generatedAt: new Date().toISOString() }, { headers: { "Cache-Control": "no-store" } })
    } catch (e) {
      if (e instanceof GalatParam) return galat(400, "BAD_REQUEST", e.message)
      console.error(`[integrasi] ${nama}`, e)
      return galat(500, "INTERNAL", "Terjadi kesalahan di server")
    }
  }
}
