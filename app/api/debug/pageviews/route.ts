// app/api/debug/pageviews/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic"; // kein Cache
export const runtime = "nodejs";

export async function GET() {
  try {
    const [total, last] = await Promise.all([
      prisma.pageView.count(),
      prisma.pageView.findMany({
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          path: true,
          referrer: true,
          country: true,
          createdAt: true,
        },
      }),
    ]);

    return NextResponse.json(
      {
        ok: true,
        total,
        last,
      },
      { status: 200 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Unknown error" },
      { status: 500 }
    );
  }
}