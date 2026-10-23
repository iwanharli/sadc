import {
  boolean,
  date,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  serial,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core"

// ---------- Enum ----------

export const roleEnum = pgEnum("role", ["OPERATOR", "ADMIN"])
export const profesiEnum = pgEnum("profesi", ["SATPAM", "DEBT_COLLECTOR"])
export const profesiDokumenEnum = pgEnum("profesi_dokumen", ["UMUM", "SATPAM", "DEBT_COLLECTOR"])
export const jenisPengajuanEnum = pgEnum("jenis_pengajuan", ["BARU", "PERPANJANGAN", "PENGGANTIAN"])
export const statusPengajuanEnum = pgEnum("status_pengajuan", [
  "DRAF",
  "TERVERIFIKASI",
  "DICETAK",
])
export const statusKartuEnum = pgEnum("status_kartu", ["AKTIF", "DIBEKUKAN", "DICABUT", "KEDALUWARSA"])
export const jenisPerusahaanEnum = pgEnum("jenis_perusahaan", ["BUJP", "PEMBIAYAAN"])
export const jenisSanksiEnum = pgEnum("jenis_sanksi", ["BEKU", "CABUT", "PULIH"])
export const jenisKelaminEnum = pgEnum("jenis_kelamin", ["L", "P"])
export const jenjangGadaEnum = pgEnum("jenjang_gada", ["PRATAMA", "MADYA", "UTAMA"])

const timestamps = {
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
}

// ---------- Wilayah ----------

// Kode wilayah administrasi Kemendagri: 1 provinsi, 2 kab/kota, 3 kecamatan, 4 desa/kelurahan.
export const wilayah = pgTable("wilayah", {
  kode: varchar("kode", { length: 13 }).primaryKey(),
  nama: text("nama").notNull(),
  level: smallint("level").notNull(),
  parentKode: varchar("parent_kode", { length: 13 }),
  lat: doublePrecision("lat"),
  lng: doublePrecision("lng"),
}, (t) => [index("wilayah_parent_idx").on(t.parentKode), index("wilayah_level_idx").on(t.level)])

export const polda = pgTable("polda", {
  id: serial("id").primaryKey(),
  kode: varchar("kode", { length: 10 }).notNull().unique(),
  nama: text("nama").notNull(),
  provinsi: text("provinsi").notNull(),
  // WIB = Asia/Jakarta, WITA = Asia/Makassar, WIT = Asia/Jayapura
  zonaWaktu: text("zona_waktu").notNull().default("Asia/Jakarta"),
  // kode provinsi Kemendagri yang menjadi wilayah hukum Polda
  provinsiKode: varchar("provinsi_kode", { length: 2 }).array().notNull().default([]),
})

export const polres = pgTable("polres", {
  id: serial("id").primaryKey(),
  poldaId: integer("polda_id")
    .notNull()
    .references(() => polda.id),
  nama: text("nama").notNull(),
})

// ---------- Auth (Better Auth) ----------

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  username: text("username").unique(),
  displayUsername: text("display_username"),
  role: roleEnum("role").notNull().default("OPERATOR"),
  poldaId: integer("polda_id").references(() => polda.id),
  aktif: boolean("aktif").notNull().default(true),
  ...timestamps,
})

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  ...timestamps,
})

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  ...timestamps,
})

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  ...timestamps,
})

// ---------- Master ----------

export const perusahaan = pgTable("perusahaan", {
  id: serial("id").primaryKey(),
  nama: text("nama").notNull(),
  jenis: jenisPerusahaanEnum("jenis").notNull(),
  nib: varchar("nib", { length: 20 }),
  noIzin: text("no_izin"),
  alamat: text("alamat"),
  poldaId: integer("polda_id").references(() => polda.id),
  aktif: boolean("aktif").notNull().default(true),
  ...timestamps,
})

export const jenisDokumen = pgTable("jenis_dokumen", {
  id: serial("id").primaryKey(),
  kode: varchar("kode", { length: 30 }).notNull(),
  nama: text("nama").notNull(),
  profesi: profesiDokumenEnum("profesi").notNull(),
  wajib: boolean("wajib").notNull().default(true),
  // hanya wajib untuk jenis pengajuan tertentu (null = semua jenis)
  wajibUntuk: jenisPengajuanEnum("wajib_untuk").array(),
  adaMasaBerlaku: boolean("ada_masa_berlaku").notNull().default(false),
  urutan: integer("urutan").notNull().default(0),
  aktif: boolean("aktif").notNull().default(true),
}, (t) => [uniqueIndex("jenis_dokumen_kode_profesi").on(t.kode, t.profesi)])

// ---------- Pendataan ----------

export const pemohon = pgTable("pemohon", {
  id: serial("id").primaryKey(),
  nik: varchar("nik", { length: 16 }).notNull().unique(),
  nama: text("nama").notNull(),
  tempatLahir: text("tempat_lahir"),
  tglLahir: date("tgl_lahir"),
  jenisKelamin: jenisKelaminEnum("jenis_kelamin"),
  alamat: text("alamat"),
  // kode desa/kelurahan Kemendagri (level 4 tabel wilayah)
  kodeDesa: varchar("kode_desa", { length: 13 }).references(() => wilayah.kode),
  noHp: varchar("no_hp", { length: 20 }),
  pendidikan: text("pendidikan"),
  tinggiBadan: integer("tinggi_badan"),
  fotoUrl: text("foto_url"),
  ttdUrl: text("ttd_url"),
  sidikJariUrl: text("sidik_jari_url"),
  ...timestamps,
})

export const pengajuan = pgTable("pengajuan", {
  id: serial("id").primaryKey(),
  noRegistrasi: varchar("no_registrasi", { length: 40 }).notNull().unique(),
  pemohonId: integer("pemohon_id")
    .notNull()
    .references(() => pemohon.id),
  profesi: profesiEnum("profesi").notNull(),
  jenis: jenisPengajuanEnum("jenis").notNull().default("BARU"),
  perusahaanId: integer("perusahaan_id").references(() => perusahaan.id),
  poldaId: integer("polda_id")
    .notNull()
    .references(() => polda.id),
  operatorId: text("operator_id")
    .notNull()
    .references(() => user.id),
  status: statusPengajuanEnum("status").notNull().default("DRAF"),
  kekurangan: jsonb("kekurangan").$type<string[]>().notNull().default([]),
  // biometrik direkam per pengajuan (foto terbaru untuk kartu)
  fotoUrl: text("foto_url"),
  ttdUrl: text("ttd_url"),
  sidikJariUrl: text("sidik_jari_url"),
  terverifikasiAt: timestamp("terverifikasi_at"),
  ...timestamps,
}, (t) => [
  index("pengajuan_polda_status_idx").on(t.poldaId, t.status),
  index("pengajuan_profesi_idx").on(t.profesi),
  index("pengajuan_created_idx").on(t.createdAt),
])

export const detailSatpam = pgTable("detail_satpam", {
  pengajuanId: integer("pengajuan_id")
    .primaryKey()
    .references(() => pengajuan.id, { onDelete: "cascade" }),
  jenjangGada: jenjangGadaEnum("jenjang_gada"),
  noSertifikatGada: text("no_sertifikat_gada"),
})

export const detailDc = pgTable("detail_dc", {
  pengajuanId: integer("pengajuan_id")
    .primaryKey()
    .references(() => pengajuan.id, { onDelete: "cascade" }),
  noSppi: text("no_sppi"),
  sppiBerlakuSd: date("sppi_berlaku_sd"),
  wilayahOperasi: text("wilayah_operasi"),
})

export const dokumen = pgTable("dokumen", {
  id: serial("id").primaryKey(),
  pengajuanId: integer("pengajuan_id")
    .notNull()
    .references(() => pengajuan.id, { onDelete: "cascade" }),
  jenisDokumenId: integer("jenis_dokumen_id")
    .notNull()
    .references(() => jenisDokumen.id),
  fileUrl: text("file_url").notNull(),
  nomor: text("nomor"),
  tglTerbit: date("tgl_terbit"),
  berlakuSd: date("berlaku_sd"),
  ditandaiPalsu: boolean("ditandai_palsu").notNull().default(false),
  ...timestamps,
})

export const kartu = pgTable("kartu", {
  id: serial("id").primaryKey(),
  pengajuanId: integer("pengajuan_id")
    .notNull()
    .references(() => pengajuan.id),
  noKta: varchar("no_kta", { length: 40 }).notNull().unique(),
  terbitAt: date("terbit_at").notNull(),
  berlakuSd: date("berlaku_sd").notNull(),
  qrToken: text("qr_token").notNull().unique(),
  status: statusKartuEnum("status").notNull().default("AKTIF"),
  dicetakBy: text("dicetak_by").references(() => user.id),
  dicetakAt: timestamp("dicetak_at"),
}, (t) => [index("kartu_status_berlaku_idx").on(t.status, t.berlakuSd)])

// ---------- Sanksi ----------

export const sanksi = pgTable("sanksi", {
  id: serial("id").primaryKey(),
  kartuId: integer("kartu_id")
    .notNull()
    .references(() => kartu.id),
  jenis: jenisSanksiEnum("jenis").notNull(),
  alasan: text("alasan").notNull(),
  keterangan: text("keterangan"),
  buktiUrl: text("bukti_url"),
  berlakuSd: date("berlaku_sd"),
  oleh: text("oleh")
    .notNull()
    .references(() => user.id),
  at: timestamp("at").notNull().defaultNow(),
})

export const blacklist = pgTable("blacklist", {
  id: serial("id").primaryKey(),
  nik: varchar("nik", { length: 16 }).notNull(),
  alasan: text("alasan").notNull(),
  sanksiId: integer("sanksi_id").references(() => sanksi.id),
  berlakuSd: date("berlaku_sd"),
  aktif: boolean("aktif").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
})

// ---------- Jejak ----------

export const riwayatStatus = pgTable("riwayat_status", {
  id: serial("id").primaryKey(),
  pengajuanId: integer("pengajuan_id")
    .notNull()
    .references(() => pengajuan.id, { onDelete: "cascade" }),
  dari: text("dari"),
  ke: text("ke").notNull(),
  // null = SISTEM (verifikasi otomatis)
  oleh: text("oleh").references(() => user.id),
  catatan: text("catatan"),
  data: jsonb("data"),
  at: timestamp("at").notNull().defaultNow(),
})

export const auditLog = pgTable("audit_log", {
  id: serial("id").primaryKey(),
  userId: text("user_id").references(() => user.id),
  aksi: text("aksi").notNull(),
  entitas: text("entitas").notNull(),
  entitasId: text("entitas_id"),
  ip: text("ip"),
  data: jsonb("data"),
  at: timestamp("at").notNull().defaultNow(),
})
