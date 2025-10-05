// app/api/admin/orders/backfill/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * Admin-Backfill: Bestellungen manuell eintragen (z. B. alte PayPal-Käufe)
 *
 * Sicherheit:
 *  - Query: ?key=ADMIN_TOKEN   (vergleicht mit NEXT_PUBLIC_ADMIN_TOKEN)
 *
 * Body (JSON):
 * {
 *   "email": "kunde@example.com",
 *   "firstName": "Max",
 *   "lastName": "Muster",
 *   "address": "Hauptstraße 1",
 *   "zip": "1010",
 *   "city": "Wien",
 *   "country": "AT",
 *   "currency": "EUR",
 *   "paymentProvider": "paypal",                  // optional (z.B. "paypal" | "stripe" | "manual")
 *   "note": "Backfill PayPal 46E18546WU741462L",  // optional (wird derzeit nicht gespeichert)
 *   "items": [
 *     { "productId": "prod_xxx", "qty": 1, "unitPriceCents": 500 } // 5,00 €
 *   ],
 *   "shippingCents": 400                          // optional, z.B. 4,00 € Versand getrennt
 * }
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ItemIn = { productId: string; qty: number; unitPriceCents: number };
type Body = {
  email: string;
  firstName?: string;
  lastName?: string;
  address?: string;
  zip?: string;
  city?: string;
  country?: string;
  currency?: string;          // default: "EUR"
  paymentProvider?: string;   // optional: "paypal" | "stripe" | "manual" | ...
  note?: string;              // aktuell nicht persistiert (kein Feld im Schema)
  items: ItemIn[];
  shippingCents?: number;     // optional: Versand als separates Line-Item
};

function ok(tokenFromUrl: string | null) {
  const need = process.env.NEXT_PUBLIC_ADMIN_TOKEN;
  if (!need) return true;
  return tokenFromUrl === need;
}

export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    const key = url.searchParams.get("key");
    if (!ok(key)) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const body = (await req.json()) as Body;

    if (!body?.email) {
      return NextResponse.json({ error: "email required" }, { status: 400 });
    }
    if (!Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json({ error: "items required" }, { status: 400 });
    }

    // Sanitizing & totals
    const currency = (body.currency || "EUR").toUpperCase();
    const items = body.items
      .map((it) => ({
        productId: String(it.productId),
        qty: Math.max(1, Math.min(999, Number(it.qty || 1))),
        unit: Math.max(0, Math.floor(Number(it.unitPriceCents || 0))),
      }))
      .filter((it) => it.productId && Number.isFinite(it.qty) && Number.isFinite(it.unit));

    if (items.length === 0) {
      return NextResponse.json({ error: "invalid items" }, { status: 400 });
    }

    const shippingCents = Number.isFinite(Number(body.shippingCents))
      ? Math.max(0, Math.floor(Number(body.shippingCents)))
      : 0;

    const amountItems = items.reduce((s, it) => s + it.unit * it.qty, 0);
    const amountTotal = amountItems + shippingCents;

    if (amountTotal <= 0) {
      return NextResponse.json({ error: "amountTotal must be > 0" }, { status: 400 });
    }

    // Transaktion: Order anlegen, Items schreiben, Bestände reduzieren
    const orderId = await prisma.$transaction(async (tx) => {
      // Order erstellen
      const order = await tx.order.create({
        data: {
          stripeId: null, // Backfill nicht über Stripe
          email: body.email.trim(),
          firstName: body.firstName?.trim() || null,
          lastName: body.lastName?.trim() || null,
          address: body.address?.trim() || null,
          zip: body.zip?.trim() || null,
          city: body.city?.trim() || null,
          country: body.country?.trim() || null,
          amountTotal,
          currency,
          status: "paid", // Backfill = bereits bezahlt
          ...(body.paymentProvider ? { paymentProvider: body.paymentProvider } : {}),
        } as any,
        select: { id: true },
      });

      // Produkt-Positionen + Bestandsreduktion
      for (const it of items) {
        const p = await tx.product.findUnique({ where: { id: it.productId } });
        if (!p) {
          // Falls Produkt nicht existiert → überspringen (oder: Fehler werfen)
          continue;
        }

        const newStock = Math.max(0, (p.stock ?? 0) - it.qty);
        await tx.product.update({
          where: { id: p.id },
          data: {
            stock: newStock,
            active: newStock > 0 ? p.active : false,
          },
        });

        await tx.orderItem.create({
          data: {
            orderId: order.id,
            productId: p.id,
            qty: it.qty,
            unitPrice: it.unit, // Cent
          },
        });
      }

      // Separates Versand-Item (ohne Produktbezug), wenn angegeben
      if (shippingCents > 0) {
        await tx.orderItem.create({
          data: {
            orderId: order.id,
            productId: null, // kein Produkt → "Versand / Service"
            qty: 1,
            unitPrice: shippingCents,
          },
        });
      }

      return order.id;
    });

    return NextResponse.json({ ok: true, orderId }, { status: 200 });
  } catch (e: any) {
    console.error("[admin/orders/backfill] error:", e);
    return NextResponse.json({ error: e?.message || "server error" }, { status: 500 });
  }
}