// app/admin/orders/page.tsx
import { prisma } from "@/lib/db";
import Link from "next/link";
import OrderStatusControl from "@/components/OrderStatusControl";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

function eur(cents: number | null | undefined) {
  const v = typeof cents === "number" ? cents : 0;
  return (v / 100).toFixed(2) + " €";
}

function ok(tokenFromUrl: string | undefined) {
  const need = process.env.NEXT_PUBLIC_ADMIN_TOKEN;
  if (!need) return true; // wenn kein Token gesetzt ist, alles zulassen
  return tokenFromUrl === need;
}

type Props = { searchParams?: { key?: string; page?: string } };

export default async function OrdersPage({ searchParams }: Props) {
  const token = searchParams?.key;
  if (!ok(token)) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="mb-6 flex items-center justify-between gap-3">
          <h1 className="text-3xl font-extrabold">Admin / Orders</h1>
          <a
            href={`/api/admin/orders/export?key=${encodeURIComponent(token ?? "")}`}
            className="px-3 py-1.5 rounded bg-white/10 hover:bg-white/20"
          >
            CSV exportieren
          </a>
        </div>
        <p className="text-white/70">
          Zugriff verweigert. Hänge dein Admin-Token als Query an:
        </p>
        <pre className="mt-3 bg-white/5 border border-white/10 rounded p-3 overflow-auto">
{`/admin/orders?key=${process.env.NEXT_PUBLIC_ADMIN_TOKEN ?? "<DEIN_TOKEN>"}`}
        </pre>
      </div>
    );
  }

  // Pagination
  const currentPage = Math.max(1, Number(searchParams?.page ?? "1") || 1);
  const skip = (currentPage - 1) * PAGE_SIZE;

  // Count + Daten
  const [total, orders] = await Promise.all([
    prisma.order.count(),
    prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
      skip,
      take: PAGE_SIZE,
    }),
  ]);

  const maxPage = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasPrev = currentPage > 1;
  const hasNext = currentPage < maxPage;

  const linkTo = (p: number) =>
    `/admin/orders?key=${encodeURIComponent(token ?? "")}&page=${Math.min(
      Math.max(1, p),
      maxPage
    )}`;

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      {/* Kopf */}
      <div className="mb-6 flex items-center justify-between gap-3">
        <h1 className="text-3xl font-extrabold">Admin / Bestellungen</h1>
        <div className="flex items-center gap-2">
          <Link href="/admin" className="px-3 py-1.5 rounded bg-white/10 hover:bg-white/20">
            ← Admin Hauptmenü
          </Link>
          <a
            href={`/api/admin/orders/export?key=${encodeURIComponent(token ?? "")}`}
            className="px-3 py-1.5 rounded bg-white/10 hover:bg-white/20"
          >
            CSV exportieren
          </a>
          <Link
            href={`/admin/products?key=${encodeURIComponent(token ?? "")}`}
            className="px-3 py-1.5 rounded bg-white/10 hover:bg-white/20"
          >
            Produkte
          </Link>
        </div>
      </div>

      {/* Info + Pagination (oben) */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 text-sm opacity-80">
        <div>
          Gesamt: <span className="font-semibold">{total}</span> Bestellungen · Seite{" "}
          <span className="font-semibold">{currentPage}</span> / {maxPage} ({orders.length} Einträge)
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={linkTo(1)}
            aria-disabled={!hasPrev}
            className={`px-3 py-1.5 rounded border border-white/10 ${
              hasPrev ? "bg-white/5 hover:bg-white/10" : "bg-white/5 opacity-50 cursor-not-allowed"
            }`}
            title="Erste Seite"
          >
            |&lt;
          </Link>
          <Link
            href={linkTo(currentPage - 1)}
            aria-disabled={!hasPrev}
            className={`px-3 py-1.5 rounded border border-white/10 ${
              hasPrev ? "bg-white/5 hover:bg-white/10" : "bg-white/5 opacity-50 cursor-not-allowed"
            }`}
            title="Zurück"
          >
            ‹
          </Link>
          <Link
            href={linkTo(currentPage + 1)}
            aria-disabled={!hasNext}
            className={`px-3 py-1.5 rounded border border-white/10 ${
              hasNext ? "bg-white/5 hover:bg-white/10" : "bg-white/5 opacity-50 cursor-not-allowed"
            }`}
            title="Weiter"
          >
            ›
          </Link>
          <Link
            href={linkTo(maxPage)}
            aria-disabled={!hasNext}
            className={`px-3 py-1.5 rounded border border-white/10 ${
              hasNext ? "bg-white/5 hover:bg-white/10" : "bg-white/5 opacity-50 cursor-not-allowed"
            }`}
            title="Letzte Seite"
          >
            &gt;|
          </Link>
        </div>
      </div>

      {orders.length === 0 && (
        <div className="text-white/70">Noch keine Bestellungen.</div>
      )}

      <div className="space-y-6">
        {orders.map((o) => {
          const itemsTotal = o.items.reduce((sum, it) => sum + it.qty * it.unitPrice, 0);
          const sessionId = o.stripeId || ""; // wird für /api/checkout/confirm genutzt

          const name = [o.firstName, o.lastName].filter(Boolean).join(" ");
          const line1 = (o as any).address || (o as any).street || "";
          const line2 = [(o as any).postalCode || (o as any).zip, o.city].filter(Boolean).join(" ");
          const invoiceNumber = (o as any).invoiceNumber || "—";
          const paymentProvider = (o as any).paymentProvider || "—";

          return (
            <article key={o.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
              {/* Kopf: Status + Datum + PDF */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="font-semibold flex items-center gap-3">
                  <span className="opacity-60">#{o.id.slice(-6)}</span>
                  <OrderStatusControl orderId={o.id} current={o.status} adminKey={token} />
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-sm opacity-70">
                    {new Date(o.createdAt).toLocaleString("de-AT")}
                  </div>
                  <a
                    href={`/admin/orders/${o.id}/invoice?key=${encodeURIComponent(token ?? "")}`}
                    target="_blank"
                    className="px-3 py-1.5 rounded bg-cyan-500 hover:bg-cyan-400 text-black font-semibold"
                    title="Rechnung als PDF öffnen"
                  >
                    Rechnung (PDF)
                  </a>
                </div>
              </div>

              {/* Stripe/Session ID + Aktion */}
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <div className="opacity-60">Stripe Session</div>
                  <div className="font-mono text-xs break-all">{sessionId || "—"}</div>
                </div>
                <div className="shrink-0">
                  {sessionId ? (
                    <form
                      action={`/api/checkout/confirm?session_id=${encodeURIComponent(sessionId)}`}
                      method="post"
                      target="_blank"
                      title="Lagerbestände anhand dieser Bestellung anwenden (öffnet JSON-Antwort in neuem Tab)"
                    >
                      <button type="submit" className="px-3 py-1.5 rounded bg-white/10 hover:bg-white/20">
                        Bestand anwenden
                      </button>
                    </form>
                  ) : (
                    <button
                      type="button"
                      className="px-3 py-1.5 rounded bg-white/10 text-white/50 cursor-not-allowed"
                      title="Keine Stripe-Session vorhanden"
                      disabled
                    >
                      Bestand anwenden
                    </button>
                  )}
                </div>
              </div>

              {/* Faktenzeile */}
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                <div>
                  <div className="opacity-60">Kunde</div>
                  <div className="font-medium">{name || "—"}</div>
                  <div className="opacity-70">{o.email ?? "—"}</div>
                  {line1 && <div className="opacity-70">{line1}</div>}
                  {(line2 || o.country) && (
                    <div className="opacity-70">{[line2, o.country].filter(Boolean).join(", ")}</div>
                  )}
                </div>
                <div>
                  <div className="opacity-60">Zwischensumme (Items)</div>
                  <div>{eur(itemsTotal)}</div>
                  <div className="opacity-60 mt-2">Gesamt</div>
                  <div className="font-semibold">
                    {eur(o.amountTotal)} {o.currency?.toUpperCase() || "EUR"}
                  </div>
                </div>
                <div>
                  <div className="opacity-60">Status</div>
                  <div className="font-medium">{o.status}</div>
                  <div className="opacity-60 mt-2">Zahlart</div>
                  <div className="font-medium">{paymentProvider}</div>
                  <div className="opacity-60 mt-2">Rechnungs-Nr.</div>
                  <div className="font-medium">{invoiceNumber}</div>
                </div>
              </div>

              {/* Positionen */}
              <div className="mt-4">
                <div className="opacity-60 text-sm mb-1">Positionen</div>
                <ul className="space-y-2">
                  {o.items.map((it) => {
                    const title =
                      it.product?.productName ||
                      (it.product
                        ? `${it.product.artist ?? ""}${
                            it.product.artist && it.product.trackTitle ? " – " : ""
                          }${it.product.trackTitle ?? ""}`
                        : "Versand / Service");
                    return (
                      <li
                        key={it.id}
                        className="flex items-center justify-between gap-3 rounded border border-white/10 bg-white/5 px-3 py-2"
                      >
                        <div className="min-w-0">
                          <div className="truncate">{title}</div>
                          <div className="text-xs opacity-60">
                            {it.productId ? `Product #${it.productId}` : "ohne Produkt (Versand/Service)"}
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <div className="font-semibold">
                            {it.qty} × {eur(it.unitPrice)}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div className="mt-4 text-right">
                <Link
                  href={`/admin/orders/${o.id}?key=${encodeURIComponent(token ?? "")}`}
                  className="inline-block px-3 py-1.5 rounded bg-white/10 hover:bg-white/20"
                >
                  Details
                </Link>
              </div>
            </article>
          );
        })}
      </div>

      {/* Pagination unten */}
      <div className="mt-8 flex items-center justify-between gap-3">
        <div className="text-sm opacity-70">
          Seite {currentPage} von {maxPage}
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={linkTo(1)}
            aria-disabled={!hasPrev}
            className={`px-3 py-2 rounded border border-white/10 ${
              hasPrev ? "bg-white/5 hover:bg-white/10" : "bg-white/5 opacity-50 cursor-not-allowed"
            }`}
            title="Erste Seite"
          >
            |&lt;
          </Link>
          <Link
            href={linkTo(currentPage - 1)}
            aria-disabled={!hasPrev}
            className={`px-3 py-2 rounded border border-white/10 ${
              hasPrev ? "bg-white/5 hover:bg-white/10" : "bg-white/5 opacity-50 cursor-not-allowed"
            }`}
            title="Zurück"
          >
            ‹
          </Link>
          <Link
            href={linkTo(currentPage + 1)}
            aria-disabled={!hasNext}
            className={`px-3 py-2 rounded border border-white/10 ${
              hasNext ? "bg-white/5 hover:bg-white/10" : "bg-white/5 opacity-50 cursor-not-allowed"
            }`}
            title="Weiter"
          >
            ›
          </Link>
          <Link
            href={linkTo(maxPage)}
            aria-disabled={!hasNext}
            className={`px-3 py-2 rounded border border-white/10 ${
              hasNext ? "bg-white/5 hover:bg-white/10" : "bg-white/5 opacity-50 cursor-not-allowed"
            }`}
            title="Letzte Seite"
          >
            &gt;|
          </Link>
        </div>
      </div>
    </div>
  );
}