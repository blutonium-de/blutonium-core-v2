// app/api/admin/magic/route.ts
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const k = (url.searchParams.get("k") || "").trim();
  const a = (process.env.ADMIN_TOKEN || "").trim();

  if (k !== a) {
    return NextResponse.json({ ok: false, error: "Invalid" }, { status: 401 });
  }

  const res = NextResponse.redirect(new URL("/admin", url.origin));
  res.cookies.set("admin_auth", a, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}