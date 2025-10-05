// lib/shop/display.ts

// Minimaler Shape, damit die Funktion mit unterschiedlichen Product-Typen
// (z. B. Prisma Product oder eigene schlanke Typen) problemlos arbeitet.
export type DisplayableProduct = {
  slug: string;
  productName?: string | null;
  artist?: string | null;
  trackTitle?: string | null;
};

/**
 * Titel für die Produktanzeige:
 * 1) productName, wenn vorhanden
 * 2) Artist – TrackTitle, wenn beide vorhanden
 * 3) Fallback: slug
 */
export function getProductDisplayTitle(p: DisplayableProduct): string {
  const productName = (p.productName ?? "").trim();
  if (productName) return productName;

  const a = (p.artist ?? "").trim();
  const t = (p.trackTitle ?? "").trim();
  if (a && t) return `${a} – ${t}`;

  return p.slug;
}

/**
 * Optional: Unterzeile (z. B. nur Artist oder nur TrackTitle),
 * wenn du sie irgendwo brauchst. Falls nicht benötigt, kannst du
 * diese Funktion einfach ignorieren oder entfernen.
 */
export function getProductSubtitle(p: DisplayableProduct): string {
  const a = (p.artist ?? "").trim();
  const t = (p.trackTitle ?? "").trim();

  if (a && !t) return a;
  if (!a && t) return t;
  return "";
}