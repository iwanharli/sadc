import ExcelJS from "exceljs"
import { NextResponse } from "next/server"
import { parseFilter } from "@/lib/filter-pemohon"
import { labelJenis, labelProfesi } from "@/components/pendataan/status-badge"
import { formatTanggal, hariIniDi } from "@/lib/waktu"
import { catatAudit } from "@/server/audit"
import { getSession } from "@/server/auth"
import { daftarPemohon } from "@/server/pendataan"
import { getZona } from "@/server/zona"

export const runtime = "nodejs"
const BATAS = 50_000

// Ekspor direktori pemohon (Admin) sesuai filter aktif ke .xlsx
export async function GET(req: Request) {
  const session = await getSession()
  if (!session || session.user.role !== "ADMIN") return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 })

  const sp = Object.fromEntries(new URL(req.url).searchParams)
  const f = parseFilter(sp)
  const tz = await getZona()
  const { rows, total } = await daftarPemohon({ ...f, perPage: BATAS })

  const wb = new ExcelJS.Workbook()
  wb.creator = "SADC Baharkam Polri"
  const ws = wb.addWorksheet("Pemohon", { views: [{ state: "frozen", ySplit: 1 }] })
  ws.columns = [
    { header: "No. Registrasi", key: "reg", width: 26 },
    { header: "Nama", key: "nama", width: 28 },
    { header: "NIK", key: "nik", width: 20 },
    { header: "JK", key: "jk", width: 5 },
    { header: "No. HP", key: "hp", width: 16 },
    { header: "Profesi", key: "profesi", width: 16 },
    { header: "Jenis", key: "jenis", width: 14 },
    { header: "Perusahaan", key: "perusahaan", width: 36 },
    { header: "Polda", key: "polda", width: 26 },
    { header: "Status pengajuan", key: "status", width: 16 },
    { header: "No. KTA", key: "kta", width: 22 },
    { header: "Status KTA", key: "statusKta", width: 14 },
    { header: "Tanggal pendataan", key: "tgl", width: 18 },
  ]
  for (const r of rows) {
    ws.addRow({
      reg: r.noRegistrasi,
      nama: r.nama,
      nik: r.nik,
      jk: r.jenisKelamin ?? "",
      hp: r.noHp ?? "",
      profesi: labelProfesi(r.profesi),
      jenis: labelJenis(r.jenis),
      perusahaan: r.perusahaan ?? "",
      polda: r.polda,
      status: r.status,
      kta: r.noKta ?? "",
      statusKta: r.kartu ?? "",
      tgl: formatTanggal(r.createdAt, tz, { day: "2-digit", month: "2-digit", year: "numeric" }),
    })
  }
  const head = ws.getRow(1)
  head.font = { bold: true, color: { argb: "FFFFFFFF" } }
  head.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F766E" } }
  ws.autoFilter = { from: "A1", to: "M1" }
  ws.getColumn("nik").numFmt = "@"

  await catatAudit(session.user.id, "EKSPOR_PEMOHON", "pengajuan", null, { filter: sp, jumlah: rows.length, total })
  const buf = await wb.xlsx.writeBuffer()
  return new NextResponse(new Uint8Array(buf as ArrayBuffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="direktori-pemohon-${hariIniDi(tz)}.xlsx"`,
      "Cache-Control": "no-store",
    },
  })
}
