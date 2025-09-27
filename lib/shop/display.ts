// lib/shop/display.ts
import type { Product } from "../types";

export function getProductDisplayTitle(p: Product) {
  // 1) wenn Productname gepflegt ist → diesen zeigen
  if (p.productName && p.productName.trim().length > 0) return p.productName.trim();

  // 2) sonst Artist + Titel, wenn vorhanden
  const a = (p.artist || "").trim();
  const t = (p.trackTitle || "").trim();
  if (a && t) return `${a} – ${t}`;
  if (t) return t;
  if (a) return a;

  // 3) absoluter Fallback
  return "Unbenanntes Produkt";
}

export function getProductDisplaySubtitle(p: Product) {
  // Subtitel nur zeigen, wenn vorhanden
  return (p.subtitle || "").trim() || null;
}