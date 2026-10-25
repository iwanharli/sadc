"use server"

import { and, eq, isNull } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { isIP } from "node:net"
import { catatAudit } from "../audit"
import { requireUser } from "../auth"
import { db, schema } from "../db"
import { buatToken } from "../integrasi"

type Hasil<T> = { ok: true; data: T } | { ok: false; error: string }
const gagal = (e: unknown) => ({ ok: false as const, error: e instanceof Error ? e.message : "Gagal" })

/** Admin: terbitkan token integrasi. Nilai token utuh hanya dikembalikan sekali di sini. */
export async function terbitkanToken(nama: string, ipTeks: string): Promise<Hasil<{ token: string }>> {
  try {
    const admin = await requireUser("ADMIN")
    const n = nama.trim()
    if (n.length < 3 || n.length > 80) throw new Error("Nama token 3–80 karakter")
    const ipIzin = [...new Set(ipTeks.split(/[\s,]+/).map((v) => v.trim()).filter(Boolean))]
    const salah = ipIzin.find((ip) => !isIP(ip))
    if (salah) throw new Error(`IP tidak valid: ${salah}`)
    const t = buatToken()
    const [row] = await db
      .insert(schema.integrasiToken)
      .values({ nama: n, tokenHash: t.tokenHash, awalan: t.awalan, ipIzin, dibuatOleh: admin.id })
      .returning({ id: schema.integrasiToken.id })
    await catatAudit(admin.id, "BUAT_TOKEN_INTEGRASI", "integrasi_token", row.id, { nama: n, ipIzin })
    revalidatePath("/admin/integrasi")
    return { ok: true, data: { token: t.token } }
  } catch (e) {
    return gagal(e)
  }
}

/** Admin: cabut token (permanen). */
export async function cabutToken(id: number): Promise<Hasil<null>> {
  try {
    const admin = await requireUser("ADMIN")
    const [row] = await db
      .update(schema.integrasiToken)
      .set({ aktif: false, dicabutAt: new Date() })
      .where(and(eq(schema.integrasiToken.id, id), isNull(schema.integrasiToken.dicabutAt)))
      .returning({ nama: schema.integrasiToken.nama })
    if (!row) throw new Error("Token tidak ditemukan atau sudah dicabut")
    await catatAudit(admin.id, "CABUT_TOKEN_INTEGRASI", "integrasi_token", id, { nama: row.nama })
    revalidatePath("/admin/integrasi")
    return { ok: true, data: null }
  } catch (e) {
    return gagal(e)
  }
}
