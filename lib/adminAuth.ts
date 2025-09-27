// lib/adminAuth.ts
import { NextRequest, NextResponse } from "next/server";

/**
 * Liest den Admin-Token aus Header oder Query (?key=...).
 */
export function readAdminKey(req: NextRequest): string {
  const header = req.headers.get("x-admin-key") || "";
  const query = req.nextUrl?.searchParams?.get("key") || "";
  return header || query || "";
}

/**
 * Stellt sicher, dass der Aufrufer Admin ist.
 * Gibt bei Fehler eine NextResponse (401) zurück, sonst null.
 */
export function ensureAdmin(req: NextRequest): NextResponse | null {
  const clientKey = readAdminKey(req);
  const serverKey =
    process.env.ADMIN_TOKEN || process.env.NEXT_PUBLIC_ADMIN_TOKEN || "";

  if (!serverKey) {
    // Wenn kein Token gesetzt ist, blocken wir lieber hart.
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

  return null; // passt
}