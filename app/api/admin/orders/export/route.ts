// app/api/admin/orders/export/route.ts
import { NextResponse, NextRequest } from "next/server";
import { prisma } from "../../../../../lib/db";

// Einfacher Token-Check via ?key=
function isAuthorized(req: NextRequest) {
  const url = new URL(req.url);
  const key = url.searchParams.get("key");
  const expected = process.env.NEXT_PUBLIC_ADMIN_TOKEN || process.env.ADMIN_TOKEN;
  return key && expected && key === expected;
}

// CSV Helper – escapet Felder sauber
function csvEscape(v: any): string {
  if (v == null) return "";
  const s = String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Orders mit Items + (optional) Product holen
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      items: {
        include: { product: true },
      },
    },
  });

  // Kopfzeile
  const header = [
    "orderId",
    "stripeId",
    "email",
    "status",
    "currency",
    "amountTotal_cents",
    "createdAt_iso",
    "itemName",
    "itemQty",
    "itemUnitPrice_cents",
    "productId",
    "productSlug",
    "isShipping",
  ];

  const rows: string[] = [];
  rows.push(header.join(","));

  for (const o of orders) {
    if (!o.items.length) {
      // leere Bestellungen (sollte es nicht geben), trotzdem eine Zeile schreiben
      rows.push([
        o.id,
        o.stripeId,
        o.email ?? "",
        o.status,
        o.currency,
        o.amountTotal,
        o.createdAt.toISOString(),
        "", // itemName
        "", // qty
        "", // unitPrice
        "", // productId
        "", // productSlug
        "", // isShipping
      ].map(csvEscape).join(","));
      continue;
    }

    for (const it of o.items) {
      const isShipping = !it.productId; // unsere Versandzeilen haben kein productId
      const name =
        it.product?.productName ??
        it.product?.slug ??
        (isShipping ? "Versand / Service" : "Artikel");
      rows.push([
        o.id,
        o.stripeId,
        o.email ?? "",
        o.status,
        o.currency,
        o.amountTotal,
        o.createdAt.toISOString(),
        name,
        it.qty,
        it.unitPrice,
        it.productId ?? "",
        it.product?.slug ?? "",
        isShipping ? "1" : "0",
      ].map(csvEscape).join(","));
    }
  }

  const csv = rows.join("\n");

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="orders-export-${new Date()
        .toISOString()
        .slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}