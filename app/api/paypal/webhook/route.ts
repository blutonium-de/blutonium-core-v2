// app/api/paypal/webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { finalizeOrderAndInventory } from "@/lib/orders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ---- Helper wie beim Stripe-Webhook ---------------------------------------
// Idempotent: löscht bestehende Versand-Zeilen (productId = null) und legt
// genau EINE neu an; danach amountTotal aus allen Positionen frisch berechnen.
async function upsertShipping(orderId: string, cents?: number | null, name?: string | null) {
  const shipCents = Math.max(0, Number(cents ?? 0) | 0);
  const shipName  = (name ?? "").trim() || null;

  await prisma.$transaction(async (tx) => {
    // immer erst alles entfernen → rennfest bei mehrfacher Zustellung
    await tx.orderItem.deleteMany({ where: { orderId, productId: null } });

    // bei > 0 genau EINE Versand-Zeile anlegen
    if (shipCents > 0) {
      await tx.orderItem.create({
        data: { orderId, productId: null, qty: 1, unitPrice: shipCents },
      });
    }

    // Gesamtsumme korrekt neu berechnen
    const items = await tx.orderItem.findMany({
      where: { orderId },
      select: { qty: true, unitPrice: true },
    });
    const newTotal = items.reduce((s, it) => s + it.qty * it.unitPrice, 0);

    await tx.order.update({
      where: { id: orderId },
      data: {
        amountTotal: newTotal,
        // optional: shippingName, falls du es in der Order speichern willst
        // shippingName: shipName,
      },
    });
  });
}

// Robuste Extraktion einiger Felder aus PayPal-Webhook
function getOrderIdFromPaypalResource(res: any): string | null {
  // Best: purchase_units[0].custom_id (setzen wir bei Order-Erstellung)
  const pu = Array.isArray(res?.purchase_units) ? res.purchase_units[0] : undefined;
  return (
    pu?.custom_id ||
    res?.custom_id || // manche Integrationen spiegeln es hoch
    res?.invoice_id ||
    res?.supplementary_data?.related_ids?.order_id ||
    null
  );
}

function getShippingCentsAndName(res: any): { cents: number; name: string | null } {
  // Betrag (als String, z.B. "4.50") – je nach Event liegt das in unterschiedlichen Pfaden
  const pu = Array.isArray(res?.purchase_units) ? res.purchase_units[0] : undefined;

  const valueStr =
    res?.amount?.breakdown?.shipping?.value ??
    pu?.amount?.breakdown?.shipping?.value ??
    null;

  const eur = valueStr ? Number(valueStr) : NaN;
  const cents = Number.isFinite(eur) ? Math.round(eur * 100) : 0;

  // halbwegs sprechender Name
  const name =
    pu?.shipping_method ||
    pu?.description ||
    "Versand";

  return { cents, name };
}

export async function POST(req: NextRequest) {
  try {
    // ⚠️ WICHTIG: Hier deine PayPal-Signaturprüfung einbauen (wie bei dir im Projekt vorhanden).
    const body = await req.json();
    const eventType = body?.event_type as string;
    const res = body?.resource || {};

    // Wir reagieren nur auf den finalen Capture (nach erfolgreicher Zahlung).
    if (eventType === "PAYMENT.CAPTURE.COMPLETED") {
      const orderId = getOrderIdFromPaypalResource(res);
      if (!orderId) {
        // Kein interner Order-Bezug → nur ack
        return NextResponse.json({ received: true });
      }

      // Provider markieren (für Auswertungen)
      prisma.order.update({
        where: { id: orderId },
        data: { paymentProvider: "paypal" as any },
      }).catch(() => {});

      // Versand idempotent pflegen (löschen + einmal neu anlegen)
      const ship = getShippingCentsAndName(res);
      await upsertShipping(orderId, ship.cents, ship.name);

      // Bestellung finalisieren (idempotent in deinem Helper)
      const externalId =
        res?.id ||
        res?.supplementary_data?.related_ids?.capture_id ||
        "paypal_capture";

      const totalCents = res?.amount?.value
        ? Math.round(Number(res.amount.value) * 100)
        : undefined;

      await finalizeOrderAndInventory({
        orderId,
        provider: "paypal",
        externalId,
        totalCents,
      });

      return NextResponse.json({ received: true });
    }

    // Alle anderen Events nur bestätigen.
    return NextResponse.json({ received: true });
  } catch (e: any) {
    console.error("[paypal/webhook] ERROR", e?.message || e, e?.stack);
    return NextResponse.json({ error: e?.message || "server_error" }, { status: 500 });
  }
}