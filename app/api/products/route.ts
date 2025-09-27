// app/api/products/route.ts — jetzt Prisma-basiert
import { NextResponse } from "next/server";
import { prisma } from "../../../lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs"; // wichtig: Prisma braucht Node-Runtime (nicht Edge)

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category") || undefined;

    const where: any = { active: true };
    if (category) where.categoryCode = category; // z. B. ?category=ss

    const products = await prisma.product.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    return NextResponse.json({ products });
  } catch (err) {
    console.error("GET /api/products error:", err);
    return NextResponse.json({ error: "Serverfehler" }, { status: 500 });
  }
}