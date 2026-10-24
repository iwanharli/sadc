import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { nextCookies } from "better-auth/next-js"
import { username } from "better-auth/plugins/username"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { db, schema } from "./db"

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  emailAndPassword: {
    enabled: true,
    // akun hanya dibuat oleh Admin
    disableSignUp: true,
    minPasswordLength: 8,
  },
  session: {
    expiresIn: 60 * 60 * 8, // 8 jam
  },
  user: {
    additionalFields: {
      role: { type: "string", required: true, defaultValue: "OPERATOR", input: false },
      poldaId: { type: "number", required: false, input: false },
      aktif: { type: "boolean", required: true, defaultValue: true, input: false },
    },
  },
  rateLimit: { enabled: true, window: 60, max: 20 },
  advanced: {
    // cookie Secure otomatis bila diakses lewat HTTPS; paksa di produksi
    useSecureCookies: process.env.NODE_ENV === "production" && process.env.BETTER_AUTH_URL?.startsWith("https://"),
    defaultCookieAttributes: { sameSite: "lax", httpOnly: true },
  },
  plugins: [username(), nextCookies()],
})

export type Role = "OPERATOR" | "ADMIN"
export type SessionUser = typeof auth.$Infer.Session.user

export async function getSession() {
  return auth.api.getSession({ headers: await headers() })
}

/** Ambil user yang login; redirect bila belum login / role tidak sesuai. */
export async function requireUser(role?: Role) {
  const session = await getSession()
  if (!session || !session.user.aktif) redirect("/login")
  if (role && session.user.role !== role) redirect(homeFor(session.user.role as Role))
  return session.user
}

export function homeFor(role: Role) {
  return role === "ADMIN" ? "/admin" : "/operator"
}
