// app/api/spotify/route.ts
import { NextResponse } from "next/server";
import { getSpotifyToken } from "../../../lib/spotify"; // KORRIGIERT: nur 3 Punkte

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Nur Testaufruf, um sicherzustellen, dass die Spotify-Verbindung funktioniert
    await getSpotifyToken();
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("/api/spotify error:", e);
    return NextResponse.json(
      { error: e?.message || "server error" },
      { status: 500 }
    );
  }
}