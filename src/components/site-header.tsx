"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Bell } from "lucide-react"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { adminNav, findCrumb, operatorNav } from "./nav"
import { ThemeToggle } from "./theme-toggle"
import { UserMenu } from "./user-menu"

export function SiteHeader({ role, name }: { role: "ADMIN" | "OPERATOR"; name: string }) {
  const pathname = usePathname()
  const crumb = findCrumb(role === "ADMIN" ? adminNav : operatorNav, pathname)
  const base = role === "ADMIN" ? "/admin" : "/operator"

  return (
    <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mx-1 data-[orientation=vertical]:h-5" />
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem className="hidden sm:block">{crumb?.group ?? "Beranda"}</BreadcrumbItem>
          <BreadcrumbSeparator className="hidden sm:block" />
          <BreadcrumbItem>
            <BreadcrumbPage className="font-medium">{crumb?.label ?? "Ringkasan"}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="ml-auto flex items-center gap-1">
        <Button variant="ghost" size="icon" asChild aria-label="Notifikasi">
          <Link href={`${base}/notifikasi`}>
            <Bell className="size-4" />
          </Link>
        </Button>
        <ThemeToggle />
        <Separator orientation="vertical" className="mx-1 data-[orientation=vertical]:h-6" />
        <UserMenu name={name} role={role} />
      </div>
    </header>
  )
}
