import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import crypto from "crypto";

function hashIP(ip: string | null, salt: string | undefined) {
  if (!ip) return null;
  try {
    return crypto.createHash("sha256").update(`${ip}|${salt || ""}`).digest("hex").slice(0, 32);
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  try {
    // Problemlose Bodies von sendBeacon (JSON)
    let body: any = {};
    try { body = await req.json(); } catch {}

    const url = new URL(req.url);
    const headers = req.headers;
    const path = typeof body?.path === "string" ? body.path.slice(0, 512) : url.searchParams.get("path") || "/";
    const ref = typeof body?.ref === "string" ? body.ref.slice(0, 512) : undefined;

    // Basic-Botfilter (grob)
    const ua = headers.get("user-agent") || "";
    if (/bot|crawler|spider|facebook|slurp|bing|pingdom|monitor/i.test(ua)) {
      return NextResponse.json({ ok: true, skipped: "bot" }, { status: 200 });
    }

    // IP (hängt von Hosting ab); bei Vercel: x-forwarded-for
    const ip =
      headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      (headers as any).get?.("x-real-ip") ||
      null;

    const ipHash = hashIP(ip, process.env.ANALYTICS_SALT);

    // Session-ID (falls du eine Cookie-basierte Session nutzt)
    const sid = headers.get("cookie")?.match(/sid=([A-Za-z0-9_-]+)/)?.[1] || undefined;

    const country =
      headers.get("x-vercel-ip-country") ||
      headers.get("cf-ipcountry") ||
      undefined;

    await prisma.pageView.create({
      data: {
        path,
        referrer: ref,
        ua: ua.slice(0, 512),
        ipHash,
        sessionId: sid,
        country,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    // Nicht laut sein – Beacons sollen nie stören
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}