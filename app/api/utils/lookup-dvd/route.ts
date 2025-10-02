// app/api/utils/lookup-dvd/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function abs(path: string) {
  const base = (process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000").replace(/\/+$/, "");
  return new URL(path, base + "/").toString();
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const barcode = (searchParams.get("barcode") || "").trim();
    if (!barcode) {
      return NextResponse.json({ error: "barcode missing" }, { status: 400 });
    }

    // 1) Interner Cache: DvdMeta (wenn vorhanden)
    try {
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
          source: "dvdmeta",
        });
      }
    } catch (_) {
      // Tabelle evtl. nicht vorhanden – still
    }

    // 2) Bereits vorhandene Produkte als Quelle (Product.upcEan)
    try {
      const p = await prisma?.product?.findFirst?.({
        where: { upcEan: barcode },
        select: {
          productName: true,
          subtitle: true,
          artist: true,      // bei DVDs = Regie
          year: true,
          image: true,
          genre: true,
          format: true,
          categoryCode: true,
        },
      } as any);

      if (p) {
        return NextResponse.json({
          title: p.productName || null,
          year: p.year || null,
          director: p.artist || null,
          cover: p.image || null,
          genre: p.genre || null,
          format: p.format || (p.categoryCode === "bray" || p.categoryCode === "bd" ? "Blu-ray" : "DVD"),
          edition: p.subtitle || null,
          source: "product",
        });
      }
    } catch (_) {
      // still
    }

    // 3) Optionaler Fallback gegen eine generische Lookup-Route – nur wenn vorhanden
    try {
      const url = abs(`/api/utils/lookup?barcode=${encodeURIComponent(barcode)}`);
      const r = await fetch(url, { cache: "no-store" });
      const text = await r.text();
      let j: any; try { j = JSON.parse(text); } catch { j = { error: text || "invalid response" }; }
      if (r.ok && j) {
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
    } catch (_) {
      // wenn diese Route nicht existiert oder nichts liefert, ignorieren
    }

    return NextResponse.json(
      { error: "no dvd metadata found", hint: "Kein Treffer in DvdMeta/Product. Externer Provider nicht konfiguriert." },
      { status: 404 }
    );
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "server error" }, { status: 500 });
  }
}