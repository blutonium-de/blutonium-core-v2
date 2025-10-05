// lib/adminGuard.ts
import { cookies, headers } from "next/headers";

export function assertAdmin() {
  const ADMIN_KEY = process.env.ADMIN_KEY || "";
  if (!ADMIN_KEY) return; // kein Schutz, falls nicht gesetzt

  const c = cookies();
  const cookieKey = c.get("admin_key")?.value || "";
  const headerKey = headers().get("x-admin-key") || "";

  if (cookieKey === ADMIN_KEY || headerKey === ADMIN_KEY) return;

  // harmloser Fehler (wird in den Pages abgefangen)
  throw new Error("ADMIN_AUTH_REQUIRED");
}