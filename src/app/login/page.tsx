import { redirect } from "next/navigation"
import { Lock, ShieldCheck } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import { getSession, homeFor, type Role } from "@/server/auth"
import { getDemoAccounts } from "@/server/queries"
import { DemoLoginDialog } from "./demo-login-dialog"
import { LoginForm } from "./login-form"

export default async function LoginPage() {
  const session = await getSession()
  if (session) redirect(homeFor(session.user.role as Role))
  const demoAccounts = await getDemoAccounts()

  return (
    <main className="grid min-h-svh lg:grid-cols-2">
      {/* Panel kiri: branding (selalu bernuansa gelap) */}
      <section className="bg-hero-gradient relative hidden overflow-hidden p-12 text-hero-foreground lg:flex lg:flex-col">
        <div className="pointer-events-none absolute top-1/2 -right-40 size-[560px] -translate-y-1/2 rounded-full border border-white/10" />
        <div className="pointer-events-none absolute top-1/2 -right-24 size-[420px] -translate-y-1/2 rounded-full border border-white/10" />
        <div className="pointer-events-none absolute top-1/2 -right-8 size-[300px] -translate-y-1/2 rounded-full bg-white/10 blur-sm" />

        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20">
            <ShieldCheck className="size-6" />
          </div>
          <div className="leading-tight">
            <p className="font-semibold">SADC</p>
            <p className="text-sm text-hero-foreground/70">Baharkam Polri</p>
          </div>
        </div>

        <div className="relative my-auto max-w-lg space-y-6">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-sm">
            <span className="size-1.5 rounded-full bg-warning" /> Pendataan KTA &amp; sertifikat
          </span>
          <h1 className="text-5xl font-bold leading-[1.1] tracking-tight">
            Tertib data,
            <br />
            aman di lapangan.
          </h1>
          <p className="text-lg text-hero-foreground/80">
            Satu sistem untuk mendata, menerbitkan, dan mengawasi KTA Satpam serta Debt Collector di seluruh Polda.
          </p>
          <div className="flex flex-wrap gap-2">
            {["Pendataan", "Verifikasi otomatis", "Pengawasan"].map((t) => (
              <span key={t} className="rounded-lg border border-white/15 bg-white/10 px-3 py-1.5 text-sm">
                {t}
              </span>
            ))}
          </div>
        </div>

        <p className="text-sm text-hero-foreground/60">SADC · Sistem Pendataan Satpam &amp; Debt Collector</p>
      </section>

      {/* Panel kanan: form */}
      <section className="relative flex items-center justify-center p-6">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>
        <div className="w-full max-w-md space-y-5">
          <div className="flex items-center gap-3 lg:hidden">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <ShieldCheck className="size-5" />
            </div>
            <p className="font-semibold">SADC · Baharkam Polri</p>
          </div>
          <LoginForm>
            {demoAccounts && (
              <DemoLoginDialog accounts={demoAccounts} password={process.env.DEMO_PASSWORD ?? ""} />
            )}
          </LoginForm>
          <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Lock className="size-3.5" /> Akses hanya untuk petugas yang berwenang
          </p>
        </div>
      </section>
    </main>
  )
}
