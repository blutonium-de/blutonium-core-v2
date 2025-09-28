// app/api/admin/login/route.ts
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { key, remember } = await req.json().catch(() => ({}));

    const a = (process.env.ADMIN_TOKEN || "").trim();
    const b = (process.env.NEXT_PUBLIC_ADMIN_TOKEN || "").trim();
    const k = (key || "").trim();

    if (!k || (!a && !b) || !(k === a || k === b)) {
      return NextResponse.json({ ok: false, error: "Invalid password" }, { status: 401 });
    }

    const res = NextResponse.json({ ok: true });
    res.cookies.set("admin_auth", a || b, {
      httpOnly: true,
      // ⬇️ nur in Production "secure", lokal darf das Cookie auch ohne HTTPS
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: remember ? 60 * 60 * 24 * 30 : undefined,
    });
    return res;
  } catch {
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}