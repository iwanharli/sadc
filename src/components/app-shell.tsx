import { cookies } from "next/headers"
import { getNotifikasi } from "@/server/notifikasi"
import { getZona } from "@/server/zona"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "./app-sidebar"
import { SiteHeader } from "./site-header"

export async function AppShell({
  role,
  user,
  children,
}: {
  role: "ADMIN" | "OPERATOR"
  user: { id: string; name: string; poldaId?: number | null; wilayah?: string | null }
  children: React.ReactNode
}) {
  // ingat status sidebar (buka/tutup) lewat cookie bawaan shadcn
  const defaultOpen = (await cookies()).get("sidebar_state")?.value !== "false"
  const { belumDibaca } = await getNotifikasi({ id: user.id, role, poldaId: user.poldaId }, await getZona())

  return (
    <SidebarProvider
      defaultOpen={defaultOpen}
      style={{ "--sidebar-width": "18rem", "--sidebar-width-icon": "4.25rem" } as React.CSSProperties}
    >
      <AppSidebar role={role} wilayah={user.wilayah ?? "Nasional"} />
      <SidebarInset>
        <SiteHeader role={role} name={user.name} notif={belumDibaca} />
        <div className="w-full min-w-0 flex-1 p-4 md:p-6 xl:px-8">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}
