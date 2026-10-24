import { z } from "zod"

export const penggunaSchema = z
  .object({
    name: z.string().trim().min(3, "Nama minimal 3 huruf").max(100),
    username: z
      .string()
      .trim()
      .toLowerCase()
      .regex(/^[a-z0-9._]{3,30}$/, "Username 3–30 karakter: huruf kecil, angka, titik, garis bawah"),
    role: z.enum(["OPERATOR", "ADMIN"]),
    poldaId: z.coerce.number().int().positive().optional().or(z.literal("").transform(() => undefined)),
    password: z.string().optional().or(z.literal("")),
  })
  .refine((v) => v.role === "ADMIN" || v.poldaId, { message: "Operator wajib memilih Polda", path: ["poldaId"] })

export type PenggunaInput = z.input<typeof penggunaSchema>

export const sandiSchema = z.string().min(8, "Sandi minimal 8 karakter").max(72)
