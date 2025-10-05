// app/api/ping/route.ts
import { NextResponse } from "next/server";

// Optional: kleine timing-safe Gleichheit
function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) {
    out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return out === 0;
}

export async function GET() {
  // KEIN Token leaken – nur sagen, ob ENV vorhanden ist
  const expected = (process.env.ADMIN_TOKEN ?? "").trim();
  return NextResponse.json({
    ok: true,
    envPresent: expected.length > 0,
    // zu Debugzwecken hilfreich (leakt keinen Inhalt)
    expectedLen: expected.length,
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const token = (body?.token ?? "").toString().trim();
    const expected = (process.env.ADMIN_TOKEN ?? "").trim();

    if (!expected) {
      // Falls ENV fehlt, lieber klar sagen (lokal/Dev)
      return NextResponse.json(
        { ok: false, reason: "SERVER_ENV_MISSING" },
        { status: 500 }
      );
    }

    const match = timingSafeEqual(token, expected);
    if (!match) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}