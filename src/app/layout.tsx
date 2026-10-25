import type { Metadata } from "next"
import { Geist_Mono, Plus_Jakarta_Sans } from "next/font/google"
import NextTopLoader from "nextjs-toploader"
import { ThemeProvider } from "@/components/theme-provider"
import { TimezoneSync } from "@/components/timezone-sync"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import "./globals.css"

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "SADC — Pendataan Satpam & Petugas Penagih",
  description: "Sistem pendataan KTA & sertifikat Satpam dan Petugas Penagih",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="id" className={`${jakarta.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <body className="antialiased">
        {/* bilah progres di atas layar setiap kali berpindah halaman */}
        <NextTopLoader color="var(--primary)" height={3} showSpinner={false} shadow="0 0 10px var(--primary)" crawlSpeed={150} />
        <ThemeProvider>
          <TooltipProvider delayDuration={0}>{children}</TooltipProvider>
          <Toaster richColors position="top-right" />
          <TimezoneSync />
        </ThemeProvider>
      </body>
    </html>
  )
}
