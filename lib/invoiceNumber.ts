// lib/invoiceNumber.ts
import { prisma } from "@/lib/db";

/**
 * Erzeugt eine fortlaufende Rechnungsnummer im Format:
 *   SYY-000123   (YY = Jahr, Nummer pro Jahr hochgezählt)
 *
 * Nutzt eine DB-Transaktion, damit es auch unter Last keine Doppelnummern gibt.
 */
export async function getNextInvoiceNumber(): Promise<string> {
  const now = new Date();
  const yearFull = now.getFullYear();      // z.B. 2025
  const yearShort = String(yearFull).slice(-2); // "25"

  // Transaktion: Counter-Row upserten & inkrementieren
  const nextNumber = await prisma.$transaction(async (tx) => {
    // Falls Zeile fürs Jahr fehlt → anlegen
    await tx.invoiceCounter.upsert({
      where: { year: yearFull },
      update: {},
      create: { year: yearFull, lastNumber: 0 },
    });

    // Zähler +1
    const updated = await tx.invoiceCounter.update({
      where: { year: yearFull },
      data: { lastNumber: { increment: 1 } },
      select: { lastNumber: true },
    });

    return updated.lastNumber;
  });

  const numberPadded = String(nextNumber).padStart(6, "0");
  return `S${yearShort}-${numberPadded}`;
}