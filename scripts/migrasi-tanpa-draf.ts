/**
 * Penyesuaian alur "tanpa draf & tanpa antrean cetak" untuk data lama (aman dijalankan berulang):
 * - pengajuan TERVERIFIKASI yang belum punya KTA → KTA langsung diterbitkan
 * - pengajuan DRAF (data belum lengkap) → dihapus beserta dokumennya
 * Jalankan: npm run migrasi:tanpa-draf  (dipanggil otomatis oleh deploy.sh)
 */
import "dotenv/config"
import { and, eq, isNull } from "drizzle-orm"
import { db, schema } from "../src/server/db"
import { terbitkanKartu } from "../src/server/kartu-terbit"

const hariIni = (tz: string) => new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(new Date())

async function main() {
  const menunggu = await db
    .select({ p: schema.pengajuan, poldaKode: schema.polda.kode, zona: schema.polda.zonaWaktu })
    .from(schema.pengajuan)
    .innerJoin(schema.polda, eq(schema.pengajuan.poldaId, schema.polda.id))
    .leftJoin(schema.kartu, eq(schema.kartu.pengajuanId, schema.pengajuan.id))
    .where(and(eq(schema.pengajuan.status, "TERVERIFIKASI"), isNull(schema.kartu.id)))

  for (const { p, poldaKode, zona } of menunggu) {
    await db.transaction(async (tx) => {
      const k = await terbitkanKartu(tx, {
        pengajuanId: p.id,
        pemohonId: p.pemohonId,
        profesi: p.profesi,
        poldaKode,
        operatorId: p.operatorId,
        terbit: hariIni(zona),
      })
      await tx.insert(schema.riwayatStatus).values({
        pengajuanId: p.id,
        dari: "TERVERIFIKASI",
        ke: "DICETAK",
        oleh: null,
        catatan: `KTA ${k.noKta} diterbitkan otomatis (penyesuaian alur tanpa antrean cetak)`,
      })
    })
  }

  const draf = await db.delete(schema.pengajuan).where(eq(schema.pengajuan.status, "DRAF")).returning({ id: schema.pengajuan.id })
  console.log(`KTA diterbitkan untuk ${menunggu.length} pengajuan terverifikasi; ${draf.length} draf dihapus.`)
  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
