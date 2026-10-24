import "server-only"
import { sql } from "drizzle-orm"
import { db } from "./db"

const sejak = (hari: number) => sql`now() - make_interval(days => ${hari}::int)`

/** Pendataan per perusahaan dalam periode, plus KTA aktif saat ini. */
export async function rekapPerusahaan(hari: number, batas = 50) {
  const r = await db.execute<{
    id: number
    nama: string
    jenis: "BUJP" | "PEMBIAYAAN"
    polda: string
    pendataan: number
    terbit: number
    aktif: number
  }>(sql`
    select pr.id, pr.nama, pr.jenis, pd.nama as polda,
           count(g.id) filter (where g.created_at >= ${sejak(hari)})::int as pendataan,
           count(k.id) filter (where k.dicetak_at >= ${sejak(hari)})::int as terbit,
           count(k.id) filter (where k.status = 'AKTIF')::int as aktif
      from perusahaan pr
      join polda pd on pd.id = pr.polda_id
      left join pengajuan g on g.perusahaan_id = pr.id
      left join kartu k on k.pengajuan_id = g.id
     group by pr.id, pd.nama
    having count(g.id) > 0
     order by pendataan desc, aktif desc
     limit ${batas}`)
  return r.rows
}

/** Kinerja operator dalam periode: pendataan, terverifikasi, KTA diterbitkan, sanksi. */
export async function kinerjaOperator(hari: number) {
  const r = await db.execute<{
    id: string
    nama: string
    username: string
    polda: string | null
    aktif: boolean
    pendataan: number
    terverifikasi: number
    draf: number
    terbit: number
    sanksi: number
  }>(sql`
    select u.id, u.name as nama, u.username, pd.nama as polda, u.aktif,
           (select count(*)::int from pengajuan g where g.operator_id = u.id and g.created_at >= ${sejak(hari)}) as pendataan,
           (select count(*)::int from pengajuan g where g.operator_id = u.id and g.terverifikasi_at >= ${sejak(hari)}) as terverifikasi,
           (select count(*)::int from pengajuan g where g.operator_id = u.id and g.status = 'DRAF') as draf,
           (select count(*)::int from kartu k where k.dicetak_by = u.id and k.dicetak_at >= ${sejak(hari)}) as terbit,
           (select count(*)::int from sanksi s where s.oleh = u.id and s.at >= ${sejak(hari)}) as sanksi
      from "user" u
      left join polda pd on pd.id = u.polda_id
     where u.role = 'OPERATOR'
     order by pendataan desc, terbit desc, u.name`)
  return r.rows
}
