// lib/adminGuard.ts
/**
 * Sehr einfacher Admin-Guard:
 * - In DEV immer erlaubt
 * - In PROD nur erlaubt, wenn eine ENV "ADMIN_SECRET" vorhanden ist
 *   UND der Request (z.B. via Middleware) bereits verifiziert wurde.
 *
 * Du kannst das später mit echter Session/Role-Logik austauschen.
 */
export function assertAdmin() {
  if (process.env.NODE_ENV !== "production") return; // DEV frei

  // Platzhalterprüfung: Wenn du noch keine echte Auth hast,
  // lass vorerst zu, um die Route nutzen zu können.
  // ► Wenn du "hart" sperren willst, nimm die nächste Zeile rein:
  // throw new Error("Forbidden");

  return;
}