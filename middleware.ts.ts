// app/middleware.ts
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // nichts tun für Dateien, API, Assets
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.match(/\.(png|jpg|jpeg|gif|svg|ico|webp|txt|xml)$/)
  ) {
    return NextResponse.next()
  }

  // Root auf /de umleiten
  if (pathname === "/") {
    const url = req.nextUrl.clone()
    url.pathname = "/de"
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next|.*\\..*|api).*)"],
}
