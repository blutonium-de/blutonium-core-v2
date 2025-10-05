// app/api/analytics/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import crypto from "crypto";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function firstIp(xff: string | null): string | undefined {
  if (!xff) return undefined;
  const ip = xff.split(",")[0]?.trim();
  return ip || undefined;
}

export async function POST(req: Request) {
  try {
    // Body aus dem Beacon
    const body = await req.json().catch(() => ({}));
    const path: string = (body?.path || "/").toString();
    const referrer: string | undefined = body?.referrer || undefined;
    const sessionId: string | undefined = body?.sessionId || undefined;

    // Header (User-Agent, IP, Country)
    const ua = req.headers.get("user-agent") || undefined;
    const ip = firstIp(req.headers.get("x-forwarded-for"));
    const country =
      req.headers.get("x-vercel-ip-country") ||
      req.headers.get("cf-ipcountry") ||
      undefined;

    // DSGVO-freundlich: IP nur gehasht speichern
    const salt = process.env.ANALYTICS_SALT || "blutonium-salt";
    const ipHash = ip
      ? crypto.createHash("sha256").update(salt).update(ip).digest("hex")
      : undefined;

    await prisma.pageView.create({
      data: {
        path,
        referrer,
        ua,
        ipHash,
        sessionId,
        country,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("/api/analytics error:", e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}