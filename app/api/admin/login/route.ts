// app/api/admin/login/route.ts
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { password } = await req.json().catch(() => ({ password: "" }));
  const ok = password && (
    password === process.env.ADMIN_TOKEN ||
    password === process.env.NEXT_PUBLIC_ADMIN_TOKEN
  );

  if (!ok) return NextResponse.json({ ok: false, error: "Invalid password" }, { status: 401 });

  const res = NextResponse.json({ ok: true });
  // Cookie 7 Tage gültig, nur HTTPS in prod
  res.cookies.set("admin_auth", password, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}