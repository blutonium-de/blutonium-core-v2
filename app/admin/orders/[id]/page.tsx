import { prisma } from "../../../../lib/db";
import Link from "next/link";
import OrderStatusControl from "../../../../components/OrderStatusControl";

export const dynamic = "force-dynamic";

function eur(cents: number | null | undefined) {
  const v = typeof cents === "number" ? cents : 0;
  return (v / 100).toFixed(2) + " €";
}

type Props = {
  params: { id: string };
  searchParams?: { key?: string };
};

function ok(tokenFromUrl: string | undefined) {
  const need = process.env.NEXT_PUBLIC_ADMIN_TOKEN;
  if (!need) return true;
  return tokenFromUrl === need;
}

export default async function OrderDetailPage({ params, searchParams }: Props) {
  const token = searchParams?.key;
  if (!ok(token)) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-extrabold mb-4">Admin / Order</h1>
        <p className="text-white/70">
          Zugriff verweigert. Hänge dein Admin-Token an die URL:
        </p>
        <pre className="mt-3 bg-white/5 border border-white/10 rounded p-3 overflow-auto">
{`/admin/orders/${params.id}?key=${process.env.NEXT_PUBLIC_ADMIN_TOKEN ?? "<DEIN_TOKEN>"}`}
        </pre>
      </div>
    );
  }

  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: {
      items: { include: { product: true } },
    },
  });

  if (!order) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-extrabold mb-4">Order nicht gefunden</h1>
        <Link
          href={`/admin/orders?key=${encodeURIComponent(token ?? "")}`}
          className="inline-block px-3 py-1.5 rounded bg-white/10 hover:bg-white/20"
        >
          Zurück zur Liste
        </Link>
      </div>
    );
  }

  const itemsTotal = order.items.reduce((s, it) => s + it.qty * it.unitPrice, 0);

  // ► konsistente Anzeige in Europe/Vienna
  const atDate = new Intl.DateTimeFormat("de-AT", {
    timeZone: "Europe/Vienna",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(order.createdAt));

  // ► Payment-Label
  const provider = (order.paymentProvider || "").toLowerCase();
  const providerLabel =
    provider === "stripe" ? "Stripe / Karte"
    : provider === "paypal" ? "PayPal"
    : provider ? provider.charAt(0).toUpperCase() + provider.slice(1)
    : "—";

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-3xl font-extrabold">Order #{order.id.slice(-6)}</h1>
        <Link
          href={`/admin/orders?key=${encodeURIComponent(token ?? "")}`}
          className="inline-block px-3 py-1.5 rounded bg-white/10 hover:bg-white/20"
        >
          Zurück
        </Link>
      </div>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
        {/* Zahlungsart */}
        <div>
          <div className="opacity-60">Zahlart</div>
          <div className="font-semibold">{providerLabel}</div>
        </div>

        {/* provider-spezifische IDs */}
        {provider === "stripe" && (
          <div>
            <div className="opacity-60">Stripe Session</div>
            <div className="font-mono text-xs break-all">{order.stripeId ?? "—"}</div>
          </div>
        )}
        {provider === "paypal" && (
          <div>
            <div className="opacity-60">PayPal Capture-ID</div>
            <div className="font-mono text-xs break-all">{order.paymentId ?? "—"}</div>
          </div>
        )}

        <div>
          <div className="opacity-60">E-Mail</div>
          <div>{order.email ?? "—"}</div>
        </div>

        <div>
          <div className="opacity-60">Datum</div>
          <div>{atDate}</div>
        </div>

        <div>
          <div className="opacity-60 mb-1">Status</div>
          <OrderStatusControl orderId={order.id} current={order.status} adminKey={token} />
        </div>

        <div>
          <div className="opacity-60">Zwischensumme (Items)</div>
          <div>{eur(itemsTotal)}</div>
        </div>

        <div>
          <div className="opacity-60">Gesamt (bezahlt)</div>
          <div className="font-semibold">{eur(order.amountTotal)}</div>
        </div>
      </div>

      <h2 className="mt-8 font-semibold opacity-80">Positionen</h2>
      <div className="mt-2 space-y-2">
        {order.items.map((it) => {
          const title =
            it.product?.productName ||
            (it.product
              ? `${it.product.artist ?? ""}${it.product.artist && it.product.trackTitle ? " – " : ""}${it.product.trackTitle ?? ""}`
              : "Versand / Service");

          return (
            <div
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
            </div>
          );
        })}
      </div>
    </div>
  );
}