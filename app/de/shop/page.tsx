import ProductCard from "../../../components/ProductCard";
import { prisma } from "../../../lib/db";

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

export default async function ShopPageDE({
  searchParams,
}: { searchParams?: { cat?: string } }) {
  const cat = (searchParams?.cat || "").toLowerCase();

  const products = await prisma.product.findMany({
    where: { active: true, ...(cat ? { categoryCode: cat } : {}) },
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
    },
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
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

      <div className="mt-6 grid grid-cols-[repeat(auto-fill,minmax(270px,1fr))] gap-6 place-items-center">
        {products.map((p) => (
          <ProductCard key={p.id} p={p as any} />
        ))}
      </div>
    </div>
  );
}