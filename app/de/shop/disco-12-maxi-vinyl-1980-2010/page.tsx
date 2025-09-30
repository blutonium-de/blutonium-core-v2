// app/de/shop/disco-12-maxi-vinyl-1980-2010/page.tsx
import ProductCard from "../../../../components/ProductCard";
import { prisma } from "../../../../lib/db";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const PAGE_SIZE = 60;
const TARGET_GENRES = ["Disco", "Italo Disco"] as const;

export const metadata: Metadata = {
  title: `Disco 12" Maxi Vinyls (1980–2010) – gebraucht & selten | Blutonium Records`,
  description: `Originale 12" Disco Maxi-Singles (1980–2010) – Disco, Italo Disco, Funk, Eurodance. Gebraucht & geprüft. Weltweiter Versand.`,
  alternates: { canonical: "/de/shop/disco-12-maxi-vinyl-1980-2010" },
  openGraph: {
    title: `Disco 12" Maxi Vinyls (1980–2010) – gebraucht & selten | Blutonium Records`,
    description: `Entdecke originale 12" Disco Maxi-Singles (1980–2010): Disco, Italo Disco, Funk, Eurodance. Gebraucht & geprüft. Weltweiter Versand.`,
    url: "/de/shop/disco-12-maxi-vinyl-1980-2010",
    type: "website",
  },
};

export default async function DiscoLanding({ searchParams }: { searchParams?: { page?: string } }) {
  const page = Math.max(1, parseInt(searchParams?.page || "1", 10) || 1);

  const where: any = {
    active: true,
    stock: { gt: 0 },
    genre: { in: TARGET_GENRES as unknown as string[] },
    OR: [{ year: null }, { AND: [{ year: { gte: 1980 } }, { year: { lte: 2010 } }] }],
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
        <h1 className="text-2xl md:text-3xl font-extrabold mb-2">
          Disco 12&quot; Maxi Vinyls (1980–2010) – gebraucht &amp; selten
        </h1>
        <p className="text-sm md:text-base text-white/80 leading-relaxed">
          Willkommen bei Blutonium Records – deinem Shop für originale <strong>12&quot; Disco Maxi-Singles aus den Jahren 1980 bis 2010</strong>. 
          Klassiker aus <strong>Disco, Italo Disco, Funk und Eurodance</strong>, gebraucht &amp; geprüft in top Qualität. <br />
          <span className="font-semibold">✔ Weltweiter Versand ✔ Sammlerstücke ✔ Raritäten für DJs</span>
        </p>
        <div className="mt-4">
          <a href="/de/shop" className="inline-flex items-center gap-2 px-4 py-2 rounded bg-white/10 hover:bg-white/20 border border-white/15 text-sm">
            ← Zur Shop-Übersicht
          </a>
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