// app/de/shop/page.tsx
import ProductCard from "../../components/ProductCard";
import { prisma } from "../../lib/db";

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
}: { searchParams?: { cat?: string } }) {
  const cat = (searchParams?.cat || "").toLowerCase();

  const products = await prisma.product.findMany({
    where: { active: true, stock: { gt: 0 }, ...(cat ? { categoryCode: cat } : {}) },
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
      stock: true, // wichtig für "Ausverkauft" & Button-Disable
    },
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* Intro */}
      <header className="mb-8 text-center">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
          Blutonium Records Shop
        </h1>
        <h2 className="mt-4 text-xl md:text-2xl font-bold">
          Herzlich Willkommen in unserem Online Shop!
        </h2>
        <p className="mt-4 text-base md:text-lg text-white/80 max-w-3xl mx-auto">
          Hier findest Du absolute Raritäten, sei es aus dem Blutonium Records
          Vinyl &amp; CD Compilation Sortiment, sowie auch ganz seltene Maxi 12"
          Vinyls aus der legendären DJ Zeit – gebraucht, aber noch absolut
          einsetzbar, und das zu einem fairen Preis.
        </p>
      </header>

      {/* Kategorie-Chips */}
      <div className="flex flex-wrap gap-2">
        {CATS.map((c) => {
          const href = c.code ? `?cat=${c.code}` : ".";
          const active = c.code === (cat || "");
          return (
            <a
              key={c.code || "all"}
              href={href}
              className={`px-3 py-1 rounded-lg border ${
                active
                  ? "bg-cyan-500 text-black border-cyan-500"
                  : "bg-white/5 border-white/10 hover:bg-white/10"
              }`}
            >
              {c.label}
            </a>
          );
        })}
      </div>

      {/* Grid */}
      <div className="mt-6 grid grid-cols-[repeat(auto-fill,minmax(270px,1fr))] gap-6 place-items-center">
        {products.map((p) => (
          <ProductCard key={p.id} p={p as any} />
        ))}
      </div>
    </div>
  );
}