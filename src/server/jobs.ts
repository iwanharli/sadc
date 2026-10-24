import { sql } from "drizzle-orm"
import { db } from "./db"

/**
 * Tandai KTA AKTIF yang masa berlakunya sudah lewat menjadi KEDALUWARSA, dan akhiri
 * blacklist yang masa blokirnya habis. "Hari ini" dihitung di zona waktu Polda masing-masing.
 */
export async function prosesKedaluwarsa() {
  const kartu = await db.execute<{ id: number; pengajuan_id: number; no_kta: string }>(sql`
    update kartu k set status = 'KEDALUWARSA'
      from pengajuan g join polda p on p.id = g.polda_id
     where g.id = k.pengajuan_id
       and k.status = 'AKTIF'
       and k.berlaku_sd < (now() at time zone p.zona_waktu)::date
    returning k.id, k.pengajuan_id, k.no_kta`)

  if (kartu.rows.length) {
    await db.execute(sql`
      insert into riwayat_status (pengajuan_id, dari, ke, oleh, catatan)
      select x.pengajuan_id, 'KTA_AKTIF', 'KTA_KEDALUWARSA', null, 'Masa berlaku KTA ' || x.no_kta || ' habis'
        from jsonb_to_recordset(${JSON.stringify(kartu.rows)}::jsonb) as x(pengajuan_id int, no_kta text)`)
  }

  const blacklist = await db.execute(sql`
    update blacklist set aktif = false
     where aktif and berlaku_sd is not null
       and berlaku_sd < (now() at time zone 'Asia/Jakarta')::date`)

  return { kartu: kartu.rows.length, blacklist: blacklist.rowCount ?? 0 }
}

const ANTREAN = "kedaluwarsa-kta"

/** Jalankan penjadwal pg-boss (dipanggil sekali dari instrumentation.ts). */
export async function mulaiJobs() {
  const { PgBoss } = await import("pg-boss")
  const boss = new PgBoss({ connectionString: process.env.DATABASE_URL!, schema: "pgboss" })
  boss.on("error", (e) => console.error("[jobs]", e))
  await boss.start()
  await boss.createQueue(ANTREAN).catch(() => {})
  // tiap jam (menit ke-5) agar pergantian hari di WIB/WITA/WIT tertangani
  await boss.schedule(ANTREAN, "5 * * * *", {}, { tz: "Asia/Jakarta" })
  await boss.work(ANTREAN, async () => {
    const hasil = await prosesKedaluwarsa()
    if (hasil.kartu || hasil.blacklist) console.log("[jobs] kedaluwarsa:", hasil)
  })
  // jalankan sekali saat start agar data langsung konsisten
  const awal = await prosesKedaluwarsa()
  console.log("[jobs] penjadwal aktif; pemeriksaan awal:", awal)
  return boss
}
