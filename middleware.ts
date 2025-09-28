// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Assets & APIs immer durchlassen
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.match(/\.(png|jpg|jpeg|gif|svg|ico|webp|txt|xml)$/)
  ) return NextResponse.next();

  // Cart-Flow frei
  if (pathname.startsWith("/de/cart") || pathname.startsWith("/de/merch")) {
    return NextResponse.next();
  }

  // Root → /de
  if (pathname === "/") {
    const url = req.nextUrl.clone();
    url.pathname = "/de";
    return NextResponse.redirect(url);
  }

  // Admin-Bereich schützen
  if (pathname.startsWith("/admin")) {
    const token = req.cookies.get("admin_auth")?.value;
    if (token !== process.env.ADMIN_TOKEN) {
      const loginUrl = req.nextUrl.clone();
      loginUrl.pathname = "/admin/login";
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|.*\\..*|api).*)"],
};