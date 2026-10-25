"use server"

import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { headers } from "next/headers"
import { pendataanSchema, type PendataanInput } from "@/lib/pendataan-schema"
import { requireUser } from "../auth"
import { db, schema } from "../db"
import { hariIniDi } from "@/lib/waktu"
import { hashNik, kolomNik } from "../nik"
import { terbitkanKartu } from "../kartu-terbit"
import { jalankanVerifikasi } from "../verifikasi"
import { getZona } from "../zona"

type Hasil<T> = { ok: true; data: T } | { ok: false; error: string }

const pad = (n: number, w: number) => String(n).padStart(w, "0")

async function operatorAktif() {
  const user = await requireUser("OPERATOR")
  if (!user.poldaId) throw new Error("Akun operator belum terikat ke Polda")
  return { ...user, poldaId: user.poldaId as number }
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
  const pemohon = await db.query.pemohon.findFirst({ where: eq(schema.pemohon.nikHash, hashNik(nik)) })
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
export async function periksaPendataan(input: PendataanInput): Promise<Hasil<Awaited<ReturnType<typeof jalankanVerifikasi>>>> {
  try {
    const user = await operatorAktif()
    const data = parse(input)
    return { ok: true, data: await jalankanVerifikasi({ data, poldaId: user.poldaId, hariIni: hariIniDi(await getZona()) }) }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Gagal memeriksa data" }
  }
}

/**
 * Simpan pendataan. Data WAJIB lengkap: bila verifikasi otomatis gagal, tidak ada yang disimpan
 * dan daftar kekurangan dikembalikan. Bila lolos, pengajuan tersimpan dan KTA langsung diterbitkan.
 */
export async function simpanPendataan(
  input: PendataanInput,
): Promise<
  | { ok: true; data: { id: number; kartuId: number; noKta: string } }
  | { ok: false; error: string; kekurangan?: string[] }
> {
  try {
    const user = await operatorAktif()
    const data = parse(input)
    const hariIni = hariIniDi(await getZona())
    const ver = await jalankanVerifikasi({ data, poldaId: user.poldaId, hariIni })
    if (!ver.lolos) {
      return { ok: false, error: `Data belum lengkap (${ver.kekurangan.length} kekurangan)`, kekurangan: ver.kekurangan }
    }
    const ip = (await headers()).get("x-forwarded-for")?.split(",")[0] ?? null
    const polda = (await db.query.polda.findFirst({ where: eq(schema.polda.id, user.poldaId) }))!

    const hasil = await db.transaction(async (tx) => {
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
        .values({ ...kolomNik(data.nik), ...nilaiPemohon })
        .onConflictDoUpdate({ target: schema.pemohon.nikHash, set: nilaiPemohon })
        .returning({ id: schema.pemohon.id })

      const [baru] = await tx
        .insert(schema.pengajuan)
        .values({
          noRegistrasi: crypto.randomUUID(),
          pemohonId: pemohon.id,
          profesi: data.profesi,
          jenis: data.jenis,
          perusahaanId: data.perusahaanId ?? null,
          poldaId: user.poldaId,
          operatorId: user.id,
          status: "TERVERIFIKASI",
          kekurangan: [],
          terverifikasiAt: new Date(),
          fotoUrl: data.fotoKey ?? null,
          ttdUrl: data.ttdKey ?? null,
          sidikJariUrl: data.sidikJariKey ?? null,
        })
        .returning({ id: schema.pengajuan.id })
      const id = baru.id
      await tx
        .update(schema.pengajuan)
        .set({ noRegistrasi: `REG/${polda.kode}/${hariIni.slice(0, 7).replace("-", "")}/${pad(id, 6)}` })
        .where(eq(schema.pengajuan.id, id))

      if (data.profesi === "SATPAM") {
        await tx.insert(schema.detailSatpam).values({ pengajuanId: id, jenjangGada: data.jenjangGada ?? null, noSertifikatGada: data.noSertifikatGada ?? null })
      } else {
        await tx.insert(schema.detailDc).values({
          pengajuanId: id,
          noSppi: data.noSppi ?? null,
          sppiBerlakuSd: data.sppiBerlakuSd ?? null,
          wilayahOperasi: data.wilayahOperasi ?? null,
        })
      }
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

      const kartu = await terbitkanKartu(tx, {
        pengajuanId: id,
        pemohonId: pemohon.id,
        profesi: data.profesi,
        poldaKode: polda.kode,
        operatorId: user.id,
        terbit: hariIni,
      })
      await tx.insert(schema.riwayatStatus).values({
        pengajuanId: id,
        ke: "DICETAK",
        oleh: null,
        catatan: `Terverifikasi otomatis & KTA ${kartu.noKta} diterbitkan${kartu.diganti ? `; ${kartu.diganti} KTA lama digantikan` : ""}`,
        data: { hasil: ver.hasil },
      })
      await tx.insert(schema.auditLog).values({
        userId: user.id,
        aksi: "BUAT_PENDATAAN",
        entitas: "pengajuan",
        entitasId: String(id),
        ip,
        data: { jenis: data.jenis, noKta: kartu.noKta, ...(ver.peringatan.length ? { peringatan: ver.peringatan } : {}) },
      })
      return { id, kartuId: kartu.kartuId, noKta: kartu.noKta }
    })

    revalidatePath("/operator")
    revalidatePath("/operator/satpam")
    revalidatePath("/operator/penagih-utang")
    return { ok: true, data: hasil }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Gagal menyimpan"
    return { ok: false, error: msg.includes("nik_hash") ? "NIK sudah terdaftar" : msg }
  }
}
