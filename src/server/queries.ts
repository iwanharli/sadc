import { count, eq, sql } from "drizzle-orm"
import { db, schema } from "./db"

const { pengajuan, kartu, polda } = schema

export async function getPoldaNama(poldaId: number | null | undefined) {
  if (!poldaId) return null
  const row = await db.query.polda.findFirst({ where: eq(polda.id, poldaId) })
  return row?.nama ?? null
}

/** Daftar akun aktif untuk modal login demo (hanya bila DEMO_LOGIN=true). */
export async function getDemoAccounts() {
  if (process.env.DEMO_LOGIN !== "true") return null
  const rows = await db
    .select({
      username: schema.user.username,
      name: schema.user.name,
      role: schema.user.role,
      wilayah: polda.nama,
    })
    .from(schema.user)
    .leftJoin(polda, eq(schema.user.poldaId, polda.id))
    .where(eq(schema.user.aktif, true))
    .orderBy(schema.user.role, schema.user.username)
  return rows.filter((r): r is typeof r & { username: string } => !!r.username)
}

/** Ringkasan jumlah pendataan; poldaId kosong = nasional. */
export async function getRingkasan(poldaId?: number | null) {
  const filter = poldaId ? eq(pengajuan.poldaId, poldaId) : undefined

  const [p] = await db
    .select({
      total: count(),
      draf: sql<number>`count(*) filter (where ${pengajuan.status} = 'DRAF')`.mapWith(Number),
      menungguCetak: sql<number>`count(*) filter (where ${pengajuan.status} = 'TERVERIFIKASI')`.mapWith(Number),
      satpam: sql<number>`count(*) filter (where ${pengajuan.profesi} = 'SATPAM')`.mapWith(Number),
      dc: sql<number>`count(*) filter (where ${pengajuan.profesi} = 'DEBT_COLLECTOR')`.mapWith(Number),
    })
    .from(pengajuan)
    .where(filter)

  const [k] = await db
    .select({
      aktif: sql<number>`count(*) filter (where ${kartu.status} = 'AKTIF')`.mapWith(Number),
      dibekukan: sql<number>`count(*) filter (where ${kartu.status} = 'DIBEKUKAN')`.mapWith(Number),
      dicabut: sql<number>`count(*) filter (where ${kartu.status} = 'DICABUT')`.mapWith(Number),
      segeraKedaluwarsa: sql<number>`count(*) filter (where ${kartu.status} = 'AKTIF' and ${kartu.berlakuSd} <= current_date + 30)`.mapWith(Number),
    })
    .from(kartu)
    .innerJoin(pengajuan, eq(kartu.pengajuanId, pengajuan.id))
    .where(filter)

  return { ...p, ...k }
}

/** Jumlah pendataan per hari & profesi untuk `hari` terakhir (dikelompokkan di zona `tz`), plus pembanding periode sebelumnya. */
export async function getTren(hari: number, poldaId?: number | null, tz = "Asia/Jakarta") {
  // kolom ditulis manual karena query memakai alias tabel
  const wilayah = poldaId ? sql`and polda_id = ${poldaId}` : sql``
  const rows = await db.execute<{ tgl: string; satpam: number; dc: number }>(sql`
    with hari as (
      select generate_series(
        (now() at time zone ${tz})::date - (${hari}::int - 1),
        (now() at time zone ${tz})::date,
        interval '1 day'
      )::date as tgl
    )
    select to_char(h.tgl, 'YYYY-MM-DD') as tgl,
           count(p.id) filter (where p.profesi = 'SATPAM')::int as satpam,
           count(p.id) filter (where p.profesi = 'DEBT_COLLECTOR')::int as dc
      from hari h
      left join ${pengajuan} p
        on (p.created_at at time zone 'UTC' at time zone ${tz})::date = h.tgl
       and (${poldaId ?? null}::int is null or p.polda_id = ${poldaId ?? null}::int)
     group by h.tgl
     order by h.tgl`)

  const [sebelum] = (
    await db.execute<{ n: number }>(sql`
      select count(*)::int as n from ${pengajuan}
       where created_at >= now() - make_interval(days => ${hari * 2}::int)
         and created_at <  now() - make_interval(days => ${hari}::int) ${wilayah}`)
  ).rows

  const data = rows.rows
  const total = data.reduce((a, d) => a + d.satpam + d.dc, 0)
  const perubahan = sebelum.n > 0 ? ((total - sebelum.n) / sebelum.n) * 100 : null
  return { data, total, sebelum: sebelum.n, perubahan, rataHarian: total / hari }
}

/** Pendataan terbaru beserta nama pemohon & Polda. */
export async function getPendataanTerbaru(limit: number, poldaId?: number | null) {
  return db
    .select({
      id: pengajuan.id,
      noRegistrasi: pengajuan.noRegistrasi,
      profesi: pengajuan.profesi,
      status: pengajuan.status,
      createdAt: pengajuan.createdAt,
      nama: schema.pemohon.nama,
      polda: polda.nama,
    })
    .from(pengajuan)
    .innerJoin(schema.pemohon, eq(pengajuan.pemohonId, schema.pemohon.id))
    .innerJoin(polda, eq(pengajuan.poldaId, polda.id))
    .where(poldaId ? eq(pengajuan.poldaId, poldaId) : undefined)
    .orderBy(sql`${pengajuan.createdAt} desc`)
    .limit(limit)
}

export async function getRekapPerPolda() {
  return db
    .select({
      id: polda.id,
      nama: polda.nama,
      provinsiKode: polda.provinsiKode,
      satpam: sql<number>`count(${pengajuan.id}) filter (where ${pengajuan.profesi} = 'SATPAM')`.mapWith(Number),
      dc: sql<number>`count(${pengajuan.id}) filter (where ${pengajuan.profesi} = 'DEBT_COLLECTOR')`.mapWith(Number),
      total: count(pengajuan.id),
    })
    .from(polda)
    .leftJoin(pengajuan, eq(pengajuan.poldaId, polda.id))
    .groupBy(polda.id, polda.nama, polda.provinsiKode)
    .orderBy(polda.id)
}
