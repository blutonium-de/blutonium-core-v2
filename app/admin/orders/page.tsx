// app/admin/orders/page.tsx
import { prisma } from "../../../lib/db";
import { headers } from "next/headers";
import Link from "next/link";
import OrderStatusControl from "../../../components/OrderStatusControl";

export const dynamic = "force-dynamic";

function eur(cents: number | null | undefined) {
  const v = typeof cents === "number" ? cents : 0;
  return (v / 100).toFixed(2) + " €";
}

function ok(tokenFromUrl: string | undefined) {
  const need = process.env.NEXT_PUBLIC_ADMIN_TOKEN;
  if (!need) return true; // wenn kein Token gesetzt ist, alles zulassen
  return tokenFromUrl === need;
}

type Props = { searchParams?: { key?: string } };

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

  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      items: {
        include: {
          product: true,
        },
      },
    },
    take: 200,
  });

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-extrabold mb-6">Admin / Orders</h1>

      {orders.length === 0 && (
        <div className="text-white/70">Noch keine Bestellungen.</div>
      )}

      <div className="space-y-6">
        {orders.map((o) => {
          const itemsTotal = o.items.reduce((sum, it) => sum + it.qty * it.unitPrice, 0);
          return (
            <article
              key={o.id}
              className="rounded-xl border border-white/10 bg-white/5 p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="font-semibold flex items-center gap-3">
                 <span className="opacity-60">#{o.id.slice(-6)}</span>
                 <OrderStatusControl orderId={o.id} current={o.status} adminKey={token} />
              </div>
                <div className="text-sm opacity-70">
                  {new Date(o.createdAt).toLocaleString("de-AT")}
                </div>
              </div>

              <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                <div>
                  <div className="opacity-60">E-Mail</div>
                  <div>{o.email ?? "—"}</div>
                </div>
                <div>
                  <div className="opacity-60">Zwischensumme (Items)</div>
                  <div>{eur(itemsTotal)}</div>
                </div>
                <div>
                  <div className="opacity-60">Gesamt (Stripe)</div>
                  <div className="font-semibold">{eur(o.amountTotal)}</div>
                </div>
              </div>

              <div className="mt-4">
                <div className="opacity-60 text-sm mb-1">Positionen</div>
                <ul className="space-y-2">
                  {o.items.map((it) => {
                    const title =
                      it.product?.productName ||
                      (it.product
                        ? `${it.product.artist ?? ""}${it.product.artist && it.product.trackTitle ? " – " : ""}${it.product.trackTitle ?? ""}`
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
    </div>
  );
}