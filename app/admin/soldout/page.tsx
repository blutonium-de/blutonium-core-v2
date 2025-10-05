// app/admin/soldout/page.tsx

import { prisma } from "@/lib/db";
import Link from "next/link";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

function ok(tokenFromUrl?: string) {
  const need = process.env.NEXT_PUBLIC_ADMIN_TOKEN;
  if (!need) return true;
  return tokenFromUrl === need;
}

type Props = { searchParams?: { key?: string; page?: string } };

export default async function SoldOutPage({ searchParams }: Props) {
  const token = searchParams?.key;
  if (!ok(token)) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-extrabold mb-4">Admin / Verkauft & offline</h1>
        <p className="opacity-70">Zugriff verweigert. Hänge dein Admin-Token an:</p>
        <pre className="mt-3 bg-white/5 border border-white/10 rounded p-3 overflow-auto">
        {`/admin/soldout?key=${process.env.NEXT_PUBLIC_ADMIN_TOKEN ?? "<DEIN_TOKEN>"}`}
        </pre>
      </div>
    );
  }

  const currentPage = Math.max(1, Number(searchParams?.page ?? "1") || 1);
  const skip = (currentPage - 1) * PAGE_SIZE;

  const where = {
    OR: [
      { stock: { lte: 0 } as any },
      { active: false },
    ],
  };

  const [total, products] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        slug: true,
        productName: true,
        artist: true,
        trackTitle: true,
        image: true,
        stock: true,
        active: true,
        categoryCode: true,
        createdAt: true,
        updatedAt: true,
      },
      skip,
      take: PAGE_SIZE,
    }),
  ]);

  const hasPrev = currentPage > 1;
  const hasNext = skip + products.length < total;

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="mb-6 flex items-center justify-between gap-3">
        <h1 className="text-3xl font-extrabold">Admin / Verkauft & offline</h1>
        <Link href="/admin" className="px-3 py-1.5 rounded bg-white/10 hover:bg-white/20">
          ← Zurück zum Admin
        </Link>
      </div>

      <div className="mb-4 flex items-center justify-between text-sm opacity-80">
        <div>
          Gesamt: <span className="font-semibold">{total}</span> Einträge · Seite{" "}
          <span className="font-semibold">{currentPage}</span> ({products.length} auf dieser Seite)
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/admin/soldout?key=${encodeURIComponent(token ?? "")}&page=${Math.max(1, currentPage - 1)}`}
            className={`px-3 py-1.5 rounded border border-white/10 ${
              hasPrev ? "bg-white/5 hover:bg-white/10" : "bg-white/5 opacity-50 cursor-not-allowed"
            }`}
          >
            ← Neuere 50
          </Link>
          <Link
            href={`/admin/soldout?key=${encodeURIComponent(token ?? "")}&page=${hasNext ? currentPage + 1 : currentPage}`}
            className={`px-3 py-1.5 rounded border border-white/10 ${
              hasNext ? "bg-white/5 hover:bg-white/10" : "bg-white/5 opacity-50 cursor-not-allowed"
            }`}
          >
            Ältere 50 →
          </Link>
        </div>
      </div>

      {products.length === 0 ? (
        <div className="opacity-70">Nichts zu zeigen – alles wieder verfügbar 🎉</div>
      ) : (
        <ul className="space-y-3">
          {products.map((p) => {
            const title =
              p.productName?.trim() ||
              [p.artist, p.trackTitle].filter(Boolean).join(" – ") ||
              p.slug;
            const badge =
              p.stock! <= 0 ? (
                <span className="px-2 py-0.5 rounded text-xs bg-red-500/30">Stock 0</span>
              ) : !p.active ? (
                <span className="px-2 py-0.5 rounded text-xs bg-orange-500/30">inaktiv</span>
              ) : null;

            return (
              <li key={p.id} className="flex items-center gap-3 rounded border border-white/10 bg-white/5 p-3">
                <div className="h-14 w-14 rounded overflow-hidden bg-white/5 border border-white/10 shrink-0">
                  <img
                    src={p.image || "/placeholder.png"}
                    alt={title}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="font-semibold truncate">{title}</div>
                    {badge}
                  </div>
                  <div className="text-[11px] opacity-70">
                    {p.categoryCode?.toUpperCase()} · Stock: {p.stock ?? "—"} ·{" "}
                    {p.active ? "aktiv" : "inaktiv"} · zuletzt{" "}
                    {new Date(p.updatedAt).toLocaleString("de-AT")}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Bearbeiten – hier gehst du auf dein Edit-Form */}
                  <Link
                    href={`/admin/products/edit/${p.id}?key=${encodeURIComponent(token ?? "")}`}
                    className="px-3 py-1.5 rounded bg-white/10 hover:bg-white/20"
                  >
                    Bearbeiten
                  </Link>
                  {/* Löschen */}
                  <DeleteButton id={p.id} adminKey={token ?? ""} />
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-8 flex items-center justify-between gap-3">
        <Link
          href={`/admin/soldout?key=${encodeURIComponent(token ?? "")}&page=${Math.max(1, currentPage - 1)}`}
          className={`px-3 py-2 rounded border border-white/10 ${
            hasPrev ? "bg-white/5 hover:bg-white/10" : "bg-white/5 opacity-50 cursor-not-allowed"
          }`}
        >
          ← Neuere 50
        </Link>
        <div className="text-sm opacity-70">
          Seite {currentPage} von {Math.max(1, Math.ceil(total / PAGE_SIZE))}
        </div>
        <Link
          href={`/admin/soldout?key=${encodeURIComponent(token ?? "")}&page=${hasNext ? currentPage + 1 : currentPage}`}
          className={`px-3 py-2 rounded border border-white/10 ${
            hasNext ? "bg-white/5 hover:bg-white/10" : "bg-white/5 opacity-50 cursor-not-allowed"
          }`}
        >
          Ältere 50 →
        </Link>
      </div>
    </div>
  );
}
// ——— kleine Client-Komponente für DELETE ———
//"use client";
//function DeleteButton({ id, adminKey }: { id: string; adminKey: string }) {
  //async function onDelete() {
    //if (!confirm("Wirklich löschen? Das kann nicht rückgängig gemacht werden.")) return;
    //try {
      //const r = await fetch(`/api/admin/products/${id}`, {
        //method: "DELETE",
        //headers: { "x-admin-key": adminKey },
     // });
     // if (!r.ok) throw new Error(await r.text());
                       //      Reload, damit der Eintrag verschwindet
     // location.reload();
   // } catch (e: any) {
      //alert(e?.message || "Löschen fehlgeschlagen");
  //  }
 // }
 // return (
 //   <button onClick={onDelete} className="px-3 py-1.5 rounded bg-red-600/20 hover:bg-red-600/30">
 //     Löschen
 //   </button>
 // );
//}