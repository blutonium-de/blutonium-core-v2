// lib/invoice.ts
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import fs from "fs/promises";
import path from "path";

type OrderWithItems = {
  id: string;
  email: string | null;
  amountTotal: number; // cents (inkl. Versand)
  currency: string;
  createdAt: Date;
  firstName?: string | null;
  lastName?: string | null;
  address?: string | null;     // alias: street
  zip?: string | null;         // alias: postalCode
  city?: string | null;
  country?: string | null;
  paymentProvider?: string | null;
  shippingName?: string | null;
  shippingEUR?: number | null;
  items: Array<{
    qty: number;
    unitPrice: number; // cents
    product: {
      slug: string;
      productName?: string | null;
      subtitle?: string | null;
      format?: string | null;
      genre?: string | null;
    } | null; // ⬅️ Versand hat hier "null"
  }>;
};

function euro(cents: number) {
  return (cents / 100).toFixed(2);
}

/** Problematische Unicode-Zeichen in PDF-kompatible ASCII-Äquivalente umwandeln. */
function sanitizePdfText(input?: string | null): string {
  if (!input) return "";
  let s = input;

  // geschützte/seltsame Leerzeichen → normales Space
  s = s.replace(/[\u00A0\u2000-\u200B\u202F\u205F\u3000]/g, " ");

  // typografische Anführungen → gerade
  s = s.replace(/[“”«»„‟]/g, '"').replace(/[‘’‚‛]/g, "'");

  // Gedanken-/Viertelgeviert-/Minus-Varianten → normales Minus
  s = s.replace(/[–—‐-‒﹘﹣]/g, "-");

  // Ellipsis → drei Punkte
  s = s.replace(/[…]/g, "...");

  // Bruchzeichen → ASCII
  s = s
    .replace(/¼/g, "1/4")
    .replace(/½/g, "1/2")
    .replace(/¾/g, "3/4")
    .replace(/⅐/g, "1/7")
    .replace(/⅑/g, "1/9")
    .replace(/⅒/g, "1/10")
    .replace(/⅓/g, "1/3")
    .replace(/⅔/g, "2/3")
    .replace(/⅕/g, "1/5")
    .replace(/⅖/g, "2/5")
    .replace(/⅗/g, "3/5")
    .replace(/⅘/g, "4/5")
    .replace(/⅙/g, "1/6")
    .replace(/⅚/g, "5/6")
    .replace(/⅛/g, "1/8")
    .replace(/⅜/g, "3/8")
    .replace(/⅝/g, "5/8")
    .replace(/⅞/g, "7/8");

  // Steuerzeichen/Emoji u.ä. entfernen (alles außerhalb Latin-1 grob filtern – Umlaute bleiben)
  s = s.normalize("NFKD").replace(/[^\u0009\u000A\u000D\u0020-\u00FF]/g, "");

  // mehrfaches Space entschärfen
  s = s.replace(/[ \t]{2,}/g, " ").trim();
  return s;
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

/** Einfacher Wortumbruch für die erste Spalte. */
function wrapText(text: string, font: any, fontSize: number, maxWidth: number): string[] {
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
      page.drawImage(img, { x: width - w - 40, y: 610, width: w, height: h, opacity: 0.95 });
    }
  }

  const shopName = process.env.SHOP_NAME || "Blutonium Records";

  // Header
  page.drawText(sanitizePdfText(shopName), { x: 40, y: 800, size: 18, font: fontBold, color: rgb(0.9, 0.9, 0.95) });
  page.drawText(sanitizePdfText("Quittung / Rechnung (Privatverkauf)"), {
    x: 40, y: 780, size: 12, font: fontRegular, color: rgb(0.85, 0.85, 0.9),
  });

  // Meta
  const metaY = 740;
  page.drawText(sanitizePdfText(`Rechnungs-Nr.: ${invoiceNumber}`), { x: 40, y: metaY, size: 11, font: fontRegular });
  page.drawText(sanitizePdfText(`Datum: ${formatDate(order.createdAt)}`), { x: 40, y: metaY - 16, size: 11, font: fontRegular });
  page.drawText(sanitizePdfText(`Kunde: ${order.email || "—"}`), { x: 40, y: metaY - 32, size: 11, font: fontRegular });

  // Zahlart
  const provider = (order.paymentProvider || "").toLowerCase();
  const providerLabel =
    provider === "stripe" ? "Stripe / Karte"
    : provider === "paypal" ? "PayPal"
    : provider ? provider.charAt(0).toUpperCase() + provider.slice(1)
    : "—";
  page.drawText(sanitizePdfText(`Bezahlt mit: ${providerLabel}`), { x: 40, y: metaY - 48, size: 11, font: fontRegular });

  // Käuferadresse
  const buyerY = metaY - 76;
  page.drawText("Rechnung an:", { x: 40, y: buyerY, size: 11, font: fontBold });
  const nameLine = sanitizePdfText([order.firstName, order.lastName].filter(Boolean).join(" "));
  if (nameLine) page.drawText(nameLine, { x: 40, y: buyerY - 14, size: 11, font: fontRegular });
  if (order.address) page.drawText(sanitizePdfText(order.address), { x: 40, y: buyerY - 28, size: 11, font: fontRegular });
  const zipCity = sanitizePdfText([order.zip, order.city].filter(Boolean).join(" "));
  if (zipCity) page.drawText(zipCity, { x: 40, y: buyerY - 42, size: 11, font: fontRegular });
  if (order.country) page.drawText(sanitizePdfText(order.country), { x: 40, y: buyerY - 56, size: 11, font: fontRegular });

  // Hinweis
  page.drawText(sanitizePdfText("Hinweis: Privatverkauf – kein Ausweis der MwSt. (§ 19 UStG / Differenzbesteuerung)."), {
    x: 40, y: buyerY - 78, size: 10, font: fontRegular, color: rgb(0.6, 0.6, 0.65),
  });

  // ——————————————————————————————————————————————————————————
  // Positionen auftrennen: Produkte vs. Versand (product === null)
  const productItems = order.items.filter(it => it.product != null);
  const shippingItems = order.items.filter(it => it.product == null);

  const productsTotalCents = productItems.reduce((s, it) => s + (it.unitPrice * it.qty), 0);
  const shippingFromItemsCents = shippingItems.reduce((s, it) => s + (it.unitPrice * it.qty), 0);

  // Versandbetrag priorisiert ermitteln
  const shippingCentsRaw =
    order.shippingEUR != null
      ? Math.round(order.shippingEUR * 100)
      : (shippingFromItemsCents > 0
          ? shippingFromItemsCents
          : Math.max(0, (order.amountTotal ?? 0) - productsTotalCents));

  const shippingCents = Math.max(0, shippingCentsRaw);
  const shippingName = sanitizePdfText(order.shippingName?.trim() || "Versand");
  // ——————————————————————————————————————————————————————————

  // Tabelle
  let y = buyerY - 110;
  const fontSize = 11;

  const posX = 40;
  const qtyX = 330;
  const unitX = 400;
  const totalX = 495;
  const firstColMaxWidth = qtyX - posX - 10;

  page.drawText("Position", { x: posX, y, size: fontSize, font: fontBold });
  page.drawText("Menge", { x: qtyX, y, size: fontSize, font: fontBold });
  page.drawText("Einzelpreis €", { x: unitX, y, size: fontSize, font: fontBold });
  page.drawText("Gesamt €", { x: totalX, y, size: fontSize, font: fontBold });
  y -= 12;
  page.drawLine({ start: { x: 40, y }, end: { x: width - 40, y }, thickness: 0.7, color: rgb(0.8, 0.8, 0.85) });
  y -= 18;

  // Artikelzeilen – NUR Produktpositionen (Versand NICHT hier rendern)
  for (const it of productItems) {
    const p = it.product!;
    const titleRaw =
      (p.productName || p.slug || "Artikel") +
      (p.subtitle ? ` · ${p.subtitle}` : "") +
      (p.format ? ` (${p.format})` : "") +
      (p.genre ? ` – ${p.genre}` : "");
    const title = sanitizePdfText(titleRaw);

    const wrapped = wrapText(title, fontRegular, fontSize, firstColMaxWidth);
    const rowHeight = Math.max(18, wrapped.length * 14);

    let innerY = y;
    for (const line of wrapped) {
      page.drawText(line, { x: posX, y: innerY, size: fontSize, font: fontRegular });
      innerY -= 14;
    }

    page.drawText(String(it.qty), { x: qtyX, y, size: fontSize, font: fontRegular });
    page.drawText(euro(it.unitPrice), { x: unitX, y, size: fontSize, font: fontRegular });
    page.drawText(euro(it.unitPrice * it.qty), { x: totalX, y, size: fontSize, font: fontRegular });

    y -= rowHeight;
    if (y < 130) break;
  }

  // Versand-Zeile (aggregiert)
  if (shippingCents > 0) {
    const title = sanitizePdfText(`Versand – ${shippingName}`);
    const wrapped = wrapText(title, fontRegular, fontSize, firstColMaxWidth);
    const rowHeight = Math.max(18, wrapped.length * 14);

    let innerY = y;
    for (const line of wrapped) {
      page.drawText(line, { x: posX, y: innerY, size: fontSize, font: fontRegular });
      innerY -= 14;
    }

    page.drawText("1", { x: qtyX, y, size: fontSize, font: fontRegular });
    page.drawText(euro(shippingCents), { x: unitX, y, size: fontSize, font: fontRegular });
    page.drawText(euro(shippingCents), { x: totalX, y, size: fontSize, font: fontRegular });

    y -= rowHeight;
  }

  // Summe
  y -= 6;
  page.drawLine({ start: { x: 380, y }, end: { x: width - 40, y }, thickness: 0.7, color: rgb(0.8, 0.8, 0.85) });
  y -= 20;

  page.drawText("Gesamtsumme:", { x: unitX, y, size: 12, font: fontBold });
  page.drawText(`${euro(order.amountTotal)} €`, { x: totalX, y, size: 12, font: fontBold });

  // Absender
  page.drawText("Absender:", { x: 40, y: 96, size: 10, font: fontBold });
  page.drawText("Blutonium.de Online Shop", { x: 40, y: 82, size: 10, font: fontRegular });
  page.drawText("Bahnhofstr. 27", { x: 40, y: 70, size: 10, font: fontRegular });
  page.drawText("A-4650 Lambach", { x: 40, y: 58, size: 10, font: fontRegular });
  page.drawText("Austria", { x: 40, y: 46, size: 10, font: fontRegular });

  page.drawText(sanitizePdfText(`${shopName} – Vielen Dank für Ihren Einkauf!`), {
    x: 40, y: 30, size: 10, font: fontRegular, color: rgb(0.55, 0.55, 0.6),
  });

  const pdfBytes = await pdf.save();
  return Buffer.from(pdfBytes);
}