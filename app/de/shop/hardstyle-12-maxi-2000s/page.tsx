// app/de/shop/hardstyle-12-maxi-2000s/page.tsx
import ProductCard from "../../../../components/ProductCard";
import { prisma } from "../../../../lib/db";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const PAGE_SIZE = 60;

export const metadata: Metadata = {
  title: `Hardstyle 12" Maxi Singles (2000er) – gebraucht | Blutonium Records`,
  description: `Hardstyle 12" Maxis (2000er) – Klassiker & Raritäten. Gebraucht, geprüft, weltweiter Versand.`,
  alternates: { canonical: "/de/shop/hardstyle-12-maxi-2000s" },
  openGraph: {
    title: `Hardstyle 12" Maxi Singles (2000er) – gebraucht | Blutonium Records`,
    description: `Hardstyle 12" Maxis (2000er) – geprüfte Qualität, weltweiter Versand.`,
    url: "/de/shop/hardstyle-12-maxi-2000s",
    type: "website",
  },
};

export default async function Hardstyle2000sLanding({ searchParams }: { searchParams?: { page?: string } }) {
  const page = Math.max(1, parseInt(searchParams?.page || "1", 10) || 1);

  const where: any = {
    active: true,
    stock: { gt: 0 },
    genre: "Hardstyle",
    OR: [{ year: null }, { AND: [{ year: { gte: 2000 } }, { year: { lte: 2009 } }] }],
  };

  const total = await prisma.product.count({ where });
  const products = await prisma.product.findMany({
    where, orderBy: { createdAt: "desc" }, take: PAGE_SIZE, skip: (page - 1) * PAGE_SIZE,
    select: { id:true, slug:true, artist:true, trackTitle:true, productName:true, subtitle:true, categoryCode:true, condition:true, year:true, priceEUR:true, image:true, images:true, stock:true, genre:true },
  });
  const hasMore = page * PAGE_SIZE < total;
  const linkWith = (nextPage: number) => (nextPage > 1 ? `?page=${nextPage}` : ".");

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <section className="mb-6 text-center max-w-3xl mx-auto">
        <h1 className="text-2xl md:text-3xl font-extrabold mb-2">Hardstyle 12&quot; Maxi Singles – 2000er</h1>
        <p className="text-sm md:text-base text-white/80 leading-relaxed">
          <strong>Hardstyle</strong> Maxis aus den 2000ern – geprüfte Qualität, weltweiter Versand, Sammler-Highlights der 00s.
        </p>
        <div className="mt-4">
          <a href="/de/shop" className="inline-flex items-center gap-2 px-4 py-2 rounded bg-white/10 hover:bg-white/20 border border-white/15 text-sm">← Zur Shop-Übersicht</a>
        </div>
      </section>

      <div className="mt-5 grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-x-1 gap-y-4 place-items-center">
        {products.map((p) => <ProductCard key={p.id} p={p as any} />)}
      </div>

      {products.length === 0 && <p className="text-center mt-8 opacity-70 text-sm">Aktuell keine passenden Produkte verfügbar.</p>}

      {hasMore && (
        <div className="flex justify-center mt-8">
          <a href={linkWith(page + 1)} className="px-4 py-2 rounded bg-white/10 hover:bg-white/20 border border-white/15 text-sm">Weitere {PAGE_SIZE} Produkte laden</a>
        </div>
      )}

      <div className="mt-6 text-center text-xs opacity-60">Seite {page} · {Math.min(page * PAGE_SIZE, total)} / {total} Artikel</div>
    </div>
  );
}