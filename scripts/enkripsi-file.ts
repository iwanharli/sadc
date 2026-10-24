/**
 * Enkripsi file unggahan lama yang masih tersimpan polos (sekali jalan, aman diulang).
 * Jalankan: npm run storage:enkripsi
 */
import "dotenv/config"
import { readdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { enkripsi, folderFile, isValidKey, terenkripsi } from "../src/server/storage"

async function main() {
  const dir = folderFile()
  const files = (await readdir(dir).catch(() => [])).filter(isValidKey)
  let n = 0
  for (const f of files) {
    const p = path.join(dir, f)
    const buf = await readFile(p)
    if (terenkripsi(buf)) continue
    await writeFile(p, enkripsi(buf))
    n++
  }
  console.log(`${n} dari ${files.length} file dienkripsi.`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
