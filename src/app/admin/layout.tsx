import { AppShell } from "@/components/app-shell"
import { requireUser } from "@/server/auth"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser("ADMIN")

  return (
    <AppShell role="ADMIN" user={{ id: user.id, name: user.name }}>
      {children}
    </AppShell>
  )
}
