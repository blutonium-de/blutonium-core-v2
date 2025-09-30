// app/en/shop/page.tsx
import ProductCard from "../../../components/ProductCard";
import { prisma } from "../../../lib/db";
import type { CSSProperties } from "react";

export const dynamic = "force-dynamic";

const CATS = [
  { code: "",    label: "All" },
  { code: "bv",  label: "Blutonium Vinyls" },
  { code: "sv",  label: "Other Vinyls" },
  { code: "bcd", label: "Blutonium CDs" },
  { code: "scd", label: "Other CDs" },
  { code: "bhs", label: "Blutonium Hardstyle Samples" },
  { code: "ss",  label: "Misc & Specials" },
];

const GENRES = [
  "Hardstyle","Techno","Trance","House","Reggae","Pop","Film",
  "Dance","Hörspiel","Jazz","Klassik","Country",
  "Italo Disco","Disco","EDM","Hip Hop",
] as const;

const PAGE_SIZE = 60;

export default async function ShopPage({
  searchParams,
}: {
  searchParams?: { cat?: string; q?: string; genre?: string; page?: string };
}) {
  const cat   = (searchParams?.cat || "").toLowerCase();
  const q     = (searchParams?.q || "").trim();
  const genre = (searchParams?.genre || "").trim();
  const page  = Math.max(1, parseInt(searchParams?.page || "1", 10) || 1);

  const where: any = {
    active: true,
    stock: { gt: 0 },
    ...(cat ? { categoryCode: cat } : {}),
    ...(genre ? { genre } : {}),
  };

  if (q) {
    where.OR = [
      { slug:          { contains: q, mode: "insensitive" } },
      { productName:   { contains: q, mode: "insensitive" } },
      { artist:        { contains: q, mode: "insensitive" } },
      { trackTitle:    { contains: q, mode: "insensitive" } },
      { subtitle:      { contains: q, mode: "insensitive" } },
      { upcEan:        { contains: q, mode: "insensitive" } },
      { catalogNumber: { contains: q, mode: "insensitive" } },
      { sku:           { contains: q, mode: "insensitive" } },
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
    },
  });

  const hasMore = page * PAGE_SIZE < total;

  const linkWith = (patch: Partial<{ cat: string; q: string; genre: string; page: number }>) => {
    const params = new URLSearchParams();
    const next = { cat, q, genre, page, ...patch };
    if (next.cat) params.set("cat", next.cat);
    if (next.q) params.set("q", next.q);
    if (next.genre) params.set("genre", next.genre);
    if (next.page && next.page > 1) params.set("page", String(next.page));
    const qs = params.toString();
    return qs ? `?${qs}` : "/en/shop";
  };

  const tapFix: CSSProperties = {
    WebkitTapHighlightColor: "transparent",
    WebkitTouchCallout: "none",
    backgroundImage: "none",
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-2">
      {/* Header */}
      <header className="mb-4 text-center -mt-3 md:-mt-4">
        {/* HERO with background image */}
        <div className="relative mx-auto max-w-7xl">
          <div
            className="relative bg-cover bg-no-repeat rounded-2xl overflow-hidden"
            style={{
              backgroundImage: "url(/shop/shophero.png)",
              backgroundPosition: "center 0.5cm",
            }}
          >
            <div className="absolute inset-0 bg-black/30" />

            {/* Hero content */}
            <div className="relative flex flex-col items-center justify-start h-[210px] sm:h-[250px] px-4 pt-4">
              {/* Headline */}
              <h1 className="text-[34px] sm:text-[40px] md:text-[44px] font-extrabold tracking-tight text-white drop-shadow-lg">
                Blutonium Records Shop
              </h1>

              {/* Search */}
              <form className="w-full max-w-xl mt-2 flex gap-2" method="get">
                {cat ? <input type="hidden" name="cat" value={cat} /> : null}
                {genre ? <input type="hidden" name="genre" value={genre} /> : null}
                {page > 1 ? <input type="hidden" name="page" value="1" /> : null}
                <input
                  name="q"
                  defaultValue={q}
                  placeholder='Search by artist, title, EAN, catalog number …'
                  className="flex-1 rounded-lg px-3 py-2 bg-white/85 text-black border border-white/20 text-sm"
                />
                <button
                  className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-sm"
                  type="submit"
                >
                  Search
                </button>
              </form>

              {/* Subline inside hero */}
              <div className="pointer-events-none absolute inset-x-0 bottom-2 px-4">
                <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-white drop-shadow text-center">
                  Welcome to our online shop!
                </h2>
                <p className="mt-1 text-[12px] sm:text-[13px] md:text-[15px] max-w-3xl mx-auto text-white/90 text-center">
                  <span className="font-bold">
                    Discover rare records • New &amp; Used
                  </span>
                  <br />
                  12&quot; Vinyl DJ Maxi Singles • CD Singles • CD Compilations • CD Albums • Vinyl Albums
                  <br />
                  Plus rare Blutonium Records CDs &amp; Vinyl that might still be missing in your collection!
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* (Optional) SEO block for Disco / Italo Disco */}
      {(genre === "Disco" || genre === "Italo Disco") && (
        <section className="mb-4 text-center max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-extrabold mb-2">
            Disco 12&quot; Maxi Vinyls (1980–2010) – used &amp; rare
          </h2>
          <p className="text-sm md:text-base text-white/80 leading-relaxed">
            Welcome to Blutonium Records – your shop for original{" "}
            <strong>12&quot; Disco maxi-singles from 1980 to 2010</strong>.
            Classics from <strong>Disco, Italo Disco, Funk and Eurodance</strong>,
            used &amp; quality-checked. <br />
            <span className="font-semibold">✔ Worldwide shipping ✔ Collector’s items ✔ Rarities for DJs</span>
          </p>
        </section>
      )}

      {/* Genres */}
      <div className="mb-5 flex items-center justify-center gap-2 overflow-x-auto whitespace-nowrap px-1">
        <a
          href={linkWith({ genre: "", page: 1 })}
          style={tapFix}
          className={`px-3 py-1 rounded-full text-xs border transition select-none ${
            !genre
              ? "bg-white text-black border-white"
              : "bg-white/10 border-white/20 hover:bg-white/20"
          }`}
        >
          All genres
        </a>
        {GENRES.map((g) => (
          <a
            key={g}
            href={linkWith({ genre: g, page: 1 })}
            style={tapFix}
            className={`px-3 py-1 rounded-full text-xs border transition select-none ${
              genre === g
                ? "bg-white text-black border-white"
                : "bg-white/10 border-white/20 hover:bg-white/20"
            }`}
            title={`Genre: ${g}`}
          >
            {g}
          </a>
        ))}
      </div>

      {/* Categories */}
      <div className="flex flex-wrap gap-2 justify-center">
        {CATS.map((c) => {
          const href = linkWith({ cat: c.code, page: 1 });
          const active = c.code === (cat || "");
          return (
            <a
              key={c.code || "all"}
              href={href}
              style={tapFix}
              className={`px-3 py-1 rounded-lg border transition text-sm select-none ${
                active
                  ? "bg-[rgba(255,140,0,0.9)] text-black border-[rgba(255,140,0,0.9)]"
                  : "bg-[rgba(255,140,0,0.12)] border-[rgba(255,140,0,0.25)] hover:bg-[rgba(255,140,0,0.2)]"
              }`}
            >
              {c.label}
            </a>
          );
        })}
      </div>

      {/* Topic links (SEO + UX) */}
      <div className="mt-4 flex flex-wrap justify-center gap-2 text-xs">
        <a href="/en/shop/disco-12-maxi-vinyl-1980-2010" className="px-3 py-1 rounded bg-white/8 hover:bg-white/15 border border-white/15">
          Disco 12&quot; Maxi (1980–2010)
        </a>
        <a href="/en/shop/italo-disco-12-maxi-vinyl" className="px-3 py-1 rounded bg-white/8 hover:bg-white/15 border border-white/15">
          Italo Disco 12&quot; Singles (1983–1992)
        </a>
        <a href="/en/shop/techno-12-maxi-90s" className="px-3 py-1 rounded bg-white/8 hover:bg-white/15 border border-white/15">
          Techno 12&quot; Maxis (90s)
        </a>
        <a href="/en/shop/hardstyle-12-maxi-2000s" className="px-3 py-1 rounded bg-white/8 hover:bg-white/15 border border-white/15">
          Hardstyle 12&quot; Maxis (2000s)
        </a>
      </div>

      {/* Grid */}
      <div className="mt-5 grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-x-1 gap-y-4 place-items-center">
        {products.map((p) => (
          <ProductCard key={p.id} p={p as any} />
        ))}
      </div>

      {products.length === 0 && (
        <p className="text-center mt-8 opacity-70 text-sm">
          No products found
          {q ? ` for “${q}”` : ""}{genre ? ` in genre “${genre}”` : ""}.
        </p>
      )}

      {hasMore && (
        <div className="flex justify-center mt-8">
          <a
            href={linkWith({ page: page + 1 })}
            style={tapFix}
            className="px-4 py-2 rounded bg-white/10 hover:bg-white/20 border border-white/15 text-sm select-none"
          >
            Load {PAGE_SIZE} more products
          </a>
        </div>
      )}

      <div className="mt-6 text-center text-xs opacity-60">
        Page {page} · {Math.min(page * PAGE_SIZE, total)} / {total} items
      </div>
    </div>
  );
}