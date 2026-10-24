"use client"

import { KeyRound, Loader2 } from "lucide-react"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { swal } from "@/lib/swal"
import { gantiSandi } from "@/server/actions/profil"

type F = { lama: string; baru: string; ulang: string }

export function GantiSandi() {
  const [buka, setBuka] = useState(false)
  const { register, handleSubmit, formState, reset, setError } = useForm<F>()
  const e = formState.errors

  const kirim = handleSubmit(async (v) => {
    if (v.baru !== v.ulang) return setError("ulang", { message: "Konfirmasi sandi tidak sama" })
    const r = await gantiSandi(v.lama, v.baru)
    if (!r.ok) return setError(r.error.includes("lama") ? "lama" : "baru", { message: r.error })
    reset()
    setBuka(false)
    swal.fire({ icon: "success", title: "Sandi diperbarui", text: "Sesi di perangkat lain telah diakhiri.", timer: 2200, showConfirmButton: false })
  })

  if (!buka)
    return (
      <Button variant="outline" size="lg" className="h-11 w-full text-[15px]" onClick={() => setBuka(true)}>
        <KeyRound className="size-4" /> Ganti kata sandi
      </Button>
    )

  return (
    <form onSubmit={kirim} className="space-y-4">
      {(
        [
          ["lama", "Sandi saat ini", "current-password"],
          ["baru", "Sandi baru (min. 8 karakter)", "new-password"],
          ["ulang", "Ulangi sandi baru", "new-password"],
        ] as const
      ).map(([k, l, ac]) => (
        <div key={k} className="space-y-2">
          <Label className="text-[15px]">{l}</Label>
          <Input type="password" autoComplete={ac} {...register(k, { required: "Wajib diisi" })} className="h-11 text-[15px]" aria-invalid={!!e[k]} />
          {e[k] && <p className="text-sm text-destructive">{e[k]?.message}</p>}
        </div>
      ))}
      <div className="flex gap-2">
        <Button type="button" variant="outline" className="h-11 flex-1" onClick={() => setBuka(false)}>
          Batal
        </Button>
        <Button type="submit" className="h-11 flex-1" disabled={formState.isSubmitting}>
          {formState.isSubmitting && <Loader2 className="size-4 animate-spin" />} Simpan sandi
        </Button>
      </div>
    </form>
  )
}
