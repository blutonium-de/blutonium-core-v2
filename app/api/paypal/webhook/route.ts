// app/api/paypal/webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { finalizeOrderAndInventory } from "@/lib/orders";
import { chooseBestShipping, type RegionCode } from "@/lib/shipping";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ---------- Versand-Item idempotent anlegen/aktualisieren ---------- */
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

/* ----------------- PayPal API helpers ----------------- */
const PP_BASE =
  (process.env.PAYPAL_MODE || "live").toLowerCase() === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

async function getPayPalAccessToken(): Promise<string> {
  const cid = process.env.PAYPAL_CLIENT_ID!;
  const sec = process.env.PAYPAL_SECRET!;
  const r = await fetch(`${PP_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      "Authorization": "Basic " + Buffer.from(`${cid}:${sec}`).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!r.ok) throw new Error(`paypal token failed: ${r.status} ${await r.text()}`);
  const j = await r.json();
  return j.access_token as string;
}

async function fetchPayPalOrder(orderId: string) {
  const token = await getPayPalAccessToken();
  const r = await fetch(`${PP_BASE}/v2/checkout/orders/${orderId}`, {
    headers: { "Authorization": `Bearer ${token}` },
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`fetch order ${orderId} failed: ${r.status} ${await r.text()}`);
  return r.json();
}

/* ----------------- Webhook ----------------- */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const eventType = body?.event_type as string;

    if (eventType === "PAYMENT.CAPTURE.COMPLETED") {
      const res = body?.resource || {};
      const captureId: string | undefined = res?.id;
      const related = res?.supplementary_data?.related_ids || {};
      const paypalOrderId: string | undefined = related?.order_id;

      let orderId: string | null = null;
      let shipCents = 0;
      let shipName: string | null = null;

      // A) Versuch 1: Versand direkt aus Capture
      try {
        const capShipStr: string | undefined = res?.amount?.breakdown?.shipping?.value;
        if (capShipStr) {
          const eur = Number(capShipStr);
          if (Number.isFinite(eur) && eur > 0) {
            shipCents = Math.round(eur * 100);
            shipName = "Versand";
          }
        }
      } catch {/* ignore */}

      // B) Order laden -> custom_id (=unsere orderId) + ggf. shipping fallback
      try {
        if (paypalOrderId) {
          const ppOrder = await fetchPayPalOrder(paypalOrderId);
          const pu = Array.isArray(ppOrder?.purchase_units) ? ppOrder.purchase_units[0] : null;
          if (!orderId) orderId = pu?.custom_id || null;

          if (shipCents <= 0) {
            const shippingStr: string | undefined = pu?.amount?.breakdown?.shipping?.value;
            if (shippingStr) {
              const eur = Number(shippingStr);
              if (Number.isFinite(eur) && eur > 0) {
                shipCents = Math.round(eur * 100);
                shipName = pu?.shipping_method || pu?.description || "Versand";
              }
            }
          }
        }
      } catch (e: any) {
        console.warn("[paypal/webhook] fetch order/breakdown failed:", e?.message || e);
      }

      // C) Fallback: manchmal spiegelt Capture custom_id
      if (!orderId) orderId = res?.custom_id || null;
      if (!orderId) return NextResponse.json({ received: true });

      // Provider markieren (nicht kritisch)
      prisma.order.update({ where: { id: orderId }, data: { paymentProvider: "paypal" as any } }).catch(() => {});

      // D) Eigene Versandberechnung, wenn PayPal nichts geliefert hat
      if (shipCents <= 0) {
        try {
          const dbOrder = await prisma.order.findUnique({
            where: { id: orderId },
            include: {
              items: {
                include: { product: { select: { isDigital: true, weightGrams: true } } },
              },
            },
          });
          if (dbOrder) {
            const region: RegionCode = (dbOrder.country || "").toUpperCase() === "AT" ? "AT" : "EU";

            const subtotalEUR =
              dbOrder.items.reduce((s, it) => s + (it.unitPrice / 100) * it.qty, 0);

            const hasPhysical = dbOrder.items.some((it) => !it.product?.isDigital);

            // Mindestgewicht 50g, damit bei "0 g" dennoch ein Tarif greift
            const rawWeight = dbOrder.items.reduce((s, it) => {
              const w = Number(it.product?.weightGrams ?? 0);
              const isDigital = !!it.product?.isDigital;
              return s + (isDigital ? 0 : Math.max(0, w) * it.qty);
            }, 0);
            const effWeight = hasPhysical ? Math.max(50, rawWeight) : 0;

            let quote = hasPhysical
              ? chooseBestShipping({ region, totalWeightGrams: effWeight, subtotalEUR })
              : null;

            // absoluter Fallback: wenn aus irgendeinem Grund kein Quote zurückkommt,
            // nochmal mit 1g probieren
            if (!quote && hasPhysical) {
              quote = chooseBestShipping({ region, totalWeightGrams: 1, subtotalEUR });
            }

            if (quote && quote.amountEUR > 0) {
              shipCents = Math.round(quote.amountEUR * 100);
              shipName = shipName || `Versand (${quote.name})`;
            }
          }
        } catch (e: any) {
          console.warn("[paypal/webhook] fallback shipping calc failed:", e?.message || e);
        }
      }

      // E) Versand idempotent eintragen
      try {
        if (shipCents > 0 || shipName) {
          await upsertShipping(orderId, shipCents, shipName);
        }
      } catch (e: any) {
        console.warn("[paypal/webhook] upsert shipping failed:", e?.message || e);
      }

      // F) Finalisieren
      try {
        const totalCents = res?.amount?.value ? Math.round(Number(res.amount.value) * 100) : undefined;
        await finalizeOrderAndInventory({
          orderId,
          provider: "paypal",
          externalId: captureId || paypalOrderId || "paypal_capture",
          totalCents,
        });
      } catch (e: any) {
        console.warn("[paypal/webhook] finalize failed:", e?.message || e);
      }

      return NextResponse.json({ received: true });
    }

    // andere Events: ack
    return NextResponse.json({ received: true });
  } catch (e: any) {
    console.error("[paypal/webhook] ERROR", e?.message || e, e?.stack);
    return NextResponse.json({ error: e?.message || "server_error" }, { status: 500 });
  }
}