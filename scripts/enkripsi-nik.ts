/**
 * Enkripsi NIK lama (kolom polos) → nik_hash, nik_enc, nik_wilayah, lalu kosongkan kolom polos.
 * Aman dijalankan berulang. Jalankan: npm run nik:enkripsi  (dipanggil otomatis oleh deploy.sh)
 */
import "dotenv/config"
import { eq, isNotNull } from "drizzle-orm"
import { db, schema } from "../src/server/db"
import { enkripsiNik, hashNik, kolomNik } from "../src/server/nik"

async function main() {
  const pemohon = await db.select({ id: schema.pemohon.id, nik: schema.pemohon.nik }).from(schema.pemohon).where(isNotNull(schema.pemohon.nik))
  await db.transaction(async (tx) => {
    for (const p of pemohon) {
      await tx.update(schema.pemohon).set({ ...kolomNik(p.nik!), nik: null }).where(eq(schema.pemohon.id, p.id))
    }
  })
  const bl = await db.select({ id: schema.blacklist.id, nik: schema.blacklist.nik }).from(schema.blacklist).where(isNotNull(schema.blacklist.nik))
  await db.transaction(async (tx) => {
    for (const b of bl) {
      await tx.update(schema.blacklist).set({ nikHash: hashNik(b.nik!), nikEnc: enkripsiNik(b.nik!), nik: null }).where(eq(schema.blacklist.id, b.id))
    }
  })
  console.log(`NIK dienkripsi: ${pemohon.length} pemohon, ${bl.length} blacklist.`)
  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
