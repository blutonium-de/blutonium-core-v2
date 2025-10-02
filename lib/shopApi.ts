// lib/shopApi.ts
export type ShopFilter = {
  cat?: string;     // z.B. "gvd" oder "gvd,br"
  q?: string;       // Suche
  limit?: number;   // optional
  offset?: number;  // optional
};

// Einfache Fetch-Utility für öffentliche Produktlisten.
// Robust gegen { items: [...] } ODER direktes Array.
export async function fetchProducts(
  { cat, q, limit = 50, offset = 0 }: ShopFilter = {}
) {
  // Auf dem Server ist window undefined – wir nutzen dann eine absolute URL,
  // falls NEXT_PUBLIC_BASE_URL gesetzt ist; sonst eine relative.
  const origin =
    process.env.NEXT_PUBLIC_BASE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");

  const base = origin ? `${origin}/api/public/products` : `/api/public/products`;
  const url = new URL(base, origin || undefined);

  if (cat)   url.searchParams.set("cat", cat);
  if (q)     url.searchParams.set("q", q);
  if (limit) url.searchParams.set("limit", String(limit));
  if (offset)url.searchParams.set("offset", String(offset));

  const res = await fetch(url.toString(), {
    // Wir wollen frische Daten
    cache: "no-store",
    // Next.js Hinweis (unschädlich, aber klar)
    next: { revalidate: 0 },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data?.error as string) || `Load failed (${res.status})`);
  }

  // API kann { items: [...] } oder direkt [...] liefern
  return Array.isArray(data) ? data : (data.items ?? []);
}