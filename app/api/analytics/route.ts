// app/api/analytics/route.ts
import { prisma } from "@/lib/db"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    const { path } = await req.json()
    const userAgent = req.headers.get("user-agent") || null
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      null

    await prisma.pageView.create({
      data: { path, userAgent, ip },
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("Analytics error", err)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}