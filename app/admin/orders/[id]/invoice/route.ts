import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/db";
import { generateInvoicePdf } from "../../../../../lib/invoice";
import { assertAdmin } from "../../../../../lib/adminGuard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try { assertAdmin(); } catch { return new NextResponse("Forbidden", { status: 403 }); }

  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: { items: { include: { product: true } } },
  });
  if (!order) return new NextResponse("Not found", { status: 404 });

  const invNo =
    (order as any).invoiceNumber ||
    (() => {
      const yy = String(order.createdAt.getFullYear()).slice(-2);
      const tail = order.id.replace(/[^a-z0-9]/gi, "").slice(-6).toUpperCase();
      return `S${yy}-${tail}`;
    })();

  const pdf = await generateInvoicePdf(order as any, invNo);
  return new NextResponse(pdf, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="Rechnung-${invNo}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}