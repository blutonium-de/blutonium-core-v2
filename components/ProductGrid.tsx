// components/ProductGrid.tsx
"use client";

import ProductCard from "./ProductCard";

export type Product = {
  id: string;
  slug: string;
  artist?: string | null;
  trackTitle?: string | null;
  productName?: string | null;
  subtitle?: string | null;
  categoryCode: string;
  condition?: string | null;
  priceEUR: number;
  image: string;
  images?: string[];
  stock?: number | null;
  genre?: string | null;
  format?: string | null;
};

export default function ProductGrid({ products }: { products: Product[] }) {
  if (!Array.isArray(products) || products.length === 0) {
    return <div className="opacity-70">Keine Produkte gefunden.</div>;
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {products.map((p) => (
        <ProductCard key={p.id} p={p as any} />
      ))}
    </div>
  );
}