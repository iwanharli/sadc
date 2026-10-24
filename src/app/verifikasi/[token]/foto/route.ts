import { NextResponse } from "next/server"
import { bacaFile, isValidKey } from "@/server/storage"
import { ipKlien, izinkan } from "@/server/rate-limit"
import { kartuPublik } from "@/server/verifikasi-publik"

// Foto pemegang kartu khusus untuk halaman verifikasi publik (hanya via token QR yang sah).
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  if (!izinkan(`foto:${await ipKlien()}`, 30, 60)) return NextResponse.json({ error: "Terlalu banyak permintaan" }, { status: 429 })
  const k = await kartuPublik((await params).token)
  if (!k?.fotoUrl || !isValidKey(k.fotoUrl) || k.fotoUrl.endsWith(".pdf")) {
    return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 })
  }
  const { data, mime } = await bacaFile(k.fotoUrl)
  return new NextResponse(new Uint8Array(data), {
    headers: { "Content-Type": mime, "Cache-Control": "private, max-age=300", "X-Content-Type-Options": "nosniff" },
  })
}
