// app/api/diag/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  try {
    const now = await prisma.$queryRaw<Array<{ now: Date }>>`SELECT NOW() as now`;
    return NextResponse.json({
      ok: true,
      env: {
        has_DATABASE_URL: !!process.env.DATABASE_URL,
        has_DIRECT_DATABASE_URL: !!process.env.DIRECT_DATABASE_URL,
      },
      dbTime: now?.[0]?.now ?? null,
    });
  } catch (e: any) {
    console.error("[/api/diag] DB error:", e);
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}