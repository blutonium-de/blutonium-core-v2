// app/api/admin/orders/[id]/status/route.ts
import { NextResponse, NextRequest } from "next/server";
import { prisma } from "../../../../../../lib/db";
import { ensureAdmin } from "../../../../../../lib/adminAuth";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!ensureAdmin(req)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { status } = await req.json().catch(() => ({}));
  const allowed = new Set(["open", "paid", "processing", "shipped", "canceled", "refunded"]);
  if (!allowed.has(status)) {
    return NextResponse.json({ error: "invalid status" }, { status: 400 });
  }

  const order = await prisma.order.update({
    where: { id: params.id },
    data: { status },
  });

  return NextResponse.json({ order });
}
``` ✅