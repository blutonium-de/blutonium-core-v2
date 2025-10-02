// app/de/shop/dvds/page.tsx
import ProductGrid from "@/components/ProductGrid";
import { fetchProducts } from "@/lib/shopApi";

export const dynamic = "force-dynamic";

export default async function DVDsPage() {
  const products = await fetchProducts({ cat: "gvd" });

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <h1 className="text-3xl sm:text-4xl font-extrabold mb-6">
        Gebrauchte DVDs
      </h1>
      <ProductGrid products={products} />
    </div>
  );
}