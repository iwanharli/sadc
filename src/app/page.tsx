import { redirect } from "next/navigation"
import { getSession, homeFor, type Role } from "@/server/auth"

export default async function Home() {
  const session = await getSession()
  redirect(session ? homeFor(session.user.role as Role) : "/login")
}
