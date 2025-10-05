import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateInvoicePdf } from "@/lib/invoice";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// kleiner Helper: Admin-Key prüfen
function ok(keyFromUrl?: string) {
  const need = process.env.NEXT_PUBLIC_ADMIN_TOKEN;
  if (!need) return true;
  return keyFromUrl === need;
}

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(req.url);
    const key = searchParams.get("key") || undefined;
    if (!ok(key)) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const id = params.id;
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: {
              select: {
                slug: true,
                productName: true,
                subtitle: true,
                format: true,
                genre: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Falls du in der DB (später) invoiceNumber speicherst: benutze die hier
    // Für jetzt: “ENTWURF-<id-suffix>”
    const invoiceNumber =
      // @ts-ignore (falls du das Feld später hinzufügst)
      order.invoiceNumber?.toString() ||
      `ENTWURF-${order.id.slice(-6).toUpperCase()}`;

    // Form für generateInvoicePdf zusammenbauen
    const orderForPdf = {
      id: order.id,
      email: order.email ?? null,
      amountTotal: order.amountTotal,
      currency: order.currency || "EUR",
      createdAt: order.createdAt,
      firstName:
        // wir unterstützen beide Varianten (street/zip vs address)
        // (einige deiner früheren Schemas hatten address/zip statt street/postalCode)
        (order as any).firstName ?? null,
      lastName: (order as any).lastName ?? null,
      address: (order as any).street ?? (order as any).address ?? null,
      zip: (order as any).postalCode ?? (order as any).zip ?? null,
      city: (order as any).city ?? null,
      country: (order as any).country ?? null,
      items: order.items.map((it) => ({
        qty: it.qty,
        unitPrice: it.unitPrice, // bereits Cent
        product: it.product
          ? {
              slug: it.product.slug,
              productName: it.product.productName,
              subtitle: it.product.subtitle,
              format: it.product.format,
              genre: it.product.genre,
            }
          : null,
      })),
    };

    const pdf = await generateInvoicePdf(orderForPdf as any, invoiceNumber);

    return new NextResponse(pdf, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="Rechnung-${invoiceNumber}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e: any) {
    console.error("admin/orders/:id/invoice error", e);
    return NextResponse.json(
      { error: e?.message || "server error" },
      { status: 500 }
    );
  }
}