// app/en/shop/page.tsx
import ProductCard from "../../components/ProductCard";
import { prisma } from "../../lib/db";

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
      stock: true, // stock needed by ProductCard for "sold out" state
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
          Welcome to our online shop!
        </h2>
        <p className="mt-4 text-base md:text-lg text-white/80 max-w-3xl mx-auto">
          Discover rare gems from the Blutonium Records Vinyl &amp; CD compilation catalog,
          plus very rare 12&quot; DJ-era maxi vinyls — pre-owned but absolutely usable
          and offered at a fair price.
        </p>
      </header>

      {/* Category chips */}
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