import { AppShell } from "@/components/app-shell"
import { requireUser } from "@/server/auth"
import { getPoldaNama } from "@/server/queries"

export default async function OperatorLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser("OPERATOR")
  const wilayah = await getPoldaNama(user.poldaId)

  return (
    <AppShell role="OPERATOR" user={{ id: user.id, name: user.name, poldaId: user.poldaId, wilayah }}>
      {children}
    </AppShell>
  )
}
