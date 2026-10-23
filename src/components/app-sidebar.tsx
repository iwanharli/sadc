"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { MapPin, ShieldCheck } from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"
import { adminNav, operatorNav } from "./nav"

export function AppSidebar({ role, wilayah }: { role: "ADMIN" | "OPERATOR"; wilayah: string }) {
  const pathname = usePathname()
  const groups = role === "ADMIN" ? adminNav : operatorNav
  const home = role === "ADMIN" ? "/admin" : "/operator"
  // menu aktif = href terpanjang yang cocok (agar /pemohon/baru tidak ikut menyalakan /pemohon)
  const aktifHref = groups
    .flatMap((g) => g.items.map((i) => i.href))
    .filter((h) => (h === home ? pathname === home : pathname === h || pathname.startsWith(h + "/")))
    .sort((a, b) => b.length - a.length)[0]

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-4 pt-5 pb-4 group-data-[collapsible=icon]:px-2">
        <Link
          href={home}
          className="flex items-center gap-3 rounded-xl group-data-[collapsible=icon]:justify-center"
        >
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-info text-primary-foreground shadow-md ring-1 ring-white/10 group-data-[collapsible=icon]:size-10">
            <ShieldCheck className="size-6" />
          </div>
          <div className="grid min-w-0 leading-tight group-data-[collapsible=icon]:hidden">
            <span className="truncate text-base font-bold tracking-tight">SADC Polri</span>
            <span className="truncate text-xs text-muted-foreground">Pendataan Satpam &amp; Debt Collector</span>
          </div>
        </Link>
        <div className="mt-4 h-px bg-sidebar-border group-data-[collapsible=icon]:hidden" />
      </SidebarHeader>

      <SidebarContent className="gap-1 px-2 pb-4">
        {groups.map((group) => (
          <SidebarGroup key={group.label} className="py-1.5">
            <SidebarGroupLabel className="mb-1 h-7 px-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/80">
              {group.label}
            </SidebarGroupLabel>
            <SidebarMenu className="gap-1.5">
              {group.items.map((item) => {
                const active = item.href === aktifHref
                return (
                  <SidebarMenuItem key={item.href} className="relative">
                    {/* penanda menu aktif di tepi kiri */}
                    <span
                      aria-hidden
                      className={cn(
                        "absolute top-2 bottom-2 -left-2 w-1 rounded-r-full bg-warning transition-opacity group-data-[collapsible=icon]:hidden",
                        active ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={item.label}
                      className={cn(
                        "h-12 gap-3 rounded-xl px-2.5 text-[15px] font-medium text-sidebar-foreground/85 transition-all",
                        "hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
                        "data-[active=true]:bg-sidebar-accent data-[active=true]:font-semibold data-[active=true]:text-sidebar-accent-foreground data-[active=true]:shadow-sm data-[active=true]:ring-1 data-[active=true]:ring-sidebar-primary/25",
                        "group-data-[collapsible=icon]:!size-11 group-data-[collapsible=icon]:!p-1",
                      )}
                    >
                      <Link href={item.href}>
                        <span
                          className={cn(
                            "flex size-9 shrink-0 items-center justify-center rounded-lg border transition-colors",
                            active
                              ? "border-transparent bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                              : "border-sidebar-border bg-background/40 text-sidebar-foreground/70",
                          )}
                        >
                          <item.icon className="!size-[18px]" />
                        </span>
                        <span className="truncate">{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="p-3 group-data-[collapsible=icon]:hidden">
        <div className="flex items-center gap-3 rounded-xl border border-sidebar-border bg-background/40 p-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/12 text-primary">
            <MapPin className="size-[18px]" />
          </div>
          <div className="min-w-0 leading-tight">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Wilayah</p>
            <p className="truncate text-sm font-semibold">{wilayah}</p>
          </div>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
