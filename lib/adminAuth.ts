// lib/adminAuth.ts
import { NextRequest, NextResponse } from "next/server";

/** Liest Admin-Token aus Header, Query ODER Cookie (`admin_key`). */
export function readAdminKey(req: NextRequest): string {
  const header = req.headers.get("x-admin-key") || "";
  const query  = req.nextUrl?.searchParams?.get("key") || "";
  // Cookie (httpOnly) → vom /api/admin/login gesetzt
  const cookie = req.cookies.get("admin_key")?.value || "";
  return header || query || cookie || "";
}

/**
 * Stellt sicher, dass der Aufrufer Admin ist.
 * Gibt bei Fehler eine NextResponse (401/403/500) zurück, sonst null.
 */
export function ensureAdmin(req: NextRequest): NextResponse | null {
  const clientKey = readAdminKey(req);
  const serverKey =
    process.env.ADMIN_TOKEN || process.env.NEXT_PUBLIC_ADMIN_TOKEN || "";

  if (!serverKey) {
    return NextResponse.json(
      { error: "Server misconfigured: ADMIN_TOKEN missing" },
      { status: 500 }
    );
  }

  if (!clientKey || clientKey !== serverKey) {
    return NextResponse.json(
      { error: "Unauthorized: invalid admin token." },
      { status: 401 }
    );
  }

  return null;
}