// app/api/products/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const cat = searchParams.get("cat") || undefined;           // z.B. "dvd,bray"
    const q = (searchParams.get("q") || "").trim();
    const genre = (searchParams.get("genre") || "").trim();

    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") || "50")));
    const offset = Math.max(0, Number(searchParams.get("offset") || "0"));

    const where: any = { active: true };
    // Optional: nur verfügbare zeigen
    // where.stock = { gt: 0 };

    if (cat) {
      const list = cat.split(",").map(s => s.trim()).filter(Boolean);
      where.categoryCode = list.length > 1 ? { in: list } : list[0];
    }

    if (q) {
      where.OR = [
        { productName: { contains: q, mode: "insensitive" } },
        { subtitle:     { contains: q, mode: "insensitive" } },
        { artist:       { contains: q, mode: "insensitive" } }, // Regie bei DVDs
        { slug:         { contains: q, mode: "insensitive" } },
        { upcEan:       { contains: q, mode: "insensitive" } },
      ];
    }

    if (genre) {
      where.genre = { contains: genre, mode: "insensitive" };
    }

    const items = await prisma.product.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: offset,
      take: limit,
      select: {
        id: true,
        slug: true,
        artist: true,
        trackTitle: true,
        productName: true,
        subtitle: true,
        categoryCode: true,
        condition: true,
        year: true,
        priceEUR: true,
        image: true,
        images: true,
        stock: true,
        genre: true,
        format: true,
      },
    });

    return NextResponse.json({ items });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "server error" },
      { status: 500 }
    );
  }
}