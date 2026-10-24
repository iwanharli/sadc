import { NextResponse } from "next/server"
import { getSession } from "@/server/auth"
import { db, schema } from "@/server/db"
import { MAX_UPLOAD, simpanFile, TIPE_DIIZINKAN } from "@/server/storage"

export async function POST(req: Request) {
  const session = await getSession()
  if (!session || !session.user.aktif) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 })
  }

  const form = await req.formData()
  const file = form.get("file")
  if (!(file instanceof File)) return NextResponse.json({ error: "File tidak ada" }, { status: 400 })
  if (!TIPE_DIIZINKAN[file.type]) {
    return NextResponse.json({ error: "Format harus PDF, JPG, PNG, atau WEBP" }, { status: 400 })
  }
  if (file.size > MAX_UPLOAD) return NextResponse.json({ error: "Ukuran maksimal 5 MB" }, { status: 400 })

  // pastikan isi file benar-benar sesuai tipe (bukan sekadar label MIME dari browser)
  const data = Buffer.from(await file.arrayBuffer())
  if (!cocokTipe(data, file.type)) return NextResponse.json({ error: "Isi file tidak sesuai formatnya" }, { status: 400 })
  const key = await simpanFile(data, file.type)
  await db.insert(schema.unggahan).values({ key, userId: session.user.id, poldaId: session.user.poldaId ?? null })
  return NextResponse.json({ key })
}

const SIGNATURE: Record<string, number[][]> = {
  "application/pdf": [[0x25, 0x50, 0x44, 0x46]], // %PDF
  "image/jpeg": [[0xff, 0xd8, 0xff]],
  "image/png": [[0x89, 0x50, 0x4e, 0x47]],
  "image/webp": [[0x52, 0x49, 0x46, 0x46]], // RIFF
}

function cocokTipe(data: Buffer, mime: string) {
  return (SIGNATURE[mime] ?? []).some((sig) => sig.every((b, i) => data[i] === b))
}
