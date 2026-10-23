"use server"

import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { headers } from "next/headers"
import { pendataanSchema, type PendataanInput } from "@/lib/pendataan-schema"
import { requireUser } from "../auth"
import { db, schema } from "../db"
import { hariIniDi } from "@/lib/waktu"
import { jalankanVerifikasi } from "../verifikasi"
import { getZona } from "../zona"

type Hasil<T> = { ok: true; data: T } | { ok: false; error: string }

const pad = (n: number, w: number) => String(n).padStart(w, "0")

async function operatorAktif() {
  const user = await requireUser("OPERATOR")
  if (!user.poldaId) throw new Error("Akun operator belum terikat ke Polda")
  return { ...user, poldaId: user.poldaId as number }
}

/** Pastikan pengajuan milik Polda operator & masih bisa diubah. */
async function ambilPengajuanDraf(id: number, poldaId: number) {
  const p = await db.query.pengajuan.findFirst({ where: eq(schema.pengajuan.id, id) })
  if (!p || p.poldaId !== poldaId) throw new Error("Pengajuan tidak ditemukan")
  if (p.status !== "DRAF") throw new Error("Pengajuan yang sudah terverifikasi tidak bisa diubah")
  return p
}

function parse(input: PendataanInput) {
  const r = pendataanSchema.safeParse(input)
  if (!r.success) throw new Error(r.error.issues[0]?.message ?? "Data tidak valid")
  return r.data
}

/** Cek NIK di langkah pertama: data pemohon lama (untuk isi otomatis) & riwayat pengajuan. */
export async function cekNik(nik: string) {
  await operatorAktif()
  if (!/^\d{16}$/.test(nik)) return null
  const pemohon = await db.query.pemohon.findFirst({ where: eq(schema.pemohon.nik, nik) })
  if (!pemohon) return null
  const riwayat = await db
    .select({
      noRegistrasi: schema.pengajuan.noRegistrasi,
      profesi: schema.pengajuan.profesi,
      status: schema.pengajuan.status,
      kartu: schema.kartu.status,
    })
    .from(schema.pengajuan)
    .leftJoin(schema.kartu, eq(schema.kartu.pengajuanId, schema.pengajuan.id))
    .where(eq(schema.pengajuan.pemohonId, pemohon.id))
  const wil = pemohon.kodeDesa ? pemohon.kodeDesa.split(".") : []
  return {
    nama: pemohon.nama,
    tempatLahir: pemohon.tempatLahir ?? "",
    tglLahir: pemohon.tglLahir ?? "",
    jenisKelamin: pemohon.jenisKelamin ?? undefined,
    pendidikan: pemohon.pendidikan ?? "",
    tinggiBadan: pemohon.tinggiBadan ? String(pemohon.tinggiBadan) : "",
    noHp: pemohon.noHp ?? "",
    alamat: pemohon.alamat ?? "",
    provinsi: wil[0] ?? "",
    kabupaten: wil.slice(0, 2).join(".") || "",
    kecamatan: wil.slice(0, 3).join(".") || "",
    kodeDesa: pemohon.kodeDesa ?? "",
    riwayat,
  }
}

/** Jalankan verifikasi tanpa menyimpan (untuk ringkasan di langkah terakhir). */
export async function periksaPendataan(input: PendataanInput, pengajuanId?: number): Promise<Hasil<Awaited<ReturnType<typeof jalankanVerifikasi>>>> {
  try {
    const user = await operatorAktif()
    const data = parse(input)
    return { ok: true, data: await jalankanVerifikasi({ data, pengajuanId, poldaId: user.poldaId, hariIni: hariIniDi(await getZona()) }) }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Gagal memeriksa data" }
  }
}

/**
 * Simpan pendataan (baru atau melengkapi draf). Status ditentukan otomatis:
 * TERVERIFIKASI bila semua aturan lolos, selain itu tetap DRAF dengan daftar kekurangan.
 */
export async function simpanPendataan(
  input: PendataanInput,
  pengajuanId?: number,
): Promise<Hasil<{ id: number; status: "DRAF" | "TERVERIFIKASI"; kekurangan: string[] }>> {
  try {
    const user = await operatorAktif()
    const data = parse(input)
    const lama = pengajuanId ? await ambilPengajuanDraf(pengajuanId, user.poldaId) : null
    const hariIni = hariIniDi(await getZona())
    const ver = await jalankanVerifikasi({ data, pengajuanId, poldaId: user.poldaId, hariIni })
    const status = ver.lolos ? ("TERVERIFIKASI" as const) : ("DRAF" as const)
    const ip = (await headers()).get("x-forwarded-for")?.split(",")[0] ?? null

    const id = await db.transaction(async (tx) => {
      const nilaiPemohon = {
        nama: data.nama,
        tempatLahir: data.tempatLahir ?? null,
        tglLahir: data.tglLahir ?? null,
        jenisKelamin: data.jenisKelamin ?? null,
        pendidikan: data.pendidikan ?? null,
        tinggiBadan: data.tinggiBadan ?? null,
        noHp: data.noHp ?? null,
        alamat: data.alamat ?? null,
        kodeDesa: data.kodeDesa ?? null,
        fotoUrl: data.fotoKey ?? null,
      }
      const [pemohon] = await tx
        .insert(schema.pemohon)
        .values({ nik: data.nik, ...nilaiPemohon })
        .onConflictDoUpdate({ target: schema.pemohon.nik, set: nilaiPemohon })
        .returning({ id: schema.pemohon.id })

      const nilaiPengajuan = {
        pemohonId: pemohon.id,
        profesi: data.profesi,
        jenis: data.jenis,
        perusahaanId: data.perusahaanId ?? null,
        status,
        kekurangan: ver.kekurangan,
        terverifikasiAt: ver.lolos ? new Date() : null,
        fotoUrl: data.fotoKey ?? null,
        ttdUrl: data.ttdKey ?? null,
        sidikJariUrl: data.sidikJariKey ?? null,
      }

      let id: number
      if (lama) {
        id = lama.id
        await tx.update(schema.pengajuan).set(nilaiPengajuan).where(eq(schema.pengajuan.id, id))
      } else {
        const [baru] = await tx
          .insert(schema.pengajuan)
          .values({ ...nilaiPengajuan, noRegistrasi: crypto.randomUUID(), poldaId: user.poldaId, operatorId: user.id })
          .returning({ id: schema.pengajuan.id })
        id = baru.id
        const polda = await tx.query.polda.findFirst({ where: eq(schema.polda.id, user.poldaId) })
        const ym = hariIni.slice(0, 7).replace("-", "")
        await tx
          .update(schema.pengajuan)
          .set({ noRegistrasi: `REG/${polda!.kode}/${ym}/${pad(id, 6)}` })
          .where(eq(schema.pengajuan.id, id))
      }

      // detail profesi
      await tx.delete(schema.detailSatpam).where(eq(schema.detailSatpam.pengajuanId, id))
      await tx.delete(schema.detailDc).where(eq(schema.detailDc.pengajuanId, id))
      if (data.profesi === "SATPAM") {
        await tx.insert(schema.detailSatpam).values({
          pengajuanId: id,
          jenjangGada: data.jenjangGada ?? null,
          noSertifikatGada: data.noSertifikatGada ?? null,
        })
      } else {
        await tx.insert(schema.detailDc).values({
          pengajuanId: id,
          noSppi: data.noSppi ?? null,
          sppiBerlakuSd: data.sppiBerlakuSd ?? null,
          wilayahOperasi: data.wilayahOperasi ?? null,
        })
      }

      // dokumen: ganti seluruhnya dengan isian terbaru
      await tx.delete(schema.dokumen).where(eq(schema.dokumen.pengajuanId, id))
      const dok = Object.entries(data.dokumen)
        .filter(([, d]) => d.fileKey)
        .map(([jenisId, d]) => ({
          pengajuanId: id,
          jenisDokumenId: Number(jenisId),
          fileUrl: d.fileKey!,
          nomor: d.nomor ?? null,
          tglTerbit: d.tglTerbit ?? null,
          berlakuSd: d.berlakuSd ?? null,
        }))
      if (dok.length) await tx.insert(schema.dokumen).values(dok)

      if (!lama || lama.status !== status) {
        await tx.insert(schema.riwayatStatus).values({
          pengajuanId: id,
          dari: lama?.status ?? null,
          ke: status,
          // verifikasi otomatis dicatat sebagai SISTEM (oleh = null)
          oleh: status === "TERVERIFIKASI" ? null : user.id,
          catatan: status === "TERVERIFIKASI" ? "Terverifikasi otomatis: semua persyaratan terpenuhi" : lama ? "Data diperbarui" : "Pendataan dibuat",
          data: { hasil: ver.hasil },
        })
      }
      await tx.insert(schema.auditLog).values({
        userId: user.id,
        aksi: lama ? "UBAH_PENDATAAN" : "BUAT_PENDATAAN",
        entitas: "pengajuan",
        entitasId: String(id),
        ip,
        data: { status, jumlahKekurangan: ver.kekurangan.length },
      })
      return id
    })

    revalidatePath("/operator")
    revalidatePath("/operator/pemohon")
    return { ok: true, data: { id, status, kekurangan: ver.kekurangan } }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Gagal menyimpan"
    return { ok: false, error: msg.includes("pemohon_nik") ? "NIK sudah terdaftar" : msg }
  }
}
