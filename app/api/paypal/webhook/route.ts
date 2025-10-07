// app/api/paypal/webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { finalizeOrderAndInventory } from "@/lib/orders";

// ---------- Shipping-Helfer (identisch zu Stripe-Version) ----------
async function upsertShipping(orderId: string, cents?: number | null, name?: string | null) {
  const shipCents = Math.max(0, Number(cents ?? 0) | 0);
  const shipName  = (name ?? "").trim() || null;
  if (shipCents <= 0 && !shipName) return;

  await prisma.$transaction(async (tx) => {
    const existing = await tx.orderItem.findFirst({
      where: { orderId, productId: null },
      select: { id: true, unitPrice: true },
    });

    if (!existing && shipCents > 0) {
      await tx.orderItem.create({ data: { orderId, productId: null, qty: 1, unitPrice: shipCents } });
      await tx.order.update({ where: { id: orderId }, data: { amountTotal: { increment: shipCents } } });
    } else if (existing && shipCents > 0 && existing.unitPrice !== shipCents) {
      const delta = shipCents - existing.unitPrice;
      await tx.orderItem.update({ where: { id: existing.id }, data: { unitPrice: shipCents } });
      await tx.order.update({ where: { id: orderId }, data: { amountTotal: { increment: delta } } });
    }
  });
}

// ---------- PayPal API Minimal-Client (für Fallback) ----------
const PP_ENV = (process.env.PAYPAL_ENV || "").toLowerCase(); // "sandbox" | ""
const PP_BASE = process.env.PAYPAL_API_BASE
  ?? (PP_ENV === "sandbox" ? "https://api-m.sandbox.paypal.com" : "https://api-m.paypal.com");
const PP_ID = process.env.PAYPAL_CLIENT_ID || "";
const PP_SECRET = process.env.PAYPAL_CLIENT_SECRET || "";

async function ppAccessToken(): Promise<string | null> {
  if (!PP_ID || !PP_SECRET) return null;
  const r = await fetch(`${PP_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Authorization: "Basic " + Buffer.from(`${PP_ID}:${PP_SECRET}`).toString("base64") },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });
  if (!r.ok) return null;
  const j = await r.json();
  return j?.access_token || null;
}

async function ppFetchOrder(orderId: string): Promise<any | null> {
  const token = await ppAccessToken();
  if (!token) return null;
  const r = await fetch(`${PP_BASE}/v2/checkout/orders/${orderId}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!r.ok) return null;
  return r.json();
}

// ---------- Extractor-Helfer ----------
function readShippingValue(obj: any): { cents: number; name: string | null } {
  const str =
    obj?.amount?.breakdown?.shipping?.value ??
    obj?.purchase_units?.[0]?.amount?.breakdown?.shipping?.value ??
    null;
  const name =
    obj?.purchase_units?.[0]?.shipping_method ||
    obj?.purchase_units?.[0]?.description ||
    "Versand";
  const n = str ? Number(str) : NaN;
  return { cents: Number.isFinite(n) ? Math.round(n * 100) : 0, name };
}

function readOrderId(obj: any): string | null {
  // 1) custom_id, 2) invoice_id, 3) related order_id
  return (
    obj?.purchase_units?.[0]?.custom_id ||
    obj?.invoice_id ||
    obj?.supplementary_data?.related_ids?.order_id ||
    null
  );
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    // ⚠️ Signatur-Validierung wie in deinem Projekt beibehalten/ergänzen.
    const body = await req.json();
    const eventType = body?.event_type as string;
    const res = body?.resource || {};

    // Wir versuchen IMMER zuerst, orderId + Versand direkt zu lesen …
    let orderId = readOrderId(res);
    let { cents: shipCents, name: shipName } = readShippingValue(res);

    // … wenn wir bei CAPTURE nur die Capture-Resource bekommen, fehlen oft purchase_units.
    // Dann holen wir uns die ursprüngliche Order.
    if ((!orderId || shipCents === 0) && res?.supplementary_data?.related_ids?.order_id) {
      const fullOrder = await ppFetchOrder(res.supplementary_data.related_ids.order_id);
      if (fullOrder) {
        orderId = orderId || readOrderId(fullOrder);
        const sh = readShippingValue(fullOrder);
        if (sh.cents > 0) { shipCents = sh.cents; shipName = sh.name; }
      }
    }

    // Falls immer noch keine Order-ID: quittieren und raus.
    if (!orderId) return NextResponse.json({ received: true });

    // Provider markieren (Statistiken)
    prisma.order.update({ where: { id: orderId }, data: { paymentProvider: "paypal" as any } }).catch(() => {});

    // Versand-Position idempotent pflegen
    await upsertShipping(orderId, shipCents, shipName);

    // Finalisieren (idempotent in deinem Helper)
    const externalId =
      res?.id ||
      res?.supplementary_data?.related_ids?.capture_id ||
      res?.supplementary_data?.related_ids?.order_id ||
      "paypal";
    const totalCents = res?.amount?.value ? Math.round(Number(res.amount.value) * 100) : undefined;

    await finalizeOrderAndInventory({
      orderId,
      provider: "paypal",
      externalId,
      totalCents,
    });

    return NextResponse.json({ received: true });
  } catch (e: any) {
    console.error("[paypal/webhook] ERROR", e?.message || e, e?.stack);
    return NextResponse.json({ error: e?.message || "server_error" }, { status: 500 });
  }
}