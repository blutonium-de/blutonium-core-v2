// middleware.ts
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Dinge, die NICHT umgeleitet werden sollen
  const ignore =
    pathname.startsWith("/de") ||            // unsere DE-Seiten
    pathname.startsWith("/api") ||           // API
    pathname.startsWith("/_next") ||         // Next.js intern
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/robots") ||
    pathname.startsWith("/sitemap") ||
    pathname.startsWith("/assets") ||        // falls du statische Pfade nutzt
    pathname.match(/\.[a-zA-Z0-9]+$/)       // Dateien wie .png, .css, .js, etc.

  // Nur Root "/" → nach /de weiterleiten
  if (pathname === "/" && !ignore) {
    const url = req.nextUrl.clone()
    url.pathname = "/de"
    return NextResponse.redirect(url, 307) // 307 = saubere, temporäre Weiterleitung
  }

  return NextResponse.next()
}
