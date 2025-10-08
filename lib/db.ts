// lib/db.ts
import { PrismaClient } from "@prisma/client";

// Laufzeit-Guards: helfen, statt stumm zu crashen
if (!process.env.DATABASE_URL) {
  console.error("[Prisma] DATABASE_URL fehlt in der Runtime-Umgebung!");
}
if (!process.env.DIRECT_DATABASE_URL) {
  console.error("[Prisma] DIRECT_DATABASE_URL fehlt in der Runtime-Umgebung!");
}

declare global {
  // Verhindert Hot-Reload-Leaks in dev
  // eslint-disable-next-line no-var
  var __PRISMA__: PrismaClient | undefined;
}

export const prisma =
  global.__PRISMA__ ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "production"
        ? ["error"]
        : ["error", "warn"],
  });

if (process.env.NODE_ENV !== "production") {
  global.__PRISMA__ = prisma;
}