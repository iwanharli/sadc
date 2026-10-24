"use server"

import { and, eq, ne } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { jenisDokumenSchema, perusahaanSchema, type JenisDokumenInput, type PerusahaanInput } from "@/lib/master-schema"
import { catatAudit } from "../audit"
import { requireUser } from "../auth"
import { db, schema } from "../db"

type Hasil = { ok: true } | { ok: false; error: string }
const gagal = (e: unknown): Hasil => ({ ok: false, error: e instanceof Error ? e.message : "Gagal menyimpan" })

/** Simpan (tambah/ubah) jenis dokumen persyaratan. Dokumen tidak dihapus, cukup dinonaktifkan. */
export async function simpanJenisDokumen(input: JenisDokumenInput, id?: number): Promise<Hasil> {
  try {
    const admin = await requireUser("ADMIN")
    const r = jenisDokumenSchema.safeParse(input)
    if (!r.success) throw new Error(r.error.issues[0]?.message)
    const d = { ...r.data, wajibUntuk: r.data.wajibUntuk.length ? r.data.wajibUntuk : null }
    const bentrok = await db.query.jenisDokumen.findFirst({
      where: and(eq(schema.jenisDokumen.kode, d.kode), eq(schema.jenisDokumen.profesi, d.profesi), id ? ne(schema.jenisDokumen.id, id) : undefined),
    })
    if (bentrok) throw new Error("Kode dokumen sudah dipakai untuk profesi ini")
    if (id) await db.update(schema.jenisDokumen).set(d).where(eq(schema.jenisDokumen.id, id))
    else await db.insert(schema.jenisDokumen).values(d)
    await catatAudit(admin.id, "UBAH_MASTER", "jenis_dokumen", id ?? null, { kode: d.kode, aktif: d.aktif })
    revalidatePath("/admin/master/dokumen")
    return { ok: true }
  } catch (e) {
    return gagal(e)
  }
}

export async function simpanPerusahaan(input: PerusahaanInput, id?: number): Promise<Hasil> {
  try {
    const admin = await requireUser("ADMIN")
    const r = perusahaanSchema.safeParse(input)
    if (!r.success) throw new Error(r.error.issues[0]?.message)
    const d = { ...r.data, nib: r.data.nib || null, noIzin: r.data.noIzin || null, alamat: r.data.alamat || null }
    if (id) await db.update(schema.perusahaan).set(d).where(eq(schema.perusahaan.id, id))
    else await db.insert(schema.perusahaan).values(d)
    await catatAudit(admin.id, "UBAH_MASTER", "perusahaan", id ?? null, { nama: d.nama, aktif: d.aktif })
    revalidatePath("/admin/perusahaan")
    return { ok: true }
  } catch (e) {
    return gagal(e)
  }
}
