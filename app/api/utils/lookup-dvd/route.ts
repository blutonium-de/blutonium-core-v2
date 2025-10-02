// app/api/utils/lookup-dvd/route.ts
import { NextResponse } from "next/server";
// Optional: nur verwenden, wenn vorhanden
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const barcode = (searchParams.get("barcode") || "").trim();
    if (!barcode) return NextResponse.json({ error: "barcode missing" }, { status: 400 });

    // 1) Interne DB (optional)
    try {
      // Falls du eine Tabelle hast wie:
      // model DvdMeta { ean String @id title String? year Int? director String? cover String? genre String? format String? edition String? }
      const rec = await prisma?.dvdMeta?.findUnique?.({ where: { ean: barcode } } as any);
      if (rec) {
        return NextResponse.json({
          title: rec.title || null,
          year: rec.year || null,
          director: rec.director || null,
          cover: rec.cover || null,
          genre: rec.genre || null,
          format: rec.format || "DVD",
          edition: rec.edition || null,
          source: "internal",
        });
      }
    } catch {
      // ignorieren – Tabelle evtl. nicht vorhanden
    }

    // 2) Fallback: deinen bestehenden Lookup (falls er DVDs unterstützt)
    try {
      const base = process.env.NEXT_PUBLIC_BASE_URL || "";
      const r = await fetch(`${base}/api/utils/lookup?barcode=${encodeURIComponent(barcode)}`, { cache: "no-store" });
      const text = await r.text();
      let j: any; try { j = JSON.parse(text); } catch { j = { error: text || "invalid response" }; }
      if (r.ok && j) {
        // Versuche Felder zu mappen
        // Viele Provider liefern 'title', 'year', 'cover', 'format', evtl. 'director'/'genre'
        return NextResponse.json({
          title: j.title || j.productName || null,
          year: j.year || null,
          director: j.director || j.artist || null,
          cover: j.cover || j.image || null,
          genre: j.genre || null,
          format: j.format || "DVD",
          edition: j.edition || j.subtitle || null,
          source: j.source || "fallback",
        });
      }
    } catch {}

    return NextResponse.json({ error: "no dvd metadata found" }, { status: 404 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "server error" }, { status: 500 });
  }
}