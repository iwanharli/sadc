/**
 * Impor kode wilayah Kemendagri + GeoJSON batas wilayah dari database lain
 * (default: database aplikasi lapor-bhabinkamtibmas).
 *
 * Sumber diatur lewat WILAYAH_SOURCE_URL, mis. postgres://user@localhost:5432/lapor_dev
 * Tabel sumber: regions (level 1-3, dengan geom_s tersederhanakan) & villages (desa/kelurahan).
 *
 * Hasil:
 *  - tabel `wilayah` di database SADC (4 level, tanpa geometri)
 *  - public/geo/provinsi.geojson & public/geo/kabupaten.geojson untuk peta sebaran
 */
import "dotenv/config"
import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"
import { sql } from "drizzle-orm"
import { Pool } from "pg"
import { db, schema } from "../src/server/db"

const SOURCE = process.env.WILAYAH_SOURCE_URL
const BATCH = 5000

type Row = typeof schema.wilayah.$inferInsert

async function main() {
  if (!SOURCE) throw new Error("WILAYAH_SOURCE_URL belum diatur di .env")
  const src = new Pool({ connectionString: SOURCE })

  console.log("Membaca wilayah dari sumber...")
  const regions = await src.query<{ kode: string; nama: string; level: number; parent_kode: string | null; lat: number | null; lng: number | null }>(
    "select kode, nama, level, parent_kode, lat, lng from regions order by level, kode",
  )
  const villages = await src.query<{ kode_wilayah: string; nama: string; kecamatan_kode: string | null; lat: number | null; lng: number | null }>(
    `select kode_wilayah, nama, kecamatan_kode,
            st_y(centroid::geometry) as lat, st_x(centroid::geometry) as lng
       from villages order by kode_wilayah`,
  )

  const rows: Row[] = [
    ...regions.rows.map((r) => ({ kode: r.kode, nama: r.nama, level: r.level, parentKode: r.parent_kode, lat: r.lat, lng: r.lng })),
    ...villages.rows.map((v) => ({
      kode: v.kode_wilayah,
      nama: v.nama,
      level: 4,
      // fallback bila kecamatan_kode kosong: buang segmen terakhir kode desa
      parentKode: v.kecamatan_kode ?? v.kode_wilayah.split(".").slice(0, 3).join("."),
      lat: v.lat,
      lng: v.lng,
    })),
  ]

  console.log(`Menyimpan ${rows.length.toLocaleString("id-ID")} wilayah...`)
  await db.transaction(async (tx) => {
    for (let i = 0; i < rows.length; i += BATCH) {
      await tx
        .insert(schema.wilayah)
        .values(rows.slice(i, i + BATCH))
        .onConflictDoUpdate({
          target: schema.wilayah.kode,
          set: {
            nama: sql`excluded.nama`,
            level: sql`excluded.level`,
            parentKode: sql`excluded.parent_kode`,
            lat: sql`excluded.lat`,
            lng: sql`excluded.lng`,
          },
        })
    }
  })

  const outDir = path.join(process.cwd(), "public", "geo")
  await mkdir(outDir, { recursive: true })
  for (const [level, file] of [
    [1, "provinsi.geojson"],
    [2, "kabupaten.geojson"],
  ] as const) {
    const { rows: geo } = await src.query<{ fc: unknown }>(
      `select json_build_object(
         'type', 'FeatureCollection',
         'features', json_agg(json_build_object(
           'type', 'Feature',
           'properties', json_build_object('kode', kode, 'nama', nama, 'parent', parent_kode),
           'geometry', st_asgeojson(geom_s, 4)::json
         ) order by kode)
       ) as fc
       from regions where level = $1 and geom_s is not null`,
      [level],
    )
    await writeFile(path.join(outDir, file), JSON.stringify(geo[0].fc))
    console.log(`  public/geo/${file}`)
  }

  const count = await db.execute(sql`select level, count(*)::int as n from wilayah group by level order by level`)
  console.log("Jumlah per level:", count.rows.map((r) => `${r.level}=${r.n}`).join(", "))

  await src.end()
  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
