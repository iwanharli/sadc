import "server-only"
import { and, count, desc, eq, ilike, inArray, or, type SQL } from "drizzle-orm"
import type { PendataanInput } from "@/lib/pendataan-schema"
import { db, schema } from "./db"

/** Data awal formulir untuk melengkapi draf. */
export async function muatPendataan(id: number, poldaId: number): Promise<PendataanInput | null> {
  const p = await db.query.pengajuan.findFirst({ where: and(eq(schema.pengajuan.id, id), eq(schema.pengajuan.poldaId, poldaId)) })
  if (!p) return null
  const pemohon = (await db.query.pemohon.findFirst({ where: eq(schema.pemohon.id, p.pemohonId) }))!
  const sat = await db.query.detailSatpam.findFirst({ where: eq(schema.detailSatpam.pengajuanId, id) })
  const dc = await db.query.detailDc.findFirst({ where: eq(schema.detailDc.pengajuanId, id) })
  const dok = await db.select().from(schema.dokumen).where(eq(schema.dokumen.pengajuanId, id))
  const wil = pemohon.kodeDesa ? pemohon.kodeDesa.split(".") : []
  return {
    profesi: p.profesi,
    jenis: p.jenis,
    nik: pemohon.nik,
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
    perusahaanId: p.perusahaanId ? String(p.perusahaanId) : "",
    jenjangGada: sat?.jenjangGada ?? undefined,
    noSertifikatGada: sat?.noSertifikatGada ?? "",
    noSppi: dc?.noSppi ?? "",
    sppiBerlakuSd: dc?.sppiBerlakuSd ?? "",
    wilayahOperasi: dc?.wilayahOperasi ?? "",
    dokumen: Object.fromEntries(
      dok.map((d) => [
        String(d.jenisDokumenId),
        { fileKey: d.fileUrl, nomor: d.nomor ?? "", tglTerbit: d.tglTerbit ?? "", berlakuSd: d.berlakuSd ?? "" },
      ]),
    ),
    fotoKey: p.fotoUrl ?? "",
    ttdKey: p.ttdUrl ?? "",
    sidikJariKey: p.sidikJariUrl ?? "",
  }
}

/** Opsi formulir: perusahaan aktif di Polda operator & jenis dokumen aktif. */
export async function opsiFormulir(poldaId: number) {
  const [perusahaan, jenisDokumen] = await Promise.all([
    db
      .select({ id: schema.perusahaan.id, nama: schema.perusahaan.nama, jenis: schema.perusahaan.jenis })
      .from(schema.perusahaan)
      .where(and(eq(schema.perusahaan.poldaId, poldaId), eq(schema.perusahaan.aktif, true)))
      .orderBy(schema.perusahaan.nama),
    db
      .select({
        id: schema.jenisDokumen.id,
        nama: schema.jenisDokumen.nama,
        profesi: schema.jenisDokumen.profesi,
        wajib: schema.jenisDokumen.wajib,
        wajibUntuk: schema.jenisDokumen.wajibUntuk,
        adaMasaBerlaku: schema.jenisDokumen.adaMasaBerlaku,
      })
      .from(schema.jenisDokumen)
      .where(eq(schema.jenisDokumen.aktif, true))
      .orderBy(schema.jenisDokumen.urutan),
  ])
  return { perusahaan, jenisDokumen }
}

export type FilterPemohon = {
  poldaId?: number | null
  q?: string
  status?: "DRAF" | "TERVERIFIKASI" | "DICETAK"
  profesi?: "SATPAM" | "DEBT_COLLECTOR"
  page?: number
  perPage?: number
}

/** Daftar pengajuan + pemohon dengan pencarian, filter & paginasi di server. */
export async function daftarPemohon(f: FilterPemohon) {
  const perPage = f.perPage ?? 20
  const page = Math.max(1, f.page ?? 1)
  const kondisi: (SQL | undefined)[] = [
    f.poldaId ? eq(schema.pengajuan.poldaId, f.poldaId) : undefined,
    f.status ? eq(schema.pengajuan.status, f.status) : undefined,
    f.profesi ? eq(schema.pengajuan.profesi, f.profesi) : undefined,
  ]
  const q = f.q?.trim()
  if (q) {
    kondisi.push(
      /^\d+$/.test(q)
        ? ilike(schema.pemohon.nik, `${q}%`)
        : or(ilike(schema.pemohon.nama, `%${q}%`), ilike(schema.pengajuan.noRegistrasi, `%${q}%`)),
    )
  }
  const where = and(...kondisi)

  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        id: schema.pengajuan.id,
        noRegistrasi: schema.pengajuan.noRegistrasi,
        profesi: schema.pengajuan.profesi,
        jenis: schema.pengajuan.jenis,
        status: schema.pengajuan.status,
        kekurangan: schema.pengajuan.kekurangan,
        createdAt: schema.pengajuan.createdAt,
        nik: schema.pemohon.nik,
        nama: schema.pemohon.nama,
        perusahaan: schema.perusahaan.nama,
        polda: schema.polda.nama,
        kartu: schema.kartu.status,
      })
      .from(schema.pengajuan)
      .innerJoin(schema.pemohon, eq(schema.pengajuan.pemohonId, schema.pemohon.id))
      .innerJoin(schema.polda, eq(schema.pengajuan.poldaId, schema.polda.id))
      .leftJoin(schema.perusahaan, eq(schema.pengajuan.perusahaanId, schema.perusahaan.id))
      .leftJoin(schema.kartu, eq(schema.kartu.pengajuanId, schema.pengajuan.id))
      .where(where)
      .orderBy(desc(schema.pengajuan.createdAt))
      .limit(perPage)
      .offset((page - 1) * perPage),
    db
      .select({ total: count() })
      .from(schema.pengajuan)
      .innerJoin(schema.pemohon, eq(schema.pengajuan.pemohonId, schema.pemohon.id))
      .where(where),
  ])
  return { rows, total, page, perPage, pages: Math.max(1, Math.ceil(total / perPage)) }
}

/** Detail lengkap satu pengajuan (dibatasi Polda bila poldaId diisi). */
export async function detailPengajuan(id: number, poldaId?: number | null) {
  const p = await db.query.pengajuan.findFirst({
    where: and(eq(schema.pengajuan.id, id), poldaId ? eq(schema.pengajuan.poldaId, poldaId) : undefined),
  })
  if (!p) return null
  const [pemohon, polda, perusahaan, operator, sat, dc, kartu, dokumen, riwayat] = await Promise.all([
    db.query.pemohon.findFirst({ where: eq(schema.pemohon.id, p.pemohonId) }),
    db.query.polda.findFirst({ where: eq(schema.polda.id, p.poldaId) }),
    p.perusahaanId ? db.query.perusahaan.findFirst({ where: eq(schema.perusahaan.id, p.perusahaanId) }) : null,
    db.query.user.findFirst({ where: eq(schema.user.id, p.operatorId), columns: { name: true } }),
    db.query.detailSatpam.findFirst({ where: eq(schema.detailSatpam.pengajuanId, id) }),
    db.query.detailDc.findFirst({ where: eq(schema.detailDc.pengajuanId, id) }),
    db.query.kartu.findFirst({ where: eq(schema.kartu.pengajuanId, id) }),
    db
      .select({
        id: schema.dokumen.id,
        nama: schema.jenisDokumen.nama,
        fileUrl: schema.dokumen.fileUrl,
        nomor: schema.dokumen.nomor,
        tglTerbit: schema.dokumen.tglTerbit,
        berlakuSd: schema.dokumen.berlakuSd,
      })
      .from(schema.dokumen)
      .innerJoin(schema.jenisDokumen, eq(schema.dokumen.jenisDokumenId, schema.jenisDokumen.id))
      .where(eq(schema.dokumen.pengajuanId, id))
      .orderBy(schema.jenisDokumen.urutan),
    db
      .select({
        id: schema.riwayatStatus.id,
        dari: schema.riwayatStatus.dari,
        ke: schema.riwayatStatus.ke,
        catatan: schema.riwayatStatus.catatan,
        at: schema.riwayatStatus.at,
        oleh: schema.user.name,
      })
      .from(schema.riwayatStatus)
      .leftJoin(schema.user, eq(schema.riwayatStatus.oleh, schema.user.id))
      .where(eq(schema.riwayatStatus.pengajuanId, id))
      .orderBy(desc(schema.riwayatStatus.at)),
  ])
  // nama desa, kecamatan, kab/kota, provinsi dari kode desa
  const kode = pemohon?.kodeDesa?.split(".") ?? []
  const wilayahRows = kode.length
    ? await db
        .select({ nama: schema.wilayah.nama, level: schema.wilayah.level })
        .from(schema.wilayah)
        .where(inArray(schema.wilayah.kode, [1, 2, 3, 4].map((n) => kode.slice(0, n).join("."))))
        .orderBy(desc(schema.wilayah.level))
    : []
  return {
    pengajuan: p,
    pemohon: pemohon!,
    polda: polda!,
    perusahaan,
    operator: operator?.name ?? "-",
    satpam: sat,
    dc,
    kartu,
    dokumen,
    riwayat,
    wilayah: wilayahRows.map((r) => r.nama).join(", ") || null,
  }
}
