import "server-only"
import { sql, type SQL } from "drizzle-orm"
import { db } from "./db"
import { halaman, paramPilihan, paramUmum, syaratKursor, GalatParam } from "./integrasi"
import { dekripsiNik } from "./nik"

/**
 * Query untuk endpoint /api/integration/*. Semua nilai waktu & tanggal diubah ke teks di SQL
 * agar tidak terpengaruh parser tanggal driver (timestamp disimpan UTC tanpa zona).
 */
const ISO = (kolom: SQL) => sql`to_char(${kolom}, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`
const where = (s: SQL[]) => (s.length ? sql`where ${sql.join(s, sql` and `)}` : sql``)

type Baris = { _t: string; _id: number } & Record<string, unknown>

async function ambil(q: SQL) {
  return (await db.execute<Baris>(q)).rows
}

const buang = <R extends Baris>({ _t, _id, ...r }: R) => (void _t, void _id, r)

export async function companies(url: URL) {
  const p = paramUmum(url)
  const w = syaratKursor(sql`c.updated_at`, sql`c.id`, p)
  if (p.polda) w.push(sql`d.kode = ${p.polda}`)
  const rows = await ambil(sql`
    select c.updated_at::text as _t, c.id as _id,
           'PSH-' || c.id as id, c.nama, c.nib, c.jenis, c.no_izin as "noIzin", d.kode as "poldaKode", c.aktif,
           ${ISO(sql`c.updated_at`)} as "updatedAt", false as deleted
      from perusahaan c left join polda d on d.id = c.polda_id
      ${where(w)}
     order by c.updated_at, c.id limit ${p.limit + 1}`)
  const { isi, nextCursor } = halaman(rows, p.limit)
  return { data: isi.map(buang), nextCursor }
}

/** Satu baris per pengajuan (pemohon = orang; satu NIK bisa punya banyak pengajuan). */
export async function applicants(url: URL) {
  const p = paramUmum(url)
  const waktu = sql`greatest(g.updated_at, m.updated_at)`
  const w = syaratKursor(waktu, sql`g.id`, p)
  if (p.polda) w.push(sql`d.kode = ${p.polda}`)
  const profesi = paramPilihan(url, "profesi", ["SATPAM", "DEBT_COLLECTOR"] as const)
  if (profesi) w.push(sql`g.profesi = ${profesi}`)
  const jenis = paramPilihan(url, "jenis", ["BARU", "PERPANJANGAN", "PENGGANTIAN"] as const)
  if (jenis) w.push(sql`g.jenis = ${jenis}`)
  const status = paramPilihan(url, "status", ["TERVERIFIKASI", "DICETAK"] as const)
  if (status) w.push(sql`g.status = ${status}`)
  // from/to = tanggal dibuat (YYYY-MM-DD) menurut WIB
  for (const [nama, op] of [["from", sql`>=`], ["to", sql`<=`]] as const) {
    const v = url.searchParams.get(nama)
    if (!v) continue
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) throw new GalatParam(`${nama} harus YYYY-MM-DD`)
    w.push(sql`(g.created_at at time zone 'UTC' at time zone 'Asia/Jakarta')::date ${op} ${v}::date`)
  }

  const rows = await ambil(sql`
    select ${waktu}::text as _t, g.id as _id,
           'PGJ-' || g.id as id, 'PMH-' || m.id as "pemohonId", g.no_registrasi as "noRegistrasi",
           m.nama, m.nik_enc as "_nikEnc", m.nik as "_nik",
           m.jenis_kelamin as "jenisKelamin", m.tgl_lahir::text as "tglLahir", m.pendidikan,
           m.kode_desa as "kodeDesa",
           g.profesi, g.jenis, g.status,
           case when g.perusahaan_id is null then null else 'PSH-' || g.perusahaan_id end as "perusahaanId",
           d.kode as "poldaKode",
           (select 'KTA-' || k.id from kartu k where k.pengajuan_id = g.id order by k.id desc limit 1) as "kartuId",
           ${ISO(sql`g.created_at`)} as dibuat,
           case when g.profesi = 'SATPAM'
             then jsonb_build_object('gada', s.jenjang_gada, 'noSertifikatGada', s.no_sertifikat_gada)
             else jsonb_build_object('noSppi', c.no_sppi, 'sppiBerlakuSampai', c.sppi_berlaku_sd::text, 'wilayahOperasi', c.wilayah_operasi)
           end as "detailProfesi",
           ${ISO(waktu)} as "updatedAt", false as deleted
      from pengajuan g
      join pemohon m on m.id = g.pemohon_id
      join polda d on d.id = g.polda_id
      left join detail_satpam s on s.pengajuan_id = g.id
      left join detail_dc c on c.pengajuan_id = g.id
      ${where(w)}
     order by ${waktu}, g.id limit ${p.limit + 1}`)
  const { isi, nextCursor } = halaman(rows, p.limit)
  return {
    data: isi.map((r) => {
      const { _nikEnc, _nik, ...lain } = buang(r)
      const { nama, pemohonId, noRegistrasi, ...sisa } = lain
      return { id: lain.id, pemohonId, noRegistrasi, nama, nik: dekripsiNik(_nikEnc as string | null) || (_nik as string | null) || null, ...sisa }
    }),
    nextCursor,
  }
}

export async function cards(url: URL) {
  const p = paramUmum(url)
  const w = syaratKursor(sql`k.updated_at`, sql`k.id`, p)
  if (p.polda) w.push(sql`d.kode = ${p.polda}`)
  const status = paramPilihan(url, "status", ["AKTIF", "DIBEKUKAN", "DICABUT", "KEDALUWARSA"] as const)
  if (status) w.push(sql`k.status = ${status}`)
  const rows = await ambil(sql`
    select k.updated_at::text as _t, k.id as _id,
           'KTA-' || k.id as id, k.no_kta as nomor, 'PGJ-' || g.id as "pengajuanId", 'PMH-' || g.pemohon_id as "pemohonId",
           g.profesi, d.kode as "poldaKode",
           k.terbit_at::text as terbit, k.berlaku_sd::text as "berlakuSampai", k.status,
           coalesce((
             select jsonb_agg(jsonb_build_object(
                      'jenis', x.jenis, 'alasan', x.alasan, 'keterangan', x.keterangan,
                      'tanggal', ${ISO(sql`x.at`)}, 'berlakuSampai', x.berlaku_sd::text) order by x.at)
               from sanksi x where x.kartu_id = k.id), '[]'::jsonb) as sanksi,
           ${ISO(sql`k.updated_at`)} as "updatedAt", false as deleted
      from kartu k
      join pengajuan g on g.id = k.pengajuan_id
      join polda d on d.id = g.polda_id
      ${where(w)}
     order by k.updated_at, k.id limit ${p.limit + 1}`)
  const { isi, nextCursor } = halaman(rows, p.limit)
  return { data: isi.map(buang), nextCursor }
}

/** Nama, profesi & Polda diambil dari KTA yang dicabut dan menyebabkan blacklist. */
export async function blacklist(url: URL) {
  const p = paramUmum(url)
  const w = syaratKursor(sql`b.updated_at`, sql`b.id`, p)
  if (p.polda) w.push(sql`d.kode = ${p.polda}`)
  const rows = await ambil(sql`
    select b.updated_at::text as _t, b.id as _id,
           'BL-' || b.id as id, m.nama, b.nik_enc as "_nikEnc", b.nik as "_nik",
           b.alasan, (b.created_at at time zone 'UTC' at time zone 'Asia/Jakarta')::date::text as sejak,
           b.berlaku_sd::text as "berlakuSampai", b.aktif,
           g.profesi, d.kode as "poldaKode",
           case when k.id is null then null else 'KTA-' || k.id end as "kartuId",
           ${ISO(sql`b.updated_at`)} as "updatedAt", false as deleted
      from blacklist b
      left join sanksi x on x.id = b.sanksi_id
      left join kartu k on k.id = x.kartu_id
      left join pengajuan g on g.id = k.pengajuan_id
      left join pemohon m on m.id = g.pemohon_id
      left join polda d on d.id = g.polda_id
      ${where(w)}
     order by b.updated_at, b.id limit ${p.limit + 1}`)
  const { isi, nextCursor } = halaman(rows, p.limit)
  return {
    data: isi.map((r) => {
      const { _nikEnc, _nik, id, nama, ...sisa } = buang(r)
      return { id, nama, nik: dekripsiNik(_nikEnc as string | null) || (_nik as string | null) || null, ...sisa }
    }),
    nextCursor,
  }
}

/** Seluruh jenis dokumen (termasuk nonaktif); tanpa paginasi. */
export async function documentRequirements() {
  const rows = await db.execute(sql`
    select kode, nama, profesi, wajib, wajib_untuk::text[] as "wajibUntuk", ada_masa_berlaku as "adaMasaBerlaku",
           jamak as "bolehLebihDariSatu", aktif, urutan
      from jenis_dokumen order by urutan, id`)
  return { data: rows.rows, nextCursor: null }
}
