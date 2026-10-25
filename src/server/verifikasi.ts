import { and, eq, inArray, ne, sql } from "drizzle-orm"
import type { PendataanData } from "@/lib/pendataan-schema"
import { PENDIDIKAN_MIN } from "@/lib/pendataan-schema"
import { db, schema } from "./db"
import { hashNik } from "./nik"

/**
 * Mesin verifikasi otomatis. Setiap aturan berdiri sendiri dan mengembalikan
 * daftar kekurangan (kosong = lolos). Data hanya disimpan & KTA diterbitkan bila semua aturan lolos.
 * Aturan bertanda `peringatan` tidak memblokir: temuannya hanya ditampilkan & dicatat untuk ditelusuri.
 * Validator instansi lain (Dukcapil, SKCK online, APPI) nantinya cukup ditambah sebagai aturan baru.
 */
export type Konteks = {
  data: PendataanData
  pengajuanId?: number
  poldaId: number
  hariIni: string // YYYY-MM-DD menurut zona waktu pengguna
}

type Aturan = { kode: string; nama: string; peringatan?: boolean; cek: (k: Konteks) => Promise<string[]> | string[] }

export async function jenisDokumenUntuk(profesi: PendataanData["profesi"]) {
  return db
    .select()
    .from(schema.jenisDokumen)
    .where(and(eq(schema.jenisDokumen.aktif, true), inArray(schema.jenisDokumen.profesi, ["UMUM", profesi])))
    .orderBy(schema.jenisDokumen.urutan)
}

/** Apakah pemohon sudah pernah diterbitkan KTA untuk profesi yang sama (di luar pengajuan ini)? */
export async function adaKtaSebelumnya(nik: string, profesi: PendataanData["profesi"], kecuali?: number) {
  const [row] = await db
    .select({ id: schema.kartu.id })
    .from(schema.kartu)
    .innerJoin(schema.pengajuan, eq(schema.kartu.pengajuanId, schema.pengajuan.id))
    .innerJoin(schema.pemohon, eq(schema.pengajuan.pemohonId, schema.pemohon.id))
    .where(
      and(
        eq(schema.pemohon.nikHash, hashNik(nik)),
        eq(schema.pengajuan.profesi, profesi),
        kecuali ? ne(schema.pengajuan.id, kecuali) : undefined,
      ),
    )
    .limit(1)
  return !!row
}

const umur = (lahir: string, hariIni: string) => {
  const [y1, m1, d1] = lahir.split("-").map(Number)
  const [y2, m2, d2] = hariIni.split("-").map(Number)
  return y2 - y1 - (m2 < m1 || (m2 === m1 && d2 < d1) ? 1 : 0)
}

export const ATURAN: Aturan[] = [
  {
    kode: "BIODATA",
    nama: "Biodata lengkap",
    cek: ({ data, hariIni }) => {
      const k: string[] = []
      if (!data.tempatLahir) k.push("Tempat lahir belum diisi")
      if (!data.tglLahir) k.push("Tanggal lahir belum diisi")
      else if (umur(data.tglLahir, hariIni) < 18) k.push("Usia pemohon belum 18 tahun")
      if (!data.jenisKelamin) k.push("Jenis kelamin belum dipilih")
      if (!data.pendidikan) k.push("Pendidikan terakhir belum dipilih")
      else if (!PENDIDIKAN_MIN.includes(data.pendidikan)) k.push("Pendidikan minimal SMA/SMK sederajat")
      if (!data.noHp) k.push("Nomor HP belum diisi")
      if (!data.alamat) k.push("Alamat belum diisi")
      if (!data.kodeDesa) k.push("Desa/kelurahan belum dipilih")
      return k
    },
  },
  {
    kode: "NIK_WILAYAH",
    nama: "NIK sesuai wilayah alamat KTP",
    // NIK tidak berubah saat pindah domisili, jadi beda wilayah wajar & tidak memblokir
    peringatan: true,
    cek: ({ data }) => {
      if (!data.kodeDesa) return []
      // 6 digit awal NIK = kode provinsi + kab/kota + kecamatan
      const kodeKec = data.kodeDesa.split(".").slice(0, 3).join("")
      return data.nik.startsWith(kodeKec)
        ? []
        : ["6 digit awal NIK berasal dari kecamatan lain (kemungkinan pindah domisili). Pastikan cocok dengan KTP asli."]
    },
  },
  {
    kode: "NIK_GANDA",
    nama: "Tidak ada pengajuan/KTA ganda",
    cek: async ({ data, pengajuanId }) => {
      const k: string[] = []
      const lain = await db
        .select({ status: schema.pengajuan.status, kartu: schema.kartu.status })
        .from(schema.pengajuan)
        .innerJoin(schema.pemohon, eq(schema.pengajuan.pemohonId, schema.pemohon.id))
        .leftJoin(schema.kartu, eq(schema.kartu.pengajuanId, schema.pengajuan.id))
        .where(
          and(
            eq(schema.pemohon.nikHash, hashNik(data.nik)),
            eq(schema.pengajuan.profesi, data.profesi),
            pengajuanId ? ne(schema.pengajuan.id, pengajuanId) : undefined,
          ),
        )
      if (lain.some((r) => r.status !== "DICETAK")) k.push("NIK ini masih memiliki pengajuan lain yang belum selesai")
      if (data.jenis === "BARU" && lain.some((r) => r.kartu === "AKTIF" || r.kartu === "DIBEKUKAN")) {
        k.push("NIK ini sudah memiliki KTA aktif/dibekukan — gunakan jenis Perpanjangan/Penggantian")
      }
      if (lain.some((r) => r.kartu === "DICABUT")) k.push("KTA sebelumnya pernah dicabut — perlu persetujuan Admin")
      return k
    },
  },
  {
    kode: "BLACKLIST",
    nama: "NIK tidak masuk blacklist",
    cek: async ({ data, hariIni }) => {
      const [row] = await db
        .select({ id: schema.blacklist.id })
        .from(schema.blacklist)
        .where(
          and(
            eq(schema.blacklist.nikHash, hashNik(data.nik)),
            eq(schema.blacklist.aktif, true),
            sql`(${schema.blacklist.berlakuSd} is null or ${schema.blacklist.berlakuSd} >= ${hariIni})`,
          ),
        )
        .limit(1)
      return row ? ["NIK masuk daftar blacklist"] : []
    },
  },
  {
    kode: "PERUSAHAAN",
    nama: "Perusahaan valid",
    cek: async ({ data }) => {
      const jenis = data.profesi === "SATPAM" ? "BUJP" : "PEMBIAYAAN"
      const label = data.profesi === "SATPAM" ? "BUJP / perusahaan" : "PJPU"
      if (!data.perusahaanId) return [`${label} belum dipilih`]
      const p = await db.query.perusahaan.findFirst({ where: eq(schema.perusahaan.id, data.perusahaanId) })
      if (!p || p.jenis !== jenis) return [`${label} tidak valid`]
      if (!p.aktif) return [`${label} sudah tidak aktif`]
      return []
    },
  },
  {
    kode: "PROFESI",
    nama: "Data profesi lengkap",
    cek: ({ data, hariIni }) => {
      const k: string[] = []
      if (data.profesi === "SATPAM") {
        if (!data.jenjangGada) k.push("Jenjang Gada belum dipilih")
        if (!data.noSertifikatGada) k.push("Nomor sertifikat Gada belum diisi")
      } else {
        if (!data.noSppi) k.push("Nomor sertifikat SPPI belum diisi")
        if (!data.sppiBerlakuSd) k.push("Masa berlaku SPPI belum diisi")
        else if (data.sppiBerlakuSd < hariIni) k.push("Sertifikat SPPI sudah kedaluwarsa")
      }
      return k
    },
  },
  {
    kode: "DOKUMEN",
    nama: "Dokumen wajib lengkap & berlaku",
    cek: async ({ data, hariIni, pengajuanId }) => {
      const k: string[] = []
      // KTA lama yang sudah tercatat di sistem tidak perlu diunggah ulang
      const ktaTercatat = data.jenis !== "BARU" && (await adaKtaSebelumnya(data.nik, data.profesi, pengajuanId))
      for (const j of await jenisDokumenUntuk(data.profesi)) {
        if (j.kode === "KTA_LAMA" && ktaTercatat) continue
        const wajib = j.wajib && (!j.wajibUntuk?.length || j.wajibUntuk.includes(data.jenis))
        const d = data.dokumen[String(j.id)]
        if (!d?.fileKey) {
          if (wajib) k.push(`${j.nama} belum diunggah`)
          continue
        }
        const tambahan = j.jamak ? (data.dokumenTambahan[String(j.id)] ?? []) : []
        // baris tambahan yang dibiarkan kosong diabaikan
        const isian = [d, ...tambahan.filter((t) => t.fileKey || t.nomor || t.tglTerbit || t.berlakuSd)]
        isian.forEach((x, i) => {
          const nama = isian.length > 1 ? `${j.nama} (berkas ${i + 1})` : j.nama
          if (!x.fileKey) return void k.push(`${nama} belum diunggah`)
          if (!x.nomor) k.push(`Nomor ${nama} belum diisi`)
          if (j.adaMasaBerlaku) {
            if (!x.berlakuSd) k.push(`Masa berlaku ${nama} belum diisi`)
            else if (x.berlakuSd < hariIni) k.push(`${nama} sudah kedaluwarsa`)
          }
        })
      }
      return k
    },
  },
  {
    kode: "BIOMETRIK",
    nama: "Biometrik lengkap",
    cek: ({ data }) => {
      const k: string[] = []
      if (!data.fotoKey) k.push("Foto wajah belum direkam")
      if (!data.sidikJariKey) k.push("Sidik jari belum direkam")
      if (!data.ttdKey) k.push("Tanda tangan belum direkam")
      return k
    },
  },
]

export type HasilAturan = { kode: string; nama: string; peringatan: boolean; kekurangan: string[] }

export async function jalankanVerifikasi(k: Konteks) {
  const hasil: HasilAturan[] = []
  for (const a of ATURAN) hasil.push({ kode: a.kode, nama: a.nama, peringatan: !!a.peringatan, kekurangan: await a.cek(k) })
  const kekurangan = hasil.filter((h) => !h.peringatan).flatMap((h) => h.kekurangan)
  const peringatan = hasil.filter((h) => h.peringatan).flatMap((h) => h.kekurangan)
  return { lolos: kekurangan.length === 0, kekurangan, peringatan, hasil }
}


