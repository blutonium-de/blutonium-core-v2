// lib/invoice.ts
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import fs from "fs/promises";
import path from "path";

type OrderWithItems = {
  id: string;
  email: string | null;
  amountTotal: number; // cents
  currency: string;
  createdAt: Date;
  firstName?: string | null;
  lastName?: string | null;
  address?: string | null;     // alias: street
  zip?: string | null;         // alias: postalCode
  city?: string | null;
  country?: string | null;
  items: Array<{
    qty: number;
    unitPrice: number; // cents
    product: {
      slug: string;
      productName?: string | null;
      subtitle?: string | null;
      format?: string | null;
      genre?: string | null;
    } | null;
  }>;
};

function euro(cents: number) {
  return (cents / 100).toFixed(2);
}

async function loadLogoBytes(): Promise<Uint8Array | null> {
  const tryFiles = [
    path.join(process.cwd(), "public", "logo.png"),
    path.join(process.cwd(), "public", "logos", "logo.png"),
    path.join(process.cwd(), "public", "uploads", "blutonium-dvd-shop-hero.png"),
  ];
  for (const fp of tryFiles) {
    try {
      const b = await fs.readFile(fp);
      return new Uint8Array(b);
    } catch {}
  }
  return null;
}

function formatDate(d: Date) {
  try {
    return new Intl.DateTimeFormat("de-DE", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(d);
  } catch {
    return d.toISOString().slice(0, 10);
  }
}

/**
 * Sehr einfache Wortumbruch-Funktion für die Positionsspalte.
 * Bricht nach Leerzeichen, damit der Text in maxWidth passt.
 */
function wrapText(
  text: string,
  font: any,
  fontSize: number,
  maxWidth: number
): string[] {
  const words = text.split(/\s+/g);
  const lines: string[] = [];
  let cur = "";

  for (const w of words) {
    const test = cur ? `${cur} ${w}` : w;
    const width = font.widthOfTextAtSize(test, fontSize);
    if (width <= maxWidth) {
      cur = test;
    } else {
      if (cur) lines.push(cur);
      // falls einzelnes Wort länger als maxWidth → hart trennen
      if (font.widthOfTextAtSize(w, fontSize) > maxWidth) {
        let chunk = "";
        for (const ch of w.split("")) {
          const t = chunk + ch;
          if (font.widthOfTextAtSize(t, fontSize) <= maxWidth) {
            chunk = t;
          } else {
            if (chunk) lines.push(chunk);
            chunk = ch;
          }
        }
        cur = chunk;
      } else {
        cur = w;
      }
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

export async function generateInvoicePdf(order: OrderWithItems, invoiceNumber: string) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]); // A4 in pt
  const { width } = page.getSize();

  const fontRegular = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  // Logo – etwas nach unten versetzen, damit es nicht angeschnitten wird
  const logoBytes = await loadLogoBytes();
  if (logoBytes) {
    const img =
      (await pdf.embedPng(logoBytes).catch(async () => {
        try {
          return await pdf.embedJpg(logoBytes);
        } catch {
          return null;
        }
      })) || null;

    if (img) {
      const w = 150;
      const h = (img.height / img.width) * w;
      // y bewusst niedriger als zuvor (ca. 700) → sicher sichtbar
      page.drawImage(img, { x: width - w - 40, y: 700, width: w, height: h, opacity: 0.95 });
    }
  }

  const shopName = process.env.SHOP_NAME || "Blutonium Records";

  // Header
  page.drawText(shopName, { x: 40, y: 800, size: 18, font: fontBold, color: rgb(0.9, 0.9, 0.95) });
  page.drawText("Quittung / Rechnung (Privatverkauf)", {
    x: 40,
    y: 780,
    size: 12,
    font: fontRegular,
    color: rgb(0.85, 0.85, 0.9),
  });

  // Meta
  const metaY = 740;
  page.drawText(`Rechnungs-Nr.: ${invoiceNumber}`, { x: 40, y: metaY, size: 11, font: fontRegular });
  page.drawText(`Datum: ${formatDate(order.createdAt)}`, { x: 40, y: metaY - 16, size: 11, font: fontRegular });
  page.drawText(`Kunde: ${order.email || "—"}`, { x: 40, y: metaY - 32, size: 11, font: fontRegular });

  // Käuferadresse
  const buyerY = metaY - 60;
  page.drawText("Rechnung an:", { x: 40, y: buyerY, size: 11, font: fontBold });
  const nameLine = [order.firstName, order.lastName].filter(Boolean).join(" ");
  if (nameLine) page.drawText(nameLine, { x: 40, y: buyerY - 14, size: 11, font: fontRegular });
  if (order.address) page.drawText(order.address, { x: 40, y: buyerY - 28, size: 11, font: fontRegular });
  const zipCity = [order.zip, order.city].filter(Boolean).join(" ");
  if (zipCity) page.drawText(zipCity, { x: 40, y: buyerY - 42, size: 11, font: fontRegular });
  if (order.country) page.drawText(order.country, { x: 40, y: buyerY - 56, size: 11, font: fontRegular });

  // Hinweis Privatverkauf
  page.drawText("Hinweis: Privatverkauf – kein Ausweis der MwSt. (§ 19 UStG / Differenzbesteuerung).", {
    x: 40,
    y: buyerY - 78,
    size: 10,
    font: fontRegular,
    color: rgb(0.6, 0.6, 0.65),
  });

  // Tabellen-Koordinaten
  let y = buyerY - 110;
  const fontSize = 11;

  const posX = 40;
  const qtyX = 330;
  const unitX = 400;
  const totalX = 495;

  const firstColMaxWidth = qtyX - posX - 10; // Platz bis zur Menge-Spalte

  // Tabellen-Header (ohne Klammern, damit nichts überlappt)
  page.drawText("Position", { x: posX, y, size: fontSize, font: fontBold });
  page.drawText("Menge", { x: qtyX, y, size: fontSize, font: fontBold });
  page.drawText("Einzelpreis €", { x: unitX, y, size: fontSize, font: fontBold });
  page.drawText("Gesamt €", { x: totalX, y, size: fontSize, font: fontBold });
  y -= 12;
  page.drawLine({ start: { x: 40, y }, end: { x: width - 40, y }, thickness: 0.7, color: rgb(0.8, 0.8, 0.85) });
  y -= 18;

  // Zeilen mit Umbruch in der ersten Spalte
  for (const it of order.items) {
    const p = it.product;
    const title =
      (p?.productName || p?.slug || "Artikel") +
      (p?.subtitle ? ` · ${p.subtitle}` : "") +
      (p?.format ? ` (${p.format})` : "") +
      (p?.genre ? ` – ${p.genre}` : "");

    const wrapped = wrapText(title, fontRegular, fontSize, firstColMaxWidth);
    const rowHeight = Math.max(18, wrapped.length * 14); // 14pt pro Zeile

    // Mehrzeilige Position
    let innerY = y;
    for (const line of wrapped) {
      page.drawText(line, { x: posX, y: innerY, size: fontSize, font: fontRegular });
      innerY -= 14;
    }

    // Menge / Preise nur einmal pro Zeileblock, vertikal an erste Zeile ausrichten
    page.drawText(String(it.qty), { x: qtyX, y, size: fontSize, font: fontRegular });
    page.drawText(euro(it.unitPrice), { x: unitX, y, size: fontSize, font: fontRegular });
    page.drawText(euro(it.unitPrice * it.qty), { x: totalX, y, size: fontSize, font: fontRegular });

    y -= rowHeight;
    if (y < 130) break; // einfache 1-Seiten-Variante
  }

  // Summe
  y -= 6;
  page.drawLine({ start: { x: 380, y }, end: { x: width - 40, y }, thickness: 0.7, color: rgb(0.8, 0.8, 0.85) });
  y -= 20;

  // „Gesamtsumme: 10,00 €“ rechtsbündig neben Total-Spalte
  const sumLabel = "Gesamtsumme:";
  page.drawText(sumLabel, { x: unitX, y, size: 12, font: fontBold });
  page.drawText(`${euro(order.amountTotal)} €`, { x: totalX, y, size: 12, font: fontBold });

  // Absender unten links
  page.drawText("Absender:", { x: 40, y: 96, size: 10, font: fontBold });
  page.drawText("Blutonium.de Online Shop", { x: 40, y: 82, size: 10, font: fontRegular });
  page.drawText("Bahnhofstr. 27", { x: 40, y: 70, size: 10, font: fontRegular });
  page.drawText("A-4650 Lambach", { x: 40, y: 58, size: 10, font: fontRegular });
  page.drawText("Austria", { x: 40, y: 46, size: 10, font: fontRegular });

  // Fußzeile
  page.drawText(`${shopName} – Vielen Dank für Ihren Einkauf!`, {
    x: 40,
    y: 30,
    size: 10,
    font: fontRegular,
    color: rgb(0.55, 0.55, 0.6),
  });

  const pdfBytes = await pdf.save();
  return Buffer.from(pdfBytes);
}