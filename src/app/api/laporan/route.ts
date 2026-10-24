import { renderToBuffer } from "@react-pdf/renderer"
import { NextResponse } from "next/server"
import { createElement } from "react"
import { parsePeriode } from "@/components/dashboard/period-tabs"
import { formatTanggal, formatWaktu, hariIniDi } from "@/lib/waktu"
import { catatAudit } from "@/server/audit"
import { getSession } from "@/server/auth"
import { kinerjaOperator, rekapPerusahaan } from "@/server/laporan"
import { LaporanPdf } from "@/server/pdf/laporan"
import { getRekapPerPolda, getRingkasan, getTren } from "@/server/queries"
import { getZona } from "@/server/zona"

export const runtime = "nodejs"

// GET /api/laporan?periode=30 → laporan rekap nasional (PDF), khusus Admin
export async function GET(req: Request) {
  const session = await getSession()
  if (!session || session.user.role !== "ADMIN") return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 })
  const periode = parsePeriode(new URL(req.url).searchParams.get("periode") ?? undefined)
  const tz = await getZona()

  const [ringkasan, tren, polda, perusahaan, operator] = await Promise.all([
    getRingkasan(),
    getTren(periode, null, tz),
    getRekapPerPolda(),
    rekapPerusahaan(periode, 30),
    kinerjaOperator(periode),
  ])
  const mulai = new Date(Date.now() - (periode - 1) * 86_400_000)
  const opsi = { day: "numeric", month: "long", year: "numeric" } as const
  const doc = createElement(LaporanPdf, {
    periode,
    rentang: `${formatTanggal(mulai, tz, opsi)} – ${formatTanggal(new Date(), tz, opsi)}`,
    dibuat: formatWaktu(new Date(), tz),
    oleh: session.user.name,
    ringkasan,
    tren: {
      total: tren.total,
      perubahan: tren.perubahan,
      satpam: tren.data.reduce((a, d) => a + d.satpam, 0),
      dc: tren.data.reduce((a, d) => a + d.dc, 0),
    },
    polda: [...polda].sort((a, b) => b.total - a.total),
    perusahaan: perusahaan.filter((p) => p.pendataan > 0),
    operator,
  })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdf = await renderToBuffer(doc as any)
  await catatAudit(session.user.id, "EKSPOR_PEMOHON", "laporan", null, { periode, format: "pdf" })
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="laporan-sadc-${periode}hari-${hariIniDi(tz)}.pdf"`,
      "Cache-Control": "no-store",
    },
  })
}
