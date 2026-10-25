import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer"

const TEAL = "#0f766e"
const nf = new Intl.NumberFormat("id-ID")

type Ringkasan = { total: number; aktif: number; terbit: number; kedaluwarsa: number; dibekukan: number; dicabut: number; segeraKedaluwarsa: number }
type Polda = { nama: string; satpam: number; dc: number; total: number }
type Perusahaan = { nama: string; jenis: string; polda: string; pendataan: number; terbit: number; aktif: number }
type Operator = { nama: string; polda: string | null; pendataan: number; terbit: number; sanksi: number }

const s = StyleSheet.create({
  page: { fontFamily: "Helvetica", fontSize: 9, color: "#0f172a", paddingVertical: 32, paddingHorizontal: 36 },
  kop: { borderBottomWidth: 2, borderBottomColor: TEAL, paddingBottom: 8, marginBottom: 14 },
  kecil: { fontSize: 8, color: "#475569", letterSpacing: 1 },
  judul: { fontSize: 16, fontWeight: "bold", color: TEAL, marginTop: 3 },
  h2: { fontSize: 11, fontWeight: "bold", color: TEAL, marginTop: 14, marginBottom: 6 },
  kpiRow: { flexDirection: "row", gap: 6 },
  kpi: { flex: 1, borderWidth: 0.7, borderColor: "#cbd5e1", borderRadius: 4, padding: 7 },
  kpiNilai: { fontSize: 15, fontWeight: "bold", marginTop: 2 },
  th: { flexDirection: "row", backgroundColor: TEAL, color: "#ffffff", fontWeight: "bold", paddingVertical: 4, paddingHorizontal: 4 },
  tr: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#e2e8f0", paddingVertical: 3.5, paddingHorizontal: 4 },
  kaki: { position: "absolute", bottom: 16, left: 36, right: 36, flexDirection: "row", justifyContent: "space-between", fontSize: 7.5, color: "#64748b" },
})

function Tabel<T>({ kolom, rows }: { kolom: { t: string; w: number; kanan?: boolean; v: (r: T) => string }[]; rows: T[] }) {
  return (
    <View>
      <View style={s.th} fixed>
        {kolom.map((k) => (
          <Text key={k.t} style={{ width: `${k.w}%`, textAlign: k.kanan ? "right" : "left" }}>{k.t}</Text>
        ))}
      </View>
      {rows.map((r, i) => (
        <View key={i} style={[s.tr, i % 2 ? { backgroundColor: "#f8fafc" } : {}]} wrap={false}>
          {kolom.map((k) => (
            <Text key={k.t} style={{ width: `${k.w}%`, textAlign: k.kanan ? "right" : "left" }}>{k.v(r)}</Text>
          ))}
        </View>
      ))}
    </View>
  )
}

export function LaporanPdf({
  periode,
  rentang,
  dibuat,
  oleh,
  ringkasan,
  tren,
  polda,
  perusahaan,
  operator,
}: {
  periode: number
  rentang: string
  dibuat: string
  oleh: string
  ringkasan: Ringkasan
  tren: { total: number; satpam: number; dc: number; perubahan: number | null }
  polda: Polda[]
  perusahaan: Perusahaan[]
  operator: Operator[]
}) {
  const kpi = [
    ["Pendataan periode ini", tren.total],
    ["KTA aktif", ringkasan.aktif],
    ["Total KTA terbit", ringkasan.terbit],
    ["Sudah kedaluwarsa", ringkasan.kedaluwarsa],
    ["Kedaluwarsa dalam 30 hari", ringkasan.segeraKedaluwarsa],
    ["Dibekukan / dicabut", ringkasan.dibekukan + ringkasan.dicabut],
  ] as const
  return (
    <Document title={`Laporan SADC ${rentang}`} author="SADC Baharkam Polri">
      <Page size="A4" style={s.page}>
        <View style={s.kop}>
          <Text style={s.kecil}>KEPOLISIAN NEGARA REPUBLIK INDONESIA · BADAN PEMELIHARA KEAMANAN</Text>
          <Text style={s.judul}>Laporan Pendataan Satpam & Penagih Utang</Text>
          <Text style={{ marginTop: 3, color: "#334155" }}>
            Periode {periode} hari ({rentang}) · Nasional
          </Text>
        </View>

        <Text style={s.h2}>Ringkasan</Text>
        <View style={s.kpiRow}>
          {kpi.map(([t, v]) => (
            <View key={t} style={s.kpi}>
              <Text style={{ color: "#475569", fontSize: 7.5 }}>{t}</Text>
              <Text style={s.kpiNilai}>{nf.format(v)}</Text>
            </View>
          ))}
        </View>
        <Text style={{ marginTop: 6, color: "#334155" }}>
          Pendataan periode ini terdiri dari {nf.format(tren.satpam)} Satpam dan {nf.format(tren.dc)} Penagih Utang
          {tren.perubahan !== null
            ? `, ${tren.perubahan >= 0 ? "naik" : "turun"} ${Math.abs(tren.perubahan).toLocaleString("id-ID", { maximumFractionDigits: 1 })}% dibanding periode sebelumnya`
            : ""}
          . Total seluruh pendataan: {nf.format(ringkasan.total)}.
        </Text>

        <Text style={s.h2}>Rekap per Polda (seluruh waktu)</Text>
        <Tabel
          rows={polda}
          kolom={[
            { t: "Polda", w: 55, v: (r: Polda) => r.nama },
            { t: "Satpam", w: 15, kanan: true, v: (r) => nf.format(r.satpam) },
            { t: "Penagih Utang", w: 15, kanan: true, v: (r) => nf.format(r.dc) },
            { t: "Total", w: 15, kanan: true, v: (r) => nf.format(r.total) },
          ]}
        />

        <Text style={s.h2} break>
          Perusahaan dengan pendataan terbanyak ({periode} hari)
        </Text>
        <Tabel
          rows={perusahaan}
          kolom={[
            { t: "Perusahaan", w: 40, v: (r: Perusahaan) => r.nama },
            { t: "Jenis", w: 12, v: (r) => (r.jenis === "BUJP" ? "BUJP" : "Pembiayaan") },
            { t: "Polda", w: 18, v: (r) => r.polda.replace(/^Polda /, "") },
            { t: "Didata", w: 10, kanan: true, v: (r) => nf.format(r.pendataan) },
            { t: "KTA terbit", w: 10, kanan: true, v: (r) => nf.format(r.terbit) },
            { t: "KTA aktif", w: 10, kanan: true, v: (r) => nf.format(r.aktif) },
          ]}
        />

        <Text style={s.h2}>Kinerja operator ({periode} hari)</Text>
        <Tabel
          rows={operator}
          kolom={[
            { t: "Operator", w: 38, v: (r: Operator) => r.nama },
            { t: "Polda", w: 26, v: (r) => r.polda?.replace(/^Polda /, "") ?? "-" },
            { t: "Didata", w: 12, kanan: true, v: (r) => nf.format(r.pendataan) },
            { t: "KTA terbit", w: 12, kanan: true, v: (r) => nf.format(r.terbit) },
            { t: "Sanksi", w: 12, kanan: true, v: (r) => nf.format(r.sanksi) },
          ]}
        />

        <View style={s.kaki} fixed>
          <Text>Dibuat {dibuat} oleh {oleh} · SADC Baharkam Polri · Dokumen terbatas</Text>
          <Text render={({ pageNumber, totalPages }) => `Halaman ${pageNumber} dari ${totalPages}`} />
        </View>
      </Page>
    </Document>
  )
}
