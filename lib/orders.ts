// lib/orders.ts
import { prisma } from "@/lib/db";

/**
 * Markiert die Order als "paid", setzt Provider-Infos und reduziert Lagerbestände – atomar in einer TX.
 * Wird von Stripe-/PayPal-Flows aufgerufen.
 */
export async function finalizeOrderAndInventory(opts: {
  orderId: string;
  provider: "stripe" | "paypal";
  externalId?: string;        // z.B. Stripe Session ID / PayPal Order ID
  totalCents?: number;        // optional Plausibilitätscheck
}) {
  const { orderId, provider, externalId, totalCents } = opts;

  return await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order) throw new Error("order not found");
    if (order.status === "paid") return order; // idempotent

    // Optionaler Plausibilitätscheck (abweichungen loggen, aber nicht bremsen)
    if (typeof totalCents === "number" && totalCents > 0 && totalCents !== order.amountTotal) {
      console.warn("finalizeOrder: total mismatch", { order: order.amountTotal, reported: totalCents });
    }

    // Bestände reduzieren
    for (const it of order.items) {
      if (!it.productId) continue; // Versand/Service
      await tx.product.update({
        where: { id: it.productId },
        data: { stock: { decrement: it.qty } },
      });
    }

    // Order auf "paid" setzen + Provider-Felder
    const data: any = { status: "paid", paymentProvider: provider };
    if (provider === "stripe" && externalId) data.stripeId = externalId;
    if (provider === "paypal" && externalId) data["paypalId" as any] = externalId;

    const updated = await tx.order.update({
      where: { id: orderId },
      data,
    });

    return updated;
  });
}