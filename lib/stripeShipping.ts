// lib/stripeShipping.ts
import { prisma } from "@/lib/db";

function parseShipping(meta: Record<string, any> | null | undefined) {
  const name = (meta?.shipping_name ?? "").toString().trim();
  const eur = Number(meta?.shipping_eur ?? 0);
  const cents = Math.round(isFinite(eur) ? eur * 100 : 0);
  return { name: name || null, cents: Math.max(0, cents) };
}

/**
 * Hängt (falls vorhanden) eine Versand-Position an die Order
 * und erhöht amountTotal – idempotent (legt NICHT doppelt an).
 */
export async function upsertShippingFromMetadata(orderId: string, meta?: Record<string, any>) {
  const { cents } = parseShipping(meta);
  if (!orderId || cents <= 0) return;

  await prisma.$transaction(async (tx) => {
    // Schon eine Versand-Position vorhanden?
    const exists = await tx.orderItem.findFirst({
      where: { orderId, productId: null, unitPrice: cents },
      select: { id: true },
    });
    if (exists) return;

    await tx.orderItem.create({
      data: { orderId, productId: null, qty: 1, unitPrice: cents },
    });
    await tx.order.update({
      where: { id: orderId },
      data: { amountTotal: { increment: cents } },
    });
  });
}