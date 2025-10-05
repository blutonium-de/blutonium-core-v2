// app/api/admin/upload/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isHeifLike(name: string, type?: string | null) {
  return (
    /\.(heic|heif)$/i.test(name) ||
    (type ?? "").toLowerCase().includes("heic") ||
    (type ?? "").toLowerCase().includes("heif")
  );
}

function cleanBase(name: string) {
  return name.replace(/\.[a-z0-9]+$/i, "").slice(0, 120);
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const files = form.getAll("files") as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "Keine Dateien gefunden." }, { status: 400 });
    }

    // lazy import von sharp (nur auf Server)
    const sharp = (await import("sharp")).default;

    const out: Array<{ name: string; dataUrl: string }> = [];

    for (const file of files) {
      const ab = await file.arrayBuffer();
      const buf = Buffer.from(ab);

      const toJpeg = sharp(buf, { failOn: "none", unlimited: true });

      let pipeline = toJpeg.resize(500, 500, { fit: "cover" }).jpeg({ quality: 82 });

      // Wenn es HEIC/HEIF ist und libheif fehlt, wirft sharp eine spezifische Fehlermeldung
      // → Die fangen wir oben ab und geben sie verständlich zurück.
      try {
        const outBuf = await pipeline.toBuffer();
        const dataUrl = `data:image/jpeg;base64,${outBuf.toString("base64")}`;
        const base = cleanBase(file.name);
        out.push({ name: `${base || "image"}.jpg`, dataUrl });
      } catch (err: any) {
        const msg = String(err?.message || err);
        if (isHeifLike(file.name, file.type) && /heif|libheif|plugin|not built/i.test(msg)) {
          return NextResponse.json(
            {
              error:
                "HEIC/HEIF konnte nicht konvertiert werden (libheif-Unterstützung fehlt auf dem Server).",
              details: msg,
            },
            { status: 415 }
          );
        }
        return NextResponse.json({ error: msg || "Konvertierung fehlgeschlagen." }, { status: 500 });
      }
    }

    return NextResponse.json({ images: out }, { status: 200 });
  } catch (err: any) {
    const msg = err?.message || "Upload-Fehler";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}