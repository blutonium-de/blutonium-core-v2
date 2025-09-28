// app/de/shop/page.tsx
import ProductCard from "../../../components/ProductCard";
import { prisma } from "../../../lib/db";
import Image from "next/image";

export const dynamic = "force-dynamic";

const CATS = [
  { code: "",    label: "Alle" },
  { code: "bv",  label: "Blutonium Vinyls" },
  { code: "sv",  label: "Sonstige Vinyls" },
  { code: "bcd", label: "Blutonium CDs" },
  { code: "scd", label: "Sonstige CDs" },
  { code: "bhs", label: "Blutonium Hardstyle Samples" },
  { code: "ss",  label: "Sonstiges & Specials" },
];

export default async function ShopPage({
  searchParams,
}: { searchParams?: { cat?: string; q?: string } }) {
  const cat = (searchParams?.cat || "").toLowerCase();
  const q   = (searchParams?.q || "").trim();

  const where: any = {
    active: true,
    stock: { gt: 0 },
    ...(cat ? { categoryCode: cat } : {}),
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

  const products = await prisma.product.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      slug: true,
      artist: true,
      trackTitle: true,
      productName: true,
      subtitle: true,
      categoryCode: true,
      year: true,
      priceEUR: true,
      image: true,
      images: true,          // ⬅️ wichtig für Galerie
      stock: true,
    },
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* Header mit invertierten Logos (responsive Größen) */}
      <header className="mb-8 text-center">
        <div className="flex items-center justify-center gap-4 sm:gap-6">
          <Image
            src="/logos/blutonium-records.png"
            alt="Blutonium Records"
            width={150}
            height={150}
            className="invert w-[100px] sm:w-[130px] md:w-[150px] h-auto"
          />
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
            Blutonium Records Shop
          </h1>
          <Image
            src="/logos/blutonium-media.png"
            alt="Blutonium Media"
            width={150}
            height={150}
            className="invert w-[100px] sm:w-[130px] md:w-[150px] h-auto"
          />
        </div>

        <h2 className="mt-4 text-xl md:text-2xl font-bold">
          Herzlich Willkommen in unserem Online Shop!
        </h2>
        <p className="mt-3 text-[13px] md:text-[15px] text-white/80 max-w-3xl mx-auto">
          Hier findest Du absolute Raritäten, sei es aus dem Blutonium Records
          Vinyl &amp; CD Compilation Sortiment, sowie auch ganz seltene Maxi 12"
          Vinyls aus der legendären DJ Zeit – gebraucht, aber noch absolut
          einsetzbar, und das zu einem fairen Preis.
        </p>
      </header>

      {/* Suche */}
      <form className="max-w-xl mx-auto mb-5 flex gap-2" method="get">
        {cat ? <input type="hidden" name="cat" value={cat} /> : null}
        <input
          name="q"
          defaultValue={q}
          placeholder="Suche nach Artist, Titel, EAN, Katalognummer …"
          className="flex-1 rounded-lg px-3 py-2 bg-white/5 border border-white/10 text-sm"
        />
        <button
          className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-sm"
          type="submit"
        >
          Suchen
        </button>
      </form>

      {/* Kategorie-Chips (Orange) */}
      <div className="flex flex-wrap gap-2 justify-center">
        {CATS.map((c) => {
          const params = new URLSearchParams();
          if (c.code) params.set("cat", c.code);
          if (q) params.set("q", q);
          const href = c.code ? `?${params.toString()}` : q ? `?q=${encodeURIComponent(q)}` : ".";
          const active = c.code === (cat || "");
          return (
            <a
              key={c.code || "all"}
              href={href}
              className={`px-3 py-1 rounded-lg border transition text-sm ${
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

      {/* Grid (kompakt) */}
      <div className="mt-6 grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-x-1 gap-y-4 place-items-center">
        {products.map((p) => (
          <ProductCard key={p.id} p={p as any} />
        ))}
      </div>

      {products.length === 0 && (
        <p className="text-center mt-8 opacity-70 text-sm">
          Keine Produkte gefunden{q ? ` für „${q}“` : ""}.
        </p>
      )}
    </div>
  );
}