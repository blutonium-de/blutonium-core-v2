// app/admin/catalog/page.tsx
export const dynamic = "force-dynamic";

import Link from "next/link";
import { CATEGORY_LABELS } from "../../../lib/shop-categories"; // ← relativer Import (kein "@/")

export default function AdminCatalogPage() {
  const entries = Object.entries(CATEGORY_LABELS) as [string, string][];

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl sm:text-4xl font-extrabold">Admin · Katalog</h1>
        <div className="flex gap-2">
          <Link href="/admin/products" className="px-3 py-2 rounded bg-white/10 hover:bg-white/20">
            Produktliste
          </Link>
          <Link href="/admin/new" className="px-3 py-2 rounded bg-cyan-500 hover:bg-cyan-400 text-black font-semibold">
            Neues Produkt anlegen
          </Link>
        </div>
      </div>

      <p className="opacity-70 mt-2">
        Wähle eine Kategorie, um die Produktliste schon vorgefiltert zu öffnen.
      </p>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {entries.map(([code, label]) => (
          <Link
            key={code}
            href={`/admin/products?cat=${encodeURIComponent(code)}`}
            className="block rounded-xl border border-white/10 bg-white/5 p-4 hover:bg-white/10"
          >
            <div className="text-sm opacity-70">Code: {code}</div>
            <div className="mt-1 text-lg font-semibold">{label}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}