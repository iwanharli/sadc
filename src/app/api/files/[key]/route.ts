import { NextResponse } from "next/server"
import { getSession } from "@/server/auth"
import { bacaFile, isValidKey } from "@/server/storage"

// File hanya bisa dibuka pengguna yang login; akses per-Polda dicek di halaman yang menautkannya.
export async function GET(_req: Request, { params }: { params: Promise<{ key: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Tidak diizinkan" }, { status: 401 })

  const { key } = await params
  if (!isValidKey(key)) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 })

  try {
    const { data, mime } = await bacaFile(key)
    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": mime,
        "Cache-Control": "private, max-age=3600",
        "X-Content-Type-Options": "nosniff",
      },
    })
  } catch {
    return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 })
  }
}
