// app/api/ping/route.ts
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { token } = await req.json();
  if (token === process.env.ADMIN_TOKEN) {
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ ok: false }, { status: 401 });
}