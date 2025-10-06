import { prisma } from "@/lib/db";

/**
 * Markiert Order als "paid" (provider + IDs) und reduziert Bestände atomar.
 */
export async function finalizeOrderAndInventory(opts: {
  orderId: string;
  provider: "stripe" | "paypal";
  externalId?: string;        // z.B. Stripe PaymentIntent / Session ID oder PayPal Capture ID
  totalCents?: number;
}) {
  const { orderId, provider, externalId, totalCents } = opts;

  return await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order) throw new Error("order not found");
    if (order.status === "paid") return order; // idempotent

    if (typeof totalCents === "number" && totalCents > 0 && totalCents !== order.amountTotal) {
      console.warn("finalizeOrder: total mismatch", { order: order.amountTotal, reported: totalCents });
    }

    // Bestände reduzieren + ggf. deaktivieren
    for (const it of order.items) {
      if (!it.productId) continue;
      const p = await tx.product.findUnique({
        where: { id: it.productId },
        select: { stock: true },
      });
      if (!p) continue;
      const newStock = Math.max(0, (p.stock ?? 0) - (it.qty || 0));
      await tx.product.update({
        where: { id: it.productId },
        data: {
          stock: newStock,
          ...(newStock <= 0 ? { active: false } : {}),
        },
      });
    }

    const data: any = {
      status: "paid",
      paymentProvider: provider,
    };
    // generische Transaktions-ID
    if (externalId) data.paymentId = externalId;
    // Stripe-spezifisch zusätzlich stripeId befüllen, wenn sinnvoll
    if (provider === "stripe" && externalId) data.stripeId = externalId;

    const updated = await tx.order.update({
      where: { id: orderId },
      data,
    });

    return updated;
  });
}