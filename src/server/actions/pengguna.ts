"use server"

import { randomUUID } from "node:crypto"
import { hashPassword } from "better-auth/crypto"
import { and, eq, ne } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { penggunaSchema, sandiSchema, type PenggunaInput } from "@/lib/pengguna-schema"
import { catatAudit } from "../audit"
import { requireUser } from "../auth"
import { db, schema } from "../db"

type Hasil<T> = { ok: true; data: T } | { ok: false; error: string }
const gagal = (e: unknown) => ({ ok: false as const, error: e instanceof Error ? e.message : "Gagal" })

function parse(input: PenggunaInput) {
  const r = penggunaSchema.safeParse(input)
  if (!r.success) throw new Error(r.error.issues[0]?.message ?? "Data tidak valid")
  return r.data
}

export async function buatPengguna(input: PenggunaInput): Promise<Hasil<{ id: string }>> {
  try {
    const admin = await requireUser("ADMIN")
    const d = parse(input)
    const sandi = sandiSchema.safeParse(d.password)
    if (!sandi.success) throw new Error(sandi.error.issues[0].message)
    const ada = await db.query.user.findFirst({ where: eq(schema.user.username, d.username) })
    if (ada) throw new Error("Username sudah dipakai")

    const id = randomUUID()
    await db.transaction(async (tx) => {
      await tx.insert(schema.user).values({
        id,
        name: d.name,
        email: `${d.username}@sadc.local`,
        emailVerified: true,
        username: d.username,
        displayUsername: d.username,
        role: d.role,
        poldaId: d.role === "OPERATOR" ? d.poldaId : null,
      })
      await tx.insert(schema.account).values({
        id: randomUUID(),
        accountId: id,
        providerId: "credential",
        userId: id,
        password: await hashPassword(sandi.data),
      })
    })
    await catatAudit(admin.id, "BUAT_PENGGUNA", "user", id, { username: d.username, role: d.role })
    revalidatePath("/admin/pengguna")
    return { ok: true, data: { id } }
  } catch (e) {
    return gagal(e)
  }
}

export async function ubahPengguna(id: string, input: PenggunaInput): Promise<Hasil<null>> {
  try {
    const admin = await requireUser("ADMIN")
    const d = parse(input)
    if (id === admin.id && d.role !== "ADMIN") throw new Error("Anda tidak bisa menurunkan role akun sendiri")
    const bentrok = await db.query.user.findFirst({ where: and(eq(schema.user.username, d.username), ne(schema.user.id, id)) })
    if (bentrok) throw new Error("Username sudah dipakai")
    await db
      .update(schema.user)
      .set({
        name: d.name,
        username: d.username,
        displayUsername: d.username,
        email: `${d.username}@sadc.local`,
        role: d.role,
        poldaId: d.role === "OPERATOR" ? d.poldaId : null,
      })
      .where(eq(schema.user.id, id))
    // paksa login ulang agar role/wilayah baru berlaku
    await db.delete(schema.session).where(eq(schema.session.userId, id))
    await catatAudit(admin.id, "UBAH_PENGGUNA", "user", id, { username: d.username, role: d.role, poldaId: d.poldaId })
    revalidatePath("/admin/pengguna")
    return { ok: true, data: null }
  } catch (e) {
    return gagal(e)
  }
}

export async function setAktifPengguna(id: string, aktif: boolean): Promise<Hasil<null>> {
  try {
    const admin = await requireUser("ADMIN")
    if (id === admin.id) throw new Error("Anda tidak bisa menonaktifkan akun sendiri")
    await db.update(schema.user).set({ aktif }).where(eq(schema.user.id, id))
    if (!aktif) await db.delete(schema.session).where(eq(schema.session.userId, id))
    await catatAudit(admin.id, "UBAH_PENGGUNA", "user", id, { aktif })
    revalidatePath("/admin/pengguna")
    return { ok: true, data: null }
  } catch (e) {
    return gagal(e)
  }
}

export async function resetSandi(id: string, sandiBaru: string): Promise<Hasil<null>> {
  try {
    const admin = await requireUser("ADMIN")
    const s = sandiSchema.safeParse(sandiBaru)
    if (!s.success) throw new Error(s.error.issues[0].message)
    await db
      .update(schema.account)
      .set({ password: await hashPassword(s.data) })
      .where(and(eq(schema.account.userId, id), eq(schema.account.providerId, "credential")))
    await db.delete(schema.session).where(eq(schema.session.userId, id))
    await catatAudit(admin.id, "RESET_SANDI", "user", id)
    return { ok: true, data: null }
  } catch (e) {
    return gagal(e)
  }
}
