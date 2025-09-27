// app/api/admin/test-email/route.ts
import { NextRequest, NextResponse } from "next/server";
import { ensureAdmin } from "../../../../lib/adminAuth";
import { getTransport, hasMailerEnv } from "../../../../lib/mailer";

export async function GET(req: NextRequest) {
  // Admin-Token prüfen
  if (!ensureAdmin(req)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // Prüfen ob SMTP Variablen gesetzt sind
  if (!hasMailerEnv()) {
    return NextResponse.json({ error: "mailer not configured" }, { status: 500 });
  }

  const url = new URL(req.url);
  const to = url.searchParams.get("to") || process.env.ADMIN_EMAIL || "";
  if (!to) {
    return NextResponse.json({ error: "missing ?to=" }, { status: 400 });
  }

  try {
    const t = getTransport();
    await t.sendMail({
      from: process.env.MAIL_FROM!,
      to,
      subject: "Test-E-Mail – Blutonium",
      text: "Wenn du das lesen kannst, ist SMTP korrekt eingerichtet. 🎉",
    });

    return NextResponse.json({ ok: true, to });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}