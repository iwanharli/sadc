import { getSessionCookie } from "better-auth/cookies"
import { NextResponse, type NextRequest } from "next/server"

// Cek cepat keberadaan cookie sesi; validasi sesi & role dilakukan di layout (requireUser).
export function middleware(request: NextRequest) {
  if (!getSessionCookie(request)) {
    return NextResponse.redirect(new URL("/login", request.url))
  }
  return NextResponse.next()
}

export const config = {
  matcher: ["/operator/:path*", "/admin/:path*"],
}
