// app/admin/catalog/page.tsx
import { CATEGORY_LABELS } from "../../../lib/shop-categories";

export const dynamic = "force-dynamic";

export default function CatalogPage() {
  const entries = Object.entries(CATEGORY_LABELS);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Kategorien</h1>

      <ul className="grid gap-3">
        {entries.map(([code, label]) => (
          <li
            key={code}
            className="rounded-lg border border-white/10 bg-white/5 px-4 py-3"
          >
            <span className="font-mono text-sm opacity-70">{code}</span>{" "}
            <span className="ml-2 font-semibold">{label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}