import { z } from "zod"

/**
 * Skema data formulir pendataan — dipakai di formulir (klien) dan server action.
 * Skema ini hanya memeriksa format; kelengkapan dinilai oleh mesin verifikasi otomatis
 * (src/server/verifikasi.ts). Data hanya disimpan bila semua aturan verifikasi lolos.
 */
const opsional = z.string().trim().optional().or(z.literal("")).transform((v) => v || undefined)
const tanggal = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal tidak valid")
  .optional()
  .or(z.literal(""))
  .transform((v) => v || undefined)

export const dokumenInput = z.object({
  fileKey: opsional,
  nomor: opsional,
  tglTerbit: tanggal,
  berlakuSd: tanggal,
})

export const pendataanSchema = z.object({
  profesi: z.enum(["SATPAM", "DEBT_COLLECTOR"], { message: "Pilih profesi" }),
  jenis: z.enum(["BARU", "PERPANJANGAN", "PENGGANTIAN"], { message: "Pilih jenis pengajuan" }),

  nik: z.string().trim().regex(/^\d{16}$/, "NIK harus 16 digit angka"),
  nama: z.string().trim().min(3, "Nama minimal 3 huruf").max(120),
  tempatLahir: opsional,
  tglLahir: tanggal,
  jenisKelamin: z.enum(["L", "P"]).optional(),
  pendidikan: opsional,
  tinggiBadan: z.coerce.number().int().min(100).max(250).optional().or(z.literal("").transform(() => undefined)),
  noHp: z
    .string()
    .trim()
    .regex(/^(\+62|0)8\d{7,12}$/, "Nomor HP tidak valid (contoh 081234567890)")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  alamat: opsional,
  provinsi: opsional,
  kabupaten: opsional,
  kecamatan: opsional,
  kodeDesa: opsional,

  perusahaanId: z.coerce.number().int().positive().optional().or(z.literal("").transform(() => undefined)),
  jenjangGada: z.enum(["PRATAMA", "MADYA", "UTAMA"]).optional(),
  noSertifikatGada: opsional,
  noSppi: opsional,
  sppiBerlakuSd: tanggal,
  wilayahOperasi: opsional,

  // kunci = id jenis dokumen
  dokumen: z.record(z.string(), dokumenInput).default({}),
  // dokumen tambahan untuk jenis yang boleh lebih dari satu (mis. beberapa sertifikat); kunci = id jenis dokumen
  dokumenTambahan: z.record(z.string(), z.array(dokumenInput)).default({}),

  fotoKey: opsional,
  ttdKey: opsional,
  sidikJariKey: opsional,
})

export type PendataanInput = z.input<typeof pendataanSchema>
export type PendataanData = z.output<typeof pendataanSchema>

export const PENDIDIKAN = ["SD", "SMP", "SMA", "SMK", "D3", "D4", "S1", "S2"] as const
export const PENDIDIKAN_MIN = ["SMA", "SMK", "D3", "D4", "S1", "S2"]
