import { NextResponse } from "next/server"
import { getSession } from "@/server/auth"
import { MAX_UPLOAD, simpanFile, TIPE_DIIZINKAN } from "@/server/storage"

export async function POST(req: Request) {
  const session = await getSession()
  if (!session || session.user.role !== "OPERATOR") {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 })
  }

  const form = await req.formData()
  const file = form.get("file")
  if (!(file instanceof File)) return NextResponse.json({ error: "File tidak ada" }, { status: 400 })
  if (!TIPE_DIIZINKAN[file.type]) {
    return NextResponse.json({ error: "Format harus PDF, JPG, PNG, atau WEBP" }, { status: 400 })
  }
  if (file.size > MAX_UPLOAD) return NextResponse.json({ error: "Ukuran maksimal 5 MB" }, { status: 400 })

  const key = await simpanFile(Buffer.from(await file.arrayBuffer()), file.type)
  return NextResponse.json({ key })
}
