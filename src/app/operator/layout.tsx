import { AppShell } from "@/components/app-shell"
import { requireUser } from "@/server/auth"
import { getPoldaNama } from "@/server/queries"

export default async function OperatorLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser("OPERATOR")
  const wilayah = await getPoldaNama(user.poldaId)

  return (
    <AppShell role="OPERATOR" user={{ name: user.name, wilayah }}>
      {children}
    </AppShell>
  )
}
