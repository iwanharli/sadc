"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { ArrowRight, Eye, EyeOff, Loader2, Lock, User } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { authClient } from "@/lib/auth-client"
import { errorDialog } from "@/lib/swal"

const schema = z.object({
  username: z.string().min(1, "Username wajib diisi"),
  password: z.string().min(1, "Sandi wajib diisi"),
})

export function LoginForm({ children }: { children?: React.ReactNode }) {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { username: "", password: "" },
  })

  async function onSubmit(values: z.infer<typeof schema>) {
    const { error } = await authClient.signIn.username(values)
    if (error) {
      if (error.status === 429) {
        await errorDialog("Terlalu banyak percobaan", "Tunggu sebentar sebelum mencoba masuk lagi.")
      } else {
        await errorDialog("Gagal masuk", "Username atau sandi tidak sesuai.")
      }
      return
    }
    router.replace("/")
    router.refresh()
  }

  const { errors, isSubmitting } = form.formState

  return (
    <Card className="gap-0 p-8 shadow-xl">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Portal petugas</p>
      <h2 className="mt-2 text-3xl font-bold tracking-tight">Selamat datang</h2>
      <p className="mt-2 text-muted-foreground">Masuk menggunakan akun dinas Anda.</p>

      <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 space-y-5">
        <div className="space-y-2">
          <Label htmlFor="username">Username</Label>
          <div className="relative">
            <User className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="username"
              className="h-11 pl-10"
              autoComplete="username"
              autoFocus
              aria-invalid={!!errors.username}
              {...form.register("username")}
            />
          </div>
          {errors.username && <p className="text-sm text-destructive">{errors.username.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Sandi</Label>
          <div className="relative">
            <Lock className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              className="h-11 px-10"
              autoComplete="current-password"
              aria-invalid={!!errors.password}
              {...form.register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={showPassword ? "Sembunyikan sandi" : "Tampilkan sandi"}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
        </div>

        <Button type="submit" size="lg" className="h-11 w-full text-base shadow-md" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
          {isSubmitting ? "Memproses..." : "Masuk ke dashboard"}
        </Button>
      </form>
      {children && <div className="mt-5 flex">{children}</div>}
    </Card>
  )
}
