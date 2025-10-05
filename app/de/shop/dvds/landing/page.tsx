// app/de/shop/dvds/landing/[slug]/page.tsx
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { dvdLandingPresets } from "../config";

type Props = { params: { slug: string } };

// ✅ SEO-Metadaten
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const preset = dvdLandingPresets.find((p) => p.slug === params.slug);
  if (!preset) return { title: "DVDs gebraucht – Blutonium Records" };
  return {
    title: preset.title,
    description: preset.description,
  };
}

// ✅ Seite selbst
export default async function DvdLandingPage({ params }: Props) {
  const preset = dvdLandingPresets.find((p) => p.slug === params.slug);
  if (!preset) return notFound();

  const products = await prisma.product.findMany({
    where: preset.where,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      slug: true,
      productName: true,
      subtitle: true,
      image: true,
      priceEUR: true,
      fsk: true,
      genre: true,
    },
    take: 60, // nicht zu viele laden
  });

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold mb-6">{preset.title}</h1>
      <p className="mb-10 opacity-70">{preset.description}</p>

      {products.length === 0 ? (
        <div className="opacity-70">Aktuell keine Titel verfügbar.</div>
      ) : (
        <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
          {products.map((p) => (
            <li key={p.id} className="rounded border border-white/10 bg-white/5 p-3">
              <Link href={`/de/shop/dvds/${p.slug}`}>
                <div className="aspect-square bg-white/10 mb-2 overflow-hidden rounded">
                  <img
                    src={p.image || "/placeholder.png"}
                    alt={p.productName || p.slug}
                    className="object-cover w-full h-full"
                  />
                </div>
                <div className="font-semibold truncate">{p.productName}</div>
                {p.subtitle && (
                  <div className="text-sm opacity-70 truncate">{p.subtitle}</div>
                )}
                <div className="mt-1 text-sm font-bold">{p.priceEUR.toFixed(2)} €</div>
                {p.fsk && <div className="text-xs opacity-70">FSK: {p.fsk}</div>}
                {p.genre && <div className="text-xs opacity-70">Genre: {p.genre}</div>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}