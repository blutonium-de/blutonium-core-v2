// app/api/admin/env-check/route.ts
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ADMIN_TOKEN: process.env.ADMIN_TOKEN || null,
    NEXT_PUBLIC_ADMIN_TOKEN: process.env.NEXT_PUBLIC_ADMIN_TOKEN || null,
    NODE_ENV: process.env.NODE_ENV,
  });
}