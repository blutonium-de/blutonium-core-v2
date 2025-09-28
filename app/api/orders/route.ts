// app/api/admin/orders/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function okKey(req: NextRequest) {
  const headerKey = req.headers.get("x-admin-key") || "";
  const queryKey = req.nextUrl.searchParams.get("key") || "";
  const k = headerKey || queryKey;
  const a = process.env.ADMIN_TOKEN || "";
  const b = process.env.NEXT_PUBLIC_ADMIN_TOKEN || "";
  return !a && !b ? true : k === a || k === b;
}

/**
 * GET /api/admin/orders
 *   optionale Filter:
 *     - status: z.B. "paid", "stock_applied" (oder leer = alle)
 *     - q:     Volltext (sucht in stripeId, email, name – falls vorhanden)
 *     - limit / offset
 */
export async function GET(req: NextRequest) {
  try {
    if (!okKey(req)) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const url = req.nextUrl;
    const status = (url.searchParams.get("status") || "").trim();
    const q = (url.searchParams.get("q") || "").trim();
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") || 50)));
    const offset = Math.max(0, Number(url.searchParams.get("offset") || 0));

    const where: any = {};
    if (status) where.status = status;
    if (q) {
      // Passe Felder hier an dein Order-Modell an (falls du email/name hast)
      where.OR = [
        { stripeId: { contains: q, mode: "insensitive" } },
        // { email: { contains: q, mode: "insensitive" } },
        // { name: { contains: q, mode: "insensitive" } },
      ];
    }

    const orders = await prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
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
                priceEUR: true, // EUR (float) – nur Fallback/Zusatzinfo
                stock: true,
                active: true,
              },
            },
          },
        },
      },
    });

    // kleine Summen-Hilfen
    const mapped = orders.map((o) => {
      const itemCount = o.items.reduce((n, it) => n + (it.qty || 0), 0);

      // unitPrice = Cents. Fallback: Produktpreis(EUR) → Cents
      const subtotalCents = o.items.reduce((sum, it) => {
        const unitCents =
          typeof it.unitPrice === "number"
            ? it.unitPrice
            : Math.round((it.product?.priceEUR || 0) * 100);
        return sum + unitCents * (it.qty || 0);
      }, 0);

      return {
        id: o.id,
        stripeId: o.stripeId,
        status: o.status,
        createdAt: o.createdAt,
        // optionale Felder hier ergänzen, wenn du sie im Order-Modell hast:
        // email: o.email, name: o.name,
        items: o.items.map((it) => {
          const unitCents =
            typeof it.unitPrice === "number"
              ? it.unitPrice
              : Math.round((it.product?.priceEUR || 0) * 100);

          return {
            id: it.id,
            productId: it.productId,
            qty: it.qty,
            unitPrice: unitCents,            // Cents (KANONISCH)
            priceEUR: unitCents / 100,       // ← nur zur Bequemlichkeit/Abwärtskompatibilität
            product: {
              id: it.product?.id,
              slug: it.product?.slug,
              productName: it.product?.productName,
              artist: it.product?.artist,
              trackTitle: it.product?.trackTitle,
              priceEUR: it.product?.priceEUR, // Info (EUR float)
              stock: it.product?.stock,
              active: it.product?.active,
            },
          };
        }),
        itemCount,
        subtotal: subtotalCents,        // Cents
        subtotalEUR: subtotalCents / 100, // Bequemlichkeit
      };
    });

    return NextResponse.json({ items: mapped }, { status: 200 });
  } catch (e) {
    console.error("[admin orders GET]", e);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}