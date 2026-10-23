import { asc, eq, isNull } from "drizzle-orm"
import { NextResponse } from "next/server"
import { getSession } from "@/server/auth"
import { db, schema } from "@/server/db"

// Daftar anak wilayah: ?parent=32 → kab/kota di Jawa Barat; tanpa parent → provinsi.
export async function GET(req: Request) {
  if (!(await getSession())) return NextResponse.json({ error: "Tidak diizinkan" }, { status: 401 })
  const parent = new URL(req.url).searchParams.get("parent")
  const rows = await db
    .select({ kode: schema.wilayah.kode, nama: schema.wilayah.nama })
    .from(schema.wilayah)
    .where(parent ? eq(schema.wilayah.parentKode, parent) : isNull(schema.wilayah.parentKode))
    .orderBy(asc(schema.wilayah.nama))
  return NextResponse.json(rows, { headers: { "Cache-Control": "private, max-age=86400" } })
}
