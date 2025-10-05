// app/api/checkout/create/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  email: string;
  firstName?: string;
  lastName?: string;

  // Eingabe-Kompat: wir akzeptieren sowohl (street/postalCode) als auch (address/zip)
  street?: string;
  postalCode?: string;
  address?: string;
  zip?: string;

  city?: string;
  country?: string;
  phone?: string;
  items: Array<{ productId: string; qty: number }>;
  currency?: string;           // default "EUR"
  paymentProvider?: string;    // optional, e.g. "paypal" | "stripe"
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;

    if (!body?.email) {
      return NextResponse.json({ error: "email missing" }, { status: 400 });
    }
    if (!Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json({ error: "items missing" }, { status: 400 });
    }

    // Addressfelder: auf dein Prisma-Schema mappen (address, zip)
    const address = (body.address ?? body.street ?? "").trim();
    const zip     = (body.zip ?? body.postalCode ?? "").trim();
    const city    = (body.city ?? "").trim();
    const country = (body.country ?? "").trim() || "Austria";

    if (!address || !zip || !city || !country) {
      return NextResponse.json({ error: "address incomplete" }, { status: 400 });
    }

    // Produkte laden und validieren
    const ids = [...new Set(body.items.map((i) => i.productId).filter(Boolean))];
    if (!ids.length) {
      return NextResponse.json({ error: "no valid product ids" }, { status: 400 });
    }

    const products = await prisma.product.findMany({
      where: { id: { in: ids }, active: true },
      select: { id: true, priceEUR: true, stock: true },
    });
    const pMap = new Map(products.map((p) => [p.id, p]));

    let amountTotal = 0; // in Cents
    const linePayload: { productId: string; qty: number; unitPriceCents: number }[] = [];

    for (const it of body.items) {
      const pid = String(it.productId || "");
      const wantQty = Math.max(1, Math.min(99, Number(it.qty || 1)));
      const p = pMap.get(pid);

      if (!p) {
        return NextResponse.json({ error: `product not found or inactive: ${pid}` }, { status: 400 });
      }

      // Lagerbestand respektieren
      const max = Math.max(0, Number(p.stock ?? 0));
      if (max <= 0) {
        return NextResponse.json({ error: `product out of stock: ${pid}` }, { status: 400 });
      }
      const qty = Math.min(wantQty, max);

      const unitPriceCents = Math.round(Number(p.priceEUR) * 100);
      amountTotal += unitPriceCents * qty;
      linePayload.push({ productId: pid, qty, unitPriceCents });
    }

    if (!linePayload.length) {
      return NextResponse.json({ error: "no valid items (after stock check)" }, { status: 400 });
    }

    // Order + Items anlegen
    const order = await prisma.order.create({
      data: {
        email: body.email.trim(),
        firstName: body.firstName?.trim() || null,
        lastName: body.lastName?.trim() || null,

        // Prisma-Felder heißen bei dir: address, zip, city, country
        address,
        zip,
        city,
        country,
        phone: body.phone?.trim() || null,

        paymentProvider: body.paymentProvider || null,

        amountTotal,
        currency: (body.currency || "EUR").toUpperCase(),
        status: "pending",

        items: {
          create: linePayload.map((l) => ({
            qty: l.qty,
            unitPrice: l.unitPriceCents,
            product: { connect: { id: l.productId } },
          })),
        },
      },
      select: { id: true, amountTotal: true, currency: true },
    });

    return NextResponse.json({
      ok: true,
      orderId: order.id,
      amountTotal: order.amountTotal,
      currency: order.currency,
    });
  } catch (e: any) {
    console.error("checkout/create", e);
    return NextResponse.json({ error: e?.message || "server error" }, { status: 500 });
  }
}