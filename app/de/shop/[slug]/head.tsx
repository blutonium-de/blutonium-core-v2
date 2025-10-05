// app/de/shop/[slug]/head.tsx
import { prisma } from "@/lib/db";

export default async function Head({ params }: { params: { slug: string } }) {
  const slug = params.slug;

  // Produkt laden (nur Felder, die wir fürs SEO-Head brauchen)
  const p = await prisma.product.findUnique({
    where: { slug },
    select: {
      productName: true,
      artist: true,
      trackTitle: true,
      subtitle: true,
      image: true,
      priceEUR: true,
      genre: true,
      format: true,
    },
  });

  const baseTitle = "Blutonium Records Shop";
  const mainTitle =
    p?.productName ||
    [p?.artist, p?.trackTitle].filter(Boolean).join(" – ") ||
    slug;

  const title = `${mainTitle} | ${baseTitle}`;

  const descParts: string[] = [];
  if (p?.subtitle) descParts.push(p.subtitle);
  if (p?.genre) descParts.push(`Genre: ${p.genre}`);
  if (p?.format) descParts.push(`Format: ${p.format}`);
  if (typeof p?.priceEUR === "number") descParts.push(`Preis: ${p.priceEUR.toFixed(2)} €`);
  const description =
    descParts.join(" • ") ||
    "Finde seltene Vinyls, CDs und mehr im Blutonium Records Shop.";

  const image = p?.image || "/shop/shophero.png";
  const url = `${process.env.NEXT_PUBLIC_BASE_URL || ""}/de/shop/${slug}`;

  return (
    <>
      <title>{title}</title>
      <meta name="description" content={description} />

      {/* Open Graph */}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content="product" />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={image} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
    </>
  );
}