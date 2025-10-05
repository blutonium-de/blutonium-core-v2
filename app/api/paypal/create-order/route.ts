// app/api/paypal/create-order/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { paypalApi } from "@/lib/paypal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ShippingMini = { name: string; amountEUR: number; carrier?: string };

type CreateOrderBody = {
  orderId?: string;
  amountEUR?: unknown;       // optional, Server rechnet selbst
  description?: unknown;
  shipping?: ShippingMini | null;
};

function eur(n: number) {
  return { currency_code: "EUR", value: n.toFixed(2) };
}
function clampName(s: string, max = 127) {
  return (s || "").toString().slice(0, max);
}
function safeNumber(v: unknown, def = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}

export async function POST(req: Request) {
  try {
    let payload: CreateOrderBody;
    try {
      payload = await req.json();
    } catch {
      return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
    }

    // --- Order aus DB laden
    const orderId = (payload.orderId || "").trim();
    if (!orderId) return NextResponse.json({ error: "orderId missing" }, { status: 400 });

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                slug: true,
                productName: true,
                artist: true,
                trackTitle: true,
                active: true,
              },
            },
          },
        },
      },
    });

    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
    if ((order.items?.length || 0) === 0)
      return NextResponse.json({ error: "Order has no items" }, { status: 400 });

    // --- Positionen in PayPal Items übersetzen
    const items = order.items
      .filter((it) => it.product && it.qty > 0 && it.unitPrice > 0 && it.product.active !== false)
      .map((it) => {
        const p = it.product!;
        const title =
          p.productName?.trim() ||
          `${p.artist ?? ""}${p.artist && p.trackTitle ? " – " : ""}${p.trackTitle ?? p.slug}`;
        const unitEUR = it.unitPrice / 100; // unitPrice ist in Cent
        return {
          name: clampName(title),
          quantity: String(it.qty),                      // PayPal erwartet String
          unit_amount: eur(unitEUR),
          // category: "PHYSICAL_GOODS" | "DIGITAL_GOODS" (optional)
        };
      });

    if (items.length === 0)
      return NextResponse.json({ error: "No purchasable items" }, { status: 400 });

    const itemsTotal = order.items.reduce((s, it) => s + (it.unitPrice * it.qty) / 100, 0);
    const shippingVal = Math.max(0, safeNumber(payload.shipping?.amountEUR, 0));
    const shippingName = clampName(payload.shipping?.name || "Versand");

    const grandTotal = itemsTotal + shippingVal;

    const desc =
      (typeof payload.description === "string" ? payload.description : `Order ${order.id}`).slice(
        0,
        127
      );

    const brand = process.env.NEXT_PUBLIC_SITE_NAME || "Blutonium Records";
    const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL || "").replace(/\/+$/, "");

    const body = {
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: `PU-${order.id}`,
          invoice_id: order.id, // praktisch für spätere Zuordnung
          description: desc,
          items,                // ⬅️ Positionen
          amount: {
            currency_code: "EUR",
            value: grandTotal.toFixed(2),
            breakdown: {
              item_total: eur(itemsTotal),
              shipping: eur(shippingVal),
            },
          },
          shipping: shippingVal > 0 ? {
            name: { full_name: shippingName },
          } : undefined,
        },
      ],
      application_context: {
        brand_name: brand,
        locale: "de-DE",
        user_action: "PAY_NOW",
        return_url: `${baseUrl}/de/checkout/success?paypal=1&order_id=${encodeURIComponent(order.id)}`,
        cancel_url: `${baseUrl}/de/checkout?paypal_cancel=1`,
      },
    };

    // Vollständige Repräsentation anfordern (hilfreich)
    const json = await paypalApi("/v2/checkout/orders", {
      method: "POST",
      headers: {
        Prefer: "return=representation",
        "PayPal-Request-Id": `ord-${order.id}-${Date.now()}`,
      },
      body: JSON.stringify(body),
    });

    const approveUrl = Array.isArray(json?.links)
      ? json.links.find((l: any) => l?.rel === "approve")?.href
      : undefined;

    if (!json?.id) {
      return NextResponse.json(
        { error: "Missing order id in PayPal response", raw: json },
        { status: 502 }
      );
    }

    return NextResponse.json({ id: json.id, approveUrl }, { status: 200 });
  } catch (e: any) {
    console.error("[paypal create-order]", e);
    return NextResponse.json({ error: e?.message || "server error" }, { status: 500 });
  }
}