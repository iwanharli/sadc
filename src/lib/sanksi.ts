import { z } from "zod"

export const ALASAN_SANKSI = [
  "Dokumen palsu",
  "Data tidak sesuai",
  "Pelanggaran etik",
  "Tindak pidana",
  "Lainnya",
] as const

export const sanksiSchema = z.object({
  kartuId: z.number().int().positive(),
  jenis: z.enum(["BEKU", "CABUT", "PULIH"]),
  alasan: z.string().trim().min(1, "Pilih alasan"),
  keterangan: z.string().trim().min(10, "Keterangan minimal 10 karakter").max(1000),
  buktiKey: z.string().optional(),
  // pembekuan: batas waktu tinjau ulang (opsional)
  berlakuSd: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .or(z.literal("").transform(() => undefined)),
})

export type SanksiInput = z.input<typeof sanksiSchema>
