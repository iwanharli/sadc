/**
 * Data demo pendataan (pemohon, pengajuan, kartu, sanksi) agar dashboard terisi.
 * Aman dijalankan ulang: data demo lama (no_registrasi berawalan DEMO/) dihapus dulu.
 * Jalankan: npm run db:demo   (butuh seed & wilayah sudah diimpor)
 */
import "dotenv/config"
import { randomUUID } from "node:crypto"
import { eq, like, sql } from "drizzle-orm"
import { db, schema } from "../src/server/db"
import { kolomNik } from "../src/server/nik"

const TOTAL = Number(process.env.DEMO_JUMLAH ?? 2400)
const HARI = 120

// generator acak deterministik supaya hasil seed konsisten
// (mulberry32 — pakai aritmetika 32-bit agar tidak kehilangan presisi)
let seed = 20261024
const rand = () => {
  seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
const pick = <T,>(arr: T[]) => arr[Math.floor(rand() * arr.length)]
const pad = (n: number, w: number) => String(n).padStart(w, "0")

const DEPAN = ["Andi", "Budi", "Dedi", "Eko", "Fajar", "Gilang", "Hendra", "Irfan", "Joko", "Kurnia", "Lukman", "Made", "Nanda", "Oki", "Putra", "Rizky", "Sigit", "Teguh", "Wahyu", "Yoga", "Siti", "Dewi", "Rina", "Ayu", "Maya"]
const BELAKANG = ["Saputra", "Pratama", "Wijaya", "Siregar", "Nasution", "Santoso", "Hidayat", "Kurniawan", "Gunawan", "Setiawan", "Lubis", "Harahap", "Wibowo", "Susanto", "Nugroho", "Simanjuntak", "Putri", "Lestari"]
const BUJP = ["PT Garda Utama Nusantara", "PT Bhayangkara Satria", "PT Sentinel Prima", "PT Tameng Jaya", "PT Mitra Pengaman Sejati"]
const LEASING = ["PT Multi Finance Indonesia", "PT Sinar Pembiayaan", "PT Dana Kredit Mandiri", "PT Arta Leasing Nusantara"]

function tanggalAcak() {
  // lebih banyak data di hari-hari terakhir (tren naik)
  const r = Math.pow(rand(), 1.4)
  const d = new Date()
  d.setDate(d.getDate() - Math.floor(r * HARI))
  d.setHours(7 + Math.floor(rand() * 10), Math.floor(rand() * 60))
  // jangan sampai jatuh di masa depan
  return d.getTime() > Date.now() ? new Date(Date.now() - Math.floor(rand() * 3_600_000)) : d
}

async function main() {
  const poldaList = await db.select().from(schema.polda)
  const operators = await db.select().from(schema.user).where(eq(schema.user.role, "OPERATOR"))

  console.log("Menghapus data demo lama...")
  const lama = db.select({ id: schema.pengajuan.id }).from(schema.pengajuan).where(like(schema.pengajuan.noRegistrasi, "DEMO/%"))
  const kartuLama = db.select({ id: schema.kartu.id }).from(schema.kartu).where(sql`${schema.kartu.pengajuanId} in ${lama}`)
  await db.delete(schema.blacklist).where(sql`${schema.blacklist.sanksiId} in (select id from sanksi where kartu_id in ${kartuLama})`)
  await db.delete(schema.sanksi).where(sql`${schema.sanksi.kartuId} in ${kartuLama}`)
  await db.delete(schema.kartu).where(sql`${schema.kartu.pengajuanId} in ${lama}`)
  await db.delete(schema.pengajuan).where(like(schema.pengajuan.noRegistrasi, "DEMO/%"))
  // NIK demo diawali "99" (kode wilayah fiktif)
  await db.delete(schema.pemohon).where(like(schema.pemohon.nikWilayah, "99%"))
  await db.delete(schema.perusahaan).where(like(schema.perusahaan.nib, "DEMO%"))

  // perusahaan per Polda
  const perusahaanRows = poldaList.flatMap((p) => [
    ...BUJP.slice(0, 3).map((nama, i) => ({ nama: `${nama} ${p.provinsi}`, jenis: "BUJP" as const, nib: `DEMO${p.id}B${i}`, poldaId: p.id })),
    ...LEASING.slice(0, 2).map((nama, i) => ({ nama: `${nama} ${p.provinsi}`, jenis: "PEMBIAYAAN" as const, nib: `DEMO${p.id}L${i}`, poldaId: p.id })),
  ])
  const perusahaan = await db.insert(schema.perusahaan).values(perusahaanRows).returning()

  // bobot Polda: provinsi padat penduduk dapat lebih banyak pendataan
  const bobot: Record<string, number> = { MTRJAYA: 10, JABAR: 9, JATIM: 8, JATENG: 7, SUMUT: 5, BANTEN: 5, SULSEL: 4, SUMSEL: 3, RIAU: 3, BALI: 3, LAMPUNG: 3, KALTIM: 3 }
  const poldaPool = poldaList.flatMap((p) => Array(bobot[p.kode] ?? 1).fill(p))

  console.log(`Membuat ${TOTAL} pendataan demo...`)
  for (let i = 0; i < TOTAL; i++) {
    const p = pick(poldaPool)
    const profesi = rand() < 0.68 ? "SATPAM" : "DEBT_COLLECTOR"
    const createdAt = tanggalAcak()
    const umurHari = (Date.now() - createdAt.getTime()) / 86_400_000
    const prov = p.provinsiKode[0] ?? "31"
    const operator = operators.find((o) => o.poldaId === p.id) ?? operators[0]
    const perus = perusahaan.filter((c) => c.poldaId === p.id && c.jenis === (profesi === "SATPAM" ? "BUJP" : "PEMBIAYAAN"))

    // status: makin lama makin besar kemungkinan sudah dicetak
    const r = rand()
    const status = umurHari < 3 && r < 0.5 ? "DRAF" : r < 0.07 ? "DRAF" : umurHari < 7 && r < 0.4 ? "TERVERIFIKASI" : r < 0.12 ? "TERVERIFIKASI" : "DICETAK"

    const [pemohon] = await db
      .insert(schema.pemohon)
      .values({
        // NIK demo diawali 99 agar tidak bentrok dengan NIK asli
        ...kolomNik(`99${prov}${pad(i, 12)}`),
        nama: `${pick(DEPAN)} ${pick(BELAKANG)}`,
        jenisKelamin: rand() < 0.85 ? "L" : "P",
        pendidikan: pick(["SMA", "SMK", "D3", "S1"]),
        createdAt,
      })
      .returning()

    const [pengajuan] = await db
      .insert(schema.pengajuan)
      .values({
        noRegistrasi: `DEMO/${p.kode}/${pad(i + 1, 6)}`,
        pemohonId: pemohon.id,
        profesi,
        jenis: rand() < 0.82 ? "BARU" : "PERPANJANGAN",
        perusahaanId: pick(perus)?.id,
        poldaId: p.id,
        operatorId: operator.id,
        status,
        kekurangan: status === "DRAF" ? [pick(["SKCK belum diunggah", "Sidik jari belum direkam", "Surat sehat kedaluwarsa"])] : [],
        terverifikasiAt: status === "DRAF" ? null : createdAt,
        createdAt,
        updatedAt: createdAt,
      })
      .returning()

    if (status === "DICETAK") {
      const terbit = new Date(createdAt.getTime() + 86_400_000 * (1 + Math.floor(rand() * 3)))
      const berlaku = new Date(terbit)
      berlaku.setFullYear(berlaku.getFullYear() + 2)
      // sebagian kartu dibuat segera kedaluwarsa (≤ 30 hari) agar fitur pengingat terlihat
      if (rand() < 0.05) berlaku.setTime(Date.now() + 86_400_000 * (1 + Math.floor(rand() * 29)))
      const rs = rand()
      const statusKartu = rs < 0.025 ? "DIBEKUKAN" : rs < 0.035 ? "DICABUT" : "AKTIF"
      const [kartu] = await db
        .insert(schema.kartu)
        .values({
          pengajuanId: pengajuan.id,
          noKta: `${profesi === "SATPAM" ? "S" : "D"}-${p.kode}-${terbit.getFullYear()}-${pad(i + 1, 6)}`,
          terbitAt: terbit.toISOString().slice(0, 10),
          berlakuSd: berlaku.toISOString().slice(0, 10),
          qrToken: randomUUID(),
          status: statusKartu,
          dicetakBy: operator.id,
          dicetakAt: terbit,
        })
        .returning()
      if (statusKartu !== "AKTIF") {
        await db.insert(schema.sanksi).values({
          kartuId: kartu.id,
          jenis: statusKartu === "DIBEKUKAN" ? "BEKU" : "CABUT",
          alasan: statusKartu === "DIBEKUKAN" ? "Data tidak sesuai" : "Dokumen palsu",
          keterangan: "Data demo",
          oleh: operator.id,
          // waktu sanksi acak setelah kartu terbit (bukan saat seed dijalankan)
          at: new Date(Math.min(Date.now() - 3_600_000, terbit.getTime() + rand() * (Date.now() - terbit.getTime()))),
        })
      }
    }
    if ((i + 1) % 500 === 0) console.log(`  ${i + 1}/${TOTAL}`)
  }

  console.log("Data demo selesai.")
  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
