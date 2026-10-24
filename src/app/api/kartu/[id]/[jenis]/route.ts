import { renderToBuffer } from "@react-pdf/renderer"
import { NextResponse } from "next/server"
import { createElement } from "react"
import { catatAudit } from "@/server/audit"
import { getSession } from "@/server/auth"
import { dataCetak } from "@/server/pdf/data"
import { KtaPdf, SertifikatPdf } from "@/server/pdf/dokumen"

export const runtime = "nodejs"

// GET /api/kartu/:id/kta | /api/kartu/:id/sertifikat → PDF siap cetak
export async function GET(_req: Request, { params }: { params: Promise<{ id: string; jenis: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Tidak diizinkan" }, { status: 401 })
  const { id, jenis } = await params
  if (jenis !== "kta" && jenis !== "sertifikat") return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 })

  const d = await dataCetak(Number(id))
  if (!d) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 })
  if (session.user.role === "OPERATOR" && d.pengajuan.poldaId !== session.user.poldaId) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 })
  }

  const doc = jenis === "kta" ? createElement(KtaPdf, { d }) : createElement(SertifikatPdf, { d })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdf = await renderToBuffer(doc as any)
  await catatAudit(session.user.id, jenis === "kta" ? "CETAK_KTA" : "CETAK_SERTIFIKAT", "kartu", d.kartu.id, { noKta: d.kartu.noKta })

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${jenis}-${d.kartu.noKta}.pdf"`,
      "Cache-Control": "no-store",
    },
  })
}
