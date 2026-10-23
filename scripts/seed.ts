import "dotenv/config"
import { randomUUID } from "node:crypto"
import { hashPassword } from "better-auth/crypto"
import { eq, sql } from "drizzle-orm"
import { db, schema } from "../src/server/db"

// [kode, nama, provinsi, kode provinsi Kemendagri yang dicakup]
// Catatan: Polda Papua & Papua Barat sementara mencakup provinsi pemekaran — sesuaikan dengan struktur Polri terbaru.
const POLDA: [string, string, string, string[]][] = [
  ["ACEH", "Polda Aceh", "Aceh", ["11"]],
  ["SUMUT", "Polda Sumatera Utara", "Sumatera Utara", ["12"]],
  ["SUMBAR", "Polda Sumatera Barat", "Sumatera Barat", ["13"]],
  ["RIAU", "Polda Riau", "Riau", ["14"]],
  ["KEPRI", "Polda Kepulauan Riau", "Kepulauan Riau", ["21"]],
  ["JAMBI", "Polda Jambi", "Jambi", ["15"]],
  ["SUMSEL", "Polda Sumatera Selatan", "Sumatera Selatan", ["16"]],
  ["BABEL", "Polda Kepulauan Bangka Belitung", "Kepulauan Bangka Belitung", ["19"]],
  ["BENGKULU", "Polda Bengkulu", "Bengkulu", ["17"]],
  ["LAMPUNG", "Polda Lampung", "Lampung", ["18"]],
  ["MTRJAYA", "Polda Metro Jaya", "DKI Jakarta", ["31"]],
  ["BANTEN", "Polda Banten", "Banten", ["36"]],
  ["JABAR", "Polda Jawa Barat", "Jawa Barat", ["32"]],
  ["JATENG", "Polda Jawa Tengah", "Jawa Tengah", ["33"]],
  ["DIY", "Polda Daerah Istimewa Yogyakarta", "DI Yogyakarta", ["34"]],
  ["JATIM", "Polda Jawa Timur", "Jawa Timur", ["35"]],
  ["BALI", "Polda Bali", "Bali", ["51"]],
  ["NTB", "Polda Nusa Tenggara Barat", "Nusa Tenggara Barat", ["52"]],
  ["NTT", "Polda Nusa Tenggara Timur", "Nusa Tenggara Timur", ["53"]],
  ["KALBAR", "Polda Kalimantan Barat", "Kalimantan Barat", ["61"]],
  ["KALTENG", "Polda Kalimantan Tengah", "Kalimantan Tengah", ["62"]],
  ["KALSEL", "Polda Kalimantan Selatan", "Kalimantan Selatan", ["63"]],
  ["KALTIM", "Polda Kalimantan Timur", "Kalimantan Timur", ["64"]],
  ["KALTARA", "Polda Kalimantan Utara", "Kalimantan Utara", ["65"]],
  ["SULUT", "Polda Sulawesi Utara", "Sulawesi Utara", ["71"]],
  ["GORONTALO", "Polda Gorontalo", "Gorontalo", ["75"]],
  ["SULTENG", "Polda Sulawesi Tengah", "Sulawesi Tengah", ["72"]],
  ["SULBAR", "Polda Sulawesi Barat", "Sulawesi Barat", ["76"]],
  ["SULSEL", "Polda Sulawesi Selatan", "Sulawesi Selatan", ["73"]],
  ["SULTRA", "Polda Sulawesi Tenggara", "Sulawesi Tenggara", ["74"]],
  ["MALUKU", "Polda Maluku", "Maluku", ["81"]],
  ["MALUT", "Polda Maluku Utara", "Maluku Utara", ["82"]],
  ["PAPUA", "Polda Papua", "Papua", ["91", "93", "94", "95"]],
  ["PABAR", "Polda Papua Barat", "Papua Barat", ["92", "96"]],
]

type Dok = typeof schema.jenisDokumen.$inferInsert
const DOKUMEN: Dok[] = [
  { kode: "KTP", nama: "KTP", profesi: "UMUM" },
  { kode: "KK", nama: "Kartu Keluarga", profesi: "UMUM" },
  { kode: "IJAZAH", nama: "Ijazah terakhir (min. SMA/SMK)", profesi: "UMUM" },
  { kode: "SKCK", nama: "SKCK", profesi: "UMUM", adaMasaBerlaku: true },
  { kode: "SEHAT", nama: "Surat keterangan sehat jasmani & rohani", profesi: "UMUM", adaMasaBerlaku: true },
  { kode: "NARKOBA", nama: "Surat keterangan bebas narkoba", profesi: "UMUM", adaMasaBerlaku: true },
  { kode: "GADA", nama: "Sertifikat Gada Pratama / Madya / Utama", profesi: "SATPAM" },
  { kode: "SK_BUJP", nama: "Surat keterangan kerja / penugasan dari BUJP", profesi: "SATPAM" },
  { kode: "KTA_LAMA", nama: "KTA lama", profesi: "SATPAM", wajibUntuk: ["PERPANJANGAN", "PENGGANTIAN"] },
  { kode: "SPPI", nama: "Sertifikat profesi penagihan (lembaga terdaftar OJK)", profesi: "DEBT_COLLECTOR", adaMasaBerlaku: true },
  { kode: "SURAT_TUGAS", nama: "Surat tugas / kuasa dari perusahaan pembiayaan", profesi: "DEBT_COLLECTOR" },
  { kode: "IZIN_PERUSAHAAN", nama: "NIB / izin usaha perusahaan pembiayaan (OJK)", profesi: "DEBT_COLLECTOR" },
  { kode: "KTA_LAMA", nama: "KTA lama", profesi: "DEBT_COLLECTOR", wajibUntuk: ["PERPANJANGAN", "PENGGANTIAN"] },
]

const WITA = ["BALI", "NTB", "NTT", "KALSEL", "KALTIM", "KALTARA", "SULUT", "GORONTALO", "SULTENG", "SULBAR", "SULSEL", "SULTRA"]
const WIT = ["MALUKU", "MALUT", "PAPUA", "PABAR"]
const zonaWaktu = (kode: string) =>
  WIT.includes(kode) ? "Asia/Jayapura" : WITA.includes(kode) ? "Asia/Makassar" : "Asia/Jakarta"

// Satu operator demo per Polda (cakupan nasional), plus operator kedua di Polda Metro Jaya.
const NAMA_DEMO = [
  "Bripka Andi Saputra", "Brigpol Rina Marlina", "Bripka Dedi Kurniawan", "Aipda Sri Lestari",
  "Bripka Agus Santoso", "Brigpol Made Wirawan", "Bripka Rudi Siregar", "Aipda Yusuf Hamdani",
  "Bripka Fajar Nugroho", "Brigpol Dewi Anggraini", "Aiptu Hendra Gunawan", "Bripka Rahmat Hidayat",
]
const DEMO_OPERATOR = [
  ...POLDA.map(([kode], i) => ({
    username: `op.${kode.toLowerCase()}`,
    name: NAMA_DEMO[i % NAMA_DEMO.length],
    polda: kode,
  })),
  { username: "op.mtrjaya2", name: "Brigpol Rina Marlina", polda: "MTRJAYA" },
]

async function upsertUser(opts: {
  username: string
  name: string
  password: string
  role: "ADMIN" | "OPERATOR"
  poldaId?: number
}) {
  const existing = await db.query.user.findFirst({ where: eq(schema.user.username, opts.username) })
  if (existing) {
    // samakan nama, wilayah & sandi dengan data demo
    await db.update(schema.user).set({ name: opts.name, poldaId: opts.poldaId ?? null }).where(eq(schema.user.id, existing.id))
    await db
      .update(schema.account)
      .set({ password: await hashPassword(opts.password) })
      .where(eq(schema.account.userId, existing.id))
    return
  }
  const id = randomUUID()
  await db.insert(schema.user).values({
    id,
    name: opts.name,
    email: `${opts.username}@sadc.local`,
    emailVerified: true,
    username: opts.username,
    displayUsername: opts.username,
    role: opts.role,
    poldaId: opts.poldaId,
  })
  await db.insert(schema.account).values({
    id: randomUUID(),
    accountId: id,
    providerId: "credential",
    userId: id,
    password: await hashPassword(opts.password),
  })
  console.log(`  user ${opts.username} (${opts.role})`)
}

async function main() {
  await db
    .insert(schema.polda)
    .values(
      POLDA.map(([kode, nama, provinsi, provinsiKode]) => ({ kode, nama, provinsi, provinsiKode, zonaWaktu: zonaWaktu(kode) })),
    )
    .onConflictDoUpdate({
      target: schema.polda.kode,
      set: { zonaWaktu: sql`excluded.zona_waktu`, provinsiKode: sql`excluded.provinsi_kode` },
    })

  await db
    .insert(schema.jenisDokumen)
    .values(DOKUMEN.map((d, i) => ({ ...d, urutan: i + 1 })))
    .onConflictDoNothing()

  const password = process.env.DEMO_PASSWORD || "SadcDemo2026"
  const poldaId = async (kode: string) =>
    (await db.query.polda.findFirst({ where: eq(schema.polda.kode, kode) }))!.id

  await upsertUser({ username: "admin", name: "Administrator Sistem", password, role: "ADMIN" })
  for (const op of DEMO_OPERATOR) {
    await upsertUser({ username: op.username, name: op.name, password, role: "OPERATOR", poldaId: await poldaId(op.polda) })
  }
  console.log(`  sandi semua akun demo: ${password}`)

  console.log("Seed selesai.")
  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
