// app/api/admin/orders/[id]/status/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";                 // ❤️ stabiler Alias-Import
import { ensureAdmin } from "@/lib/adminAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  // Wenn ensureAdmin eine Response zurückgibt → sofort zurückgeben
  const deny = ensureAdmin(req);
  if (deny) return deny;

  try {
    const body = await req.json().catch(() => ({}));
    const status = body?.status;

    const allowed = new Set([
      "open",
      "paid",
      "processing",
      "shipped",
      "canceled",
      "refunded",
    ]);
    if (!allowed.has(status)) {
      return NextResponse.json({ error: "invalid status" }, { status: 400 });
    }

    const order = await prisma.order.update({
      where: { id: params.id },
      data: { status },
    });

    return NextResponse.json({ order }, { status: 200 });
  } catch (err: any) {
    const msg =
      err?.message ||
      (typeof err === "string" ? err : "route failed while updating status");
    // Server-Log zur Diagnose
    console.error("[orders status PATCH] error:", msg, err?.stack || "");
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}