import { z } from "zod"

export const jenisDokumenSchema = z.object({
  kode: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9_]{2,30}$/, "Kode 2–30 karakter: huruf besar, angka, garis bawah"),
  nama: z.string().trim().min(3, "Nama minimal 3 huruf").max(120),
  profesi: z.enum(["UMUM", "SATPAM", "DEBT_COLLECTOR"]),
  wajib: z.boolean(),
  wajibUntuk: z.array(z.enum(["BARU", "PERPANJANGAN", "PENGGANTIAN"])),
  adaMasaBerlaku: z.boolean(),
  urutan: z.coerce.number().int().min(0).max(999),
  aktif: z.boolean(),
})
export type JenisDokumenInput = z.input<typeof jenisDokumenSchema>

export const perusahaanSchema = z.object({
  nama: z.string().trim().min(3, "Nama minimal 3 huruf").max(150),
  jenis: z.enum(["BUJP", "PEMBIAYAAN"]),
  nib: z.string().trim().max(20).optional().or(z.literal("")),
  noIzin: z.string().trim().max(100).optional().or(z.literal("")),
  alamat: z.string().trim().max(300).optional().or(z.literal("")),
  poldaId: z.coerce.number().int().positive({ message: "Pilih Polda" }),
  aktif: z.boolean(),
})
export type PerusahaanInput = z.input<typeof perusahaanSchema>
