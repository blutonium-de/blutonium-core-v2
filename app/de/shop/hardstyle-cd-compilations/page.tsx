// app/de/shop/hardstyle-cd-compilations/page.tsx
import ProductCard from "@/components/ProductCard";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// wie im Shop
const PAGE_SIZE = 60;

export const metadata = {
  title:
    "Hardstyle CD & 2CD Compilations – Blutonium Presents, Dream Dance, Technoclub | Neu & gebraucht",
  description:
    "Hardstyle CD, 2CD & Doppel-CD Compilations – Blutonium Presents, Dream Dance, Technoclub u.v.m. Neu & gebraucht • geprüfte Qualität • weltweiter Versand.",
  alternates: {
    canonical: "/de/shop/hardstyle-cd-compilations",
  },
};

export default async function HardstyleCdCompilationsPage({
  searchParams,
}: {
  searchParams?: { q?: string; page?: string };
}) {
  const q = (searchParams?.q || "").trim();
  const page = Math.max(1, parseInt(searchParams?.page || "1", 10) || 1);

  // Grundfilter: nur CDs (Blutonium + sonstige) & aktiv / lagernd
  const where: any = {
    active: true,
    stock: { gt: 0 },
    categoryCode: { in: ["bcd", "scd"] },
    // thematischer Einschluss: Hardstyle/Compilation/2CD/Doppel-CD/Seriennamen
    OR: [
      { genre: { equals: "Hardstyle", mode: "insensitive" } },
      { productName: { contains: "Hardstyle", mode: "insensitive" } },
      { subtitle: { contains: "Hardstyle", mode: "insensitive" } },
      { format: { contains: "2CD", mode: "insensitive" } },
      { format: { contains: "Doppel", mode: "insensitive" } },
      { productName: { contains: "Doppel", mode: "insensitive" } },
      { productName: { contains: "Compilation", mode: "insensitive" } },
      { subtitle: { contains: "Compilation", mode: "insensitive" } },
      { productName: { contains: "Blutonium Presents", mode: "insensitive" } },
      { productName: { contains: "Dream Dance", mode: "insensitive" } },
      { productName: { contains: "Technoclub", mode: "insensitive" } },
    ],
  };

  // Freitext-Suche (optional)
  if (q) {
    where.AND = [
      ...(where.AND || []),
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
          { format: { contains: q, mode: "insensitive" } },
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
    return qs ? `?${qs}` : ".";
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      {/* Breadcrumb / Header */}
      <nav className="text-xs opacity-70 mb-2">
        <a href="/de/shop" className="underline underline-offset-2 hover:opacity-100">
          Shop
        </a>{" "}
        / Hardstyle CD Compilations
      </nav>

      {/* SEO-Heading & Intro */}
      <section className="mb-4 text-center max-w-3xl mx-auto">
        <h1 className="text-2xl md:text-3xl font-extrabold mb-2">
          Hardstyle CD & 2CD / Doppel-CD Compilations
        </h1>
        <p className="text-sm md:text-base text-white/80 leading-relaxed">
          Entdecke{" "}
          <strong>Hardstyle Compilations auf CD / 2CD / Doppel-CD</strong> – von{" "}
          <strong>Blutonium Presents</strong> über{" "}
          <strong>Dream Dance</strong> und <strong>Technoclub</strong> bis hin zu
          vielen weiteren Sammler-Reihen. Neu &amp; gebraucht, geprüft und
          versandfertig – <span className="font-semibold">mit weltweitem Versand</span>.
        </p>

        {/* kompakte Suche nur für diese Landingpage */}
        <form className="mt-3 mx-auto max-w-md flex gap-2" method="get">
          {page > 1 ? <input type="hidden" name="page" value="1" /> : null}
          <input
            name="q"
            defaultValue={q}
            placeholder='Suchen (z. B. "Blutonium Presents", "Dream Dance 50")'
            className="flex-1 rounded-lg px-3 py-2 bg-white/8 border border-white/15 text-sm"
          />
          <button
            className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-sm"
            type="submit"
          >
            Suchen
          </button>
        </form>
      </section>

      {/* thematische Deep-Links */}
      <div className="mb-5 flex flex-wrap justify-center gap-2 text-xs">
        <a href="/de/shop?genre=Hardstyle&cat=bcd" className="px-3 py-1 rounded bg-white/8 hover:bg-white/15 border border-white/15">
          Blutonium CDs (Hardstyle)
        </a>
        <a href="/de/shop?genre=Hardstyle&cat=scd" className="px-3 py-1 rounded bg-white/8 hover:bg-white/15 border border-white/15">
          Sonstige Hardstyle CDs
        </a>
        <a href="/de/shop/disco-12-maxi-vinyl-1980-2010" className="px-3 py-1 rounded bg-white/8 hover:bg-white/15 border border-white/15">
          Disco 12&quot; Maxi (1980–2010)
        </a>
        <a href="/de/shop/italo-disco-12-maxi-vinyl" className="px-3 py-1 rounded bg-white/8 hover:bg-white/15 border border-white/15">
          Italo Disco 12&quot; Singles
        </a>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-x-1 gap-y-4 place-items-center">
        {products.map((p) => (
          <ProductCard key={p.id} p={p as any} />
        ))}
      </div>

      {products.length === 0 && (
        <p className="text-center mt-8 opacity-70 text-sm">
          Keine passenden Compilations gefunden{q ? ` für „${q}“` : ""}.
        </p>
      )}

      {hasMore && (
        <div className="flex justify-center mt-8">
          <a
            href={linkWith({ page: page + 1 })}
            className="px-4 py-2 rounded bg-white/10 hover:bg-white/20 border border-white/15 text-sm"
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