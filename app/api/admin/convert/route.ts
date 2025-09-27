// app/api/admin/convert/route.ts
import { NextResponse } from "next/server";
import sharp from "sharp";
import heicConvert from "heic-convert";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file") as unknown as File | null;
    if (!file) {
      return NextResponse.json({ error: "no file" }, { status: 400 });
    }

    const ab = await file.arrayBuffer();
    const input = Buffer.from(ab);

    // 1) HEIC -> JPEG (full size)
    const jpegBuffer: Buffer = await heicConvert({
      buffer: input,
      format: "JPEG",
      quality: 0.92,
    });

    // 2) resize to 500x500, cover, progressive
    const resized = await sharp(jpegBuffer)
      .resize(500, 500, { fit: "cover", position: "center" })
      .jpeg({ quality: 82, progressive: true })
      .toBuffer();

    const base64 = resized.toString("base64");
    const dataUrl = `data:image/jpeg;base64,${base64}`;

    // try to keep a friendly filename (replace .heic)
    const name = (file.name || "image.heic").replace(/\.heic$/i, ".jpg");

    return NextResponse.json({ dataUrl, name });
  } catch (err: any) {
    console.error("[convert-heic] error:", err);
    return NextResponse.json(
      { error: err?.message || "convert failed" },
      { status: 500 }
    );
  }
}