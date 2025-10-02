// app/de/shop/dvds/page.tsx
import ProductCard from "@/components/ProductCard";
import { prisma } from "@/lib/db";
import type { CSSProperties } from "react";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 60;

export default async function DvdsPage({
  searchParams,
}: {
  searchParams?: { q?: string; page?: string };
}) {
  const q = (searchParams?.q || "").trim();
  const page = Math.max(1, parseInt(searchParams?.page || "1", 10) || 1);

  // Filter: aktive Produkte mit Bestand, die wie "DVD" aussehen
  const where: any = {
    active: true,
    stock: { gt: 0 },
    OR: [
      { format: { contains: "DVD", mode: "insensitive" } },
      { productName: { contains: "DVD", mode: "insensitive" } },
      { subtitle: { contains: "DVD", mode: "insensitive" } },
    ],
  };

  // Optional: zusätzliche freie Suche
  if (q) {
    where.AND = [
      {
        OR: [
          { slug: { contains: q, mode: "insensitive" } },
          { productName: { contains: q, mode: "insensitive" } },
          { artist: { contains: q, mode: "insensitive" } },
          { trackTitle: { contains: q, mode: "insensitive" } },
          { subtitle: { contains: q, mode: "insensitive" } },
          { upcEan: { contains: q, mode: "insensitive" } },
          { catalogNumber: { contains: q, mode: "insensitive" } },
          { sku: { contains: q, mode: "insensitive" } },
        ],
      },
    ];
  }

  const total = await prisma.product.count({ where });

  const products = await prisma.product.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: PAGE_SIZE,
    skip: (page - 1) * PAGE_SIZE,
    select: {
      id: true,
      slug: true,
      artist: true,
      trackTitle: true,
      productName: true,
      subtitle: true,
      categoryCode: true,
      condition: true,
      year: true,
      priceEUR: true,
      image: true,
      images: true,
      stock: true,
      genre: true,
      format: true,
    },
  });

  const hasMore = page * PAGE_SIZE < total;

  const linkWith = (patch: Partial<{ q: string; page: number }>) => {
    const params = new URLSearchParams();
    const next = { q, page, ...patch };
    if (next.q) params.set("q", next.q);
    if (next.page && next.page > 1) params.set("page", String(next.page));
    const qs = params.toString();
    return qs ? `?${qs}` : "/de/shop/dvds";
  };

  const tapFix: CSSProperties = {
    WebkitTapHighlightColor: "transparent",
    WebkitTouchCallout: "none",
    backgroundImage: "none",
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      {/* Header/Hero kompakt */}
      <header className="mb-4 text-center">
        <h1 className="text-[28px] sm:text-[32px] md:text-[40px] font-extrabold tracking-tight">
          Gebrauchte DVDs
        </h1>
        <p className="mt-1 text-sm sm:text-base opacity-80">
          Filme, Musik-DVDs & Sammlerstücke – geprüft, in gutem Zustand, sofort lieferbar.
        </p>

        {/* Suche */}
        <form className="w-full max-w-xl mx-auto mt-3 flex gap-2" method="get">
          {page > 1 ? <input type="hidden" name="page" value="1" /> : null}
          <input
            name="q"
            defaultValue={q}
            placeholder="Suche in DVDs (Titel, Artist, EAN, Katalognummer …)"
            className="flex-1 rounded-lg px-3 py-2 bg-white/90 text-black border border-white/20 text-sm"
          />
          <button
            className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-sm"
            type="submit"
          >
            Suchen
          </button>
        </form>

        {/* Backlink zum Shop */}
        <div className="mt-3">
          <a
            href="/de/shop"
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded bg-white/10 hover:bg-white/20 border border-white/15 text-sm"
          >
            ← Zurück zum Shop
          </a>
        </div>
      </header>

      {/* SEO-Teaser */}
      <section className="mb-4 text-center max-w-3xl mx-auto">
        <h2 className="text-lg sm:text-xl font-bold mb-1">Top gebrauchte DVDs – günstig & selten</h2>
        <p className="text-xs sm:text-sm opacity-80 leading-relaxed">
          Entdecke <strong>gebrauchte DVDs</strong> aus <strong>Film, Konzert & Musik</strong> – geprüfte Qualität,
          faire Preise, schneller Versand. Perfekt für Sammler und alle, die physische Medien lieben.
        </p>
      </section>

      {/* Grid: Handy 2 Spalten, ab sm: auto-fill wie im Shop */}
      <div
        className="
          mt-4 grid grid-cols-2 gap-x-2 gap-y-4 place-items-stretch
          sm:[grid-template-columns:repeat(auto-fill,minmax(200px,1fr))]
          sm:gap-x-1 sm:place-items-center
        "
      >
        {products.map((p) => (
          <ProductCard key={p.id} p={p as any} />
        ))}
      </div>

      {products.length === 0 && (
        <p className="text-center mt-8 opacity-70 text-sm">
          Keine DVDs gefunden{q ? ` für „${q}“` : ""}.
        </p>
      )}

      {hasMore && (
        <div className="flex justify-center mt-8">
          <a
            href={linkWith({ page: page + 1 })}
            style={tapFix}
            className="px-4 py-2 rounded bg-white/10 hover:bg-white/20 border border-white/15 text-sm select-none"
          >
            Weitere {PAGE_SIZE} Artikel laden
          </a>
        </div>
      )}

      <div className="mt-6 text-center text-xs opacity-60">
        Seite {page} · {Math.min(page * PAGE_SIZE, total)} / {total} Artikel
      </div>
    </div>
  );
}