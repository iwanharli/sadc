/* eslint-disable jsx-a11y/alt-text -- <Image> milik react-pdf tidak mendukung alt */
import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer"
import type { DataCetak } from "./data"

/* Kartu CR80: 85,6 × 53,98 mm = 242,6 × 153 pt */
const CR80: [number, number] = [242.6, 153]
const TEAL = "#0f766e"
const TEAL_GELAP = "#134e4a"
const EMAS = "#d97706"

const fmt = (v: string) =>
  new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(v + "T00:00:00Z"))

const profesi = (d: DataCetak) => (d!.pengajuan.profesi === "SATPAM" ? "SATUAN PENGAMANAN" : "DEBT COLLECTOR")
const gada = (d: DataCetak) => (d!.jenjangGada ? `Gada ${d!.jenjangGada[0]}${d!.jenjangGada.slice(1).toLowerCase()}` : null)

const k = StyleSheet.create({
  page: { width: CR80[0], height: CR80[1], fontFamily: "Helvetica", color: "#0f172a", backgroundColor: "#ffffff" },
  header: { backgroundColor: TEAL, paddingHorizontal: 10, paddingVertical: 6, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  hJudul: { color: "#ffffff", fontSize: 7.5, fontWeight: "bold", letterSpacing: 0.6 },
  hSub: { color: "#ccfbf1", fontSize: 5.5, marginTop: 1 },
  badge: { backgroundColor: EMAS, color: "#ffffff", fontSize: 5.5, fontWeight: "bold", paddingHorizontal: 5, paddingVertical: 2, borderRadius: 6 },
  body: { flexDirection: "row", paddingHorizontal: 10, paddingTop: 7, gap: 8 },
  foto: { width: 52, height: 69, borderRadius: 3, objectFit: "cover", borderWidth: 0.6, borderColor: "#cbd5e1" },
  fotoKosong: { width: 52, height: 69, borderRadius: 3, backgroundColor: "#e2e8f0" },
  nama: { fontSize: 9, fontWeight: "bold", marginBottom: 3 },
  label: { fontSize: 4.8, color: "#64748b", marginTop: 2.5 },
  nilai: { fontSize: 6.2, fontWeight: "bold" },
  noKta: { fontSize: 7, fontFamily: "Courier", fontWeight: "bold", color: TEAL_GELAP },
  footer: { position: "absolute", bottom: 0, left: 0, right: 0, height: 5, backgroundColor: EMAS },
  ttd: { position: "absolute", right: 10, bottom: 9, width: 48, height: 20, objectFit: "contain" },
})

export function KtaPdf({ d }: { d: NonNullable<DataCetak> }) {
  return (
    <Document title={`KTA ${d.kartu.noKta}`} author="SADC Baharkam Polri">
      {/* Depan */}
      <Page size={CR80} style={k.page}>
        <View style={k.header}>
          <View>
            <Text style={k.hJudul}>KARTU TANDA ANGGOTA</Text>
            <Text style={k.hSub}>Baharkam Polri · {d.polda.nama}</Text>
          </View>
          <Text style={k.badge}>{d.pengajuan.profesi === "SATPAM" ? "SATPAM" : "DEBT COLLECTOR"}</Text>
        </View>
        <View style={k.body}>
          {d.foto ? <Image src={d.foto} style={k.foto} /> : <View style={k.fotoKosong} />}
          <View style={{ flex: 1 }}>
            <Text style={k.nama}>{d.pemohon.nama.toUpperCase()}</Text>
            <Text style={k.noKta}>{d.kartu.noKta}</Text>
            <Text style={k.label}>{d.pengajuan.profesi === "SATPAM" ? "BUJP / Perusahaan" : "Perusahaan pembiayaan"}</Text>
            <Text style={k.nilai}>{d.perusahaan ?? "-"}</Text>
            <View style={{ flexDirection: "row", gap: 10 }}>
              {gada(d) && (
                <View>
                  <Text style={k.label}>Kualifikasi</Text>
                  <Text style={k.nilai}>{gada(d)}</Text>
                </View>
              )}
              <View>
                <Text style={k.label}>Berlaku s.d.</Text>
                <Text style={k.nilai}>{fmt(d.kartu.berlakuSd)}</Text>
              </View>
            </View>
          </View>
        </View>
        {d.ttd && <Image src={d.ttd} style={k.ttd} />}
        <View style={k.footer} />
      </Page>

      {/* Belakang */}
      <Page size={CR80} style={k.page}>
        <View style={{ flexDirection: "row", padding: 10, gap: 10, alignItems: "center" }}>
          <Image src={d.qr} style={{ width: 78, height: 78 }} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 7, fontWeight: "bold", color: TEAL_GELAP }}>Verifikasi keaslian kartu</Text>
            <Text style={{ fontSize: 5.4, color: "#334155", marginTop: 3, lineHeight: 1.4 }}>
              Pindai kode QR untuk memastikan kartu ini sah dan masih berlaku. Kartu yang dibekukan atau dicabut akan
              ditandai pada halaman verifikasi.
            </Text>
            <Text style={{ fontSize: 5, color: "#64748b", marginTop: 4 }}>Terbit {fmt(d.kartu.terbitAt)}</Text>
          </View>
        </View>
        <View style={{ paddingHorizontal: 10 }}>
          <Text style={{ fontSize: 4.8, color: "#64748b", lineHeight: 1.4 }}>
            Kartu ini milik negara dan hanya berlaku bagi pemegangnya. Bila ditemukan, harap serahkan ke kantor Polri
            terdekat. Penyalahgunaan kartu dapat dikenai sanksi sesuai peraturan perundang-undangan.
          </Text>
        </View>
        <View style={k.footer} />
      </Page>
    </Document>
  )
}

const s = StyleSheet.create({
  page: { fontFamily: "Helvetica", padding: 28, color: "#0f172a" },
  bingkai: { flex: 1, borderWidth: 3, borderColor: TEAL, padding: 6 },
  dalam: { flex: 1, borderWidth: 0.8, borderColor: EMAS, paddingHorizontal: 48, paddingVertical: 36, alignItems: "center" },
  kecil: { fontSize: 10, letterSpacing: 2, color: TEAL_GELAP },
  judul: { fontSize: 38, fontWeight: "bold", color: TEAL, letterSpacing: 6, marginTop: 10 },
  nama: { fontSize: 26, fontWeight: "bold", marginTop: 8, borderBottomWidth: 1, borderBottomColor: EMAS, paddingBottom: 4 },
  teks: { fontSize: 11.5, color: "#334155", textAlign: "center", lineHeight: 1.6, marginTop: 14, maxWidth: 560 },
})

export function SertifikatPdf({ d }: { d: NonNullable<DataCetak> }) {
  const jabatan = d.pengajuan.profesi === "SATPAM" ? "Satuan Pengamanan (Satpam)" : "Penagih Utang (Debt Collector)"
  return (
    <Document title={`Sertifikat ${d.kartu.noKta}`} author="SADC Baharkam Polri">
      <Page size="A4" orientation="landscape" style={s.page}>
        <View style={s.bingkai}>
          <View style={s.dalam}>
            <Text style={s.kecil}>KEPOLISIAN NEGARA REPUBLIK INDONESIA · BADAN PEMELIHARA KEAMANAN</Text>
            <Text style={s.judul}>SERTIFIKAT</Text>
            <Text style={{ fontSize: 12, color: "#475569", marginTop: 4 }}>Nomor {d.kartu.noKta}</Text>
            <Text style={{ fontSize: 12, marginTop: 20 }}>Diberikan kepada</Text>
            <Text style={s.nama}>{d.pemohon.nama.toUpperCase()}</Text>
            <Text style={s.teks}>
              yang telah memenuhi persyaratan administrasi dan terdaftar sebagai {jabatan}
              {gada(d) ? ` dengan kualifikasi ${gada(d)}` : ""} pada {d.perusahaan ?? "-"}, wilayah {d.polda.nama}. Sertifikat
              ini berlaku sampai dengan {fmt(d.kartu.berlakuSd)}.
            </Text>

            <View style={{ flexDirection: "row", width: "100%", justifyContent: "space-between", alignItems: "flex-end", marginTop: "auto" }}>
              <View style={{ alignItems: "center" }}>
                <Image src={d.qr} style={{ width: 82, height: 82 }} />
                <Text style={{ fontSize: 7.5, color: "#64748b", marginTop: 3 }}>Pindai untuk verifikasi</Text>
              </View>
              <View style={{ alignItems: "center" }}>
                <Text style={{ fontSize: 10.5 }}>Diterbitkan {fmt(d.kartu.terbitAt)}</Text>
                <Text style={{ fontSize: 10.5, marginTop: 2 }}>{d.polda.nama}</Text>
                <View style={{ height: 48 }} />
                <Text style={{ fontSize: 10.5, fontWeight: "bold", borderTopWidth: 0.8, borderTopColor: "#334155", paddingTop: 3, minWidth: 180, textAlign: "center" }}>
                  Pejabat yang berwenang
                </Text>
              </View>
            </View>
            <Text style={{ fontSize: 9, color: "#64748b", marginTop: 8 }}>{profesi(d)}</Text>
          </View>
        </View>
      </Page>
    </Document>
  )
}
