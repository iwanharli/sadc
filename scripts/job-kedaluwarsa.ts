/** Jalankan pemeriksaan kedaluwarsa KTA & blacklist secara manual. */
import "dotenv/config"
import { prosesKedaluwarsa } from "../src/server/jobs"

prosesKedaluwarsa()
  .then((h) => {
    console.log(`KTA ditandai kedaluwarsa: ${h.kartu} · blacklist berakhir: ${h.blacklist}`)
    process.exit(0)
  })
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
