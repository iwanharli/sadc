"use server"

import { headers } from "next/headers"
import { sandiSchema } from "@/lib/pengguna-schema"
import { catatAudit } from "../audit"
import { auth, requireUser } from "../auth"

/** Ganti sandi sendiri; sesi di perangkat lain otomatis diakhiri. */
export async function gantiSandi(sandiLama: string, sandiBaru: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await requireUser()
  const s = sandiSchema.safeParse(sandiBaru)
  if (!s.success) return { ok: false, error: s.error.issues[0].message }
  if (sandiLama === sandiBaru) return { ok: false, error: "Sandi baru harus berbeda dari sandi lama" }
  try {
    await auth.api.changePassword({
      body: { currentPassword: sandiLama, newPassword: s.data, revokeOtherSessions: true },
      headers: await headers(),
    })
  } catch {
    return { ok: false, error: "Sandi lama tidak sesuai" }
  }
  await catatAudit(user.id, "GANTI_SANDI", "user", user.id)
  return { ok: true }
}
