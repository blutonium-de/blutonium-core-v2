// app/api/admin/upload/route.ts
import { NextResponse } from "next/server";
import sharp from "sharp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Wir akzeptieren multipart/form-data mit den Feldern "files" (mehrere)
export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const files = form.getAll("files").filter(Boolean) as File[];

    if (!files.length) {
      return NextResponse.json({ error: "Keine Dateien hochgeladen." }, { status: 400 });
    }

    const outImages: { dataUrl: string; name: string }[] = [];

    for (const f of files) {
      // Rohdaten lesen
      const buf = Buffer.from(await f.arrayBuffer());

      // Mit sharp konvertieren & auf 500×500 covern
      // (HEIC/HEIF, JPG, PNG etc. werden akzeptiert)
      let img = sharp(buf, { failOn: "none" }); // robust gegen EXIF/seltene Formate

      // optional: Orientierung auto
      img = img.rotate();

      // 500x500, cover (zuschneiden bei Bedarf)
      img = img.resize(500, 500, { fit: "cover" });

      // als JPEG, moderat komprimiert
      const out = await img.jpeg({ quality: 82 }).toBuffer();

      const b64 = out.toString("base64");
      const dataUrl = `data:image/jpeg;base64,${b64}`;
      outImages.push({ dataUrl, name: f.name });
    }

    return NextResponse.json({ images: outImages });
  } catch (err: any) {
    // Häufiger Fall bei fehlender HEIF-Unterstützung:
    // sharp wirft dann eine Meldung wie "heif: ... not supported / plugin not built"
    const msg = String(err?.message || err || "Upload-Fehler");
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}