// app/api/admin/convert-image/route.ts
import { NextResponse } from "next/server";
import sharp from "sharp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const ct = req.headers.get("content-type") || "";
    if (!ct.includes("multipart/form-data")) {
      return NextResponse.json({ error: "Multipart/FormData erwartet" }, { status: 400 });
    }

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Feld 'file' fehlt" }, { status: 400 });
    }

    const inBuf = Buffer.from(await file.arrayBuffer());

    // HEIC/HEIF oder sonstiges – sharp versucht automatisch zu erkennen
    const out = await sharp(inBuf, { failOnError: false })
      .rotate() // EXIF drehen
      .resize(500, 500, { fit: "cover", position: "centre" })
      .jpeg({ quality: 90 })
      .toBuffer();

    const dataUrl = `data:image/jpeg;base64,${out.toString("base64")}`;
    return NextResponse.json({ ok: true, dataUrl });
  } catch (err: any) {
    console.error("[convert-image] error:", err);
    return NextResponse.json({ error: err?.message || "Konvertierung fehlgeschlagen" }, { status: 500 });
  }
}