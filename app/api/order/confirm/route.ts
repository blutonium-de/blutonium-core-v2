// app/api/order/confirm/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateInvoicePdf } from "@/lib/invoice";
import { getNextInvoiceNumber } from "@/lib/invoiceNumber";
import nodemailer from "nodemailer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Body: { orderId: string }
 * Baut PDF, speichert Rechnungsnummer, versucht Mails zu senden (soft-fail).
 */
export async function POST(req: Request) {
  try {
    const { orderId } = await req.json();
    if (!orderId) return NextResponse.json({ error: "orderId missing" }, { status: 400 });

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: { include: { product: true } } },
    });
    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

    // Rechnungsnummer (fortlaufend) speichern
    const invoiceNumber = await getNextInvoiceNumber();
    await prisma.order.update({ where: { id: order.id }, data: { invoiceNumber } });

    // PDF generieren
    const pdfBuffer = await generateInvoicePdf(order as any, invoiceNumber);

    const shopName   = process.env.SHOP_NAME || "Blutonium Records";
    const fromAddr   = process.env.SMTP_FROM || process.env.SMTP_USER || "no-reply@example.com";
    const adminEmail = process.env.ADMIN_EMAIL || fromAddr;

    const invFileName = `Rechnung-${invoiceNumber}.pdf`;
    const totalEUR = (order.amountTotal / 100).toFixed(2) + " " + (order.currency || "EUR").toUpperCase();

    // 👉 Mail nur versuchen, wenn SMTP-Host vorhanden ist
    if (process.env.SMTP_HOST) {
      try {
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: Number(process.env.SMTP_PORT || 587),
          secure: String(process.env.SMTP_SECURE || "").toLowerCase() === "true",
          auth: (process.env.SMTP_USER && process.env.SMTP_PASS)
            ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
            : undefined,
        });

        // Käufer:in
        if (order.email) {
          await transporter.sendMail({
            from: `"${shopName}" <${fromAddr}>`,
            to: order.email,
            subject: `Ihre Quittung / Rechnung ${invoiceNumber}`,
            text:
              `Hallo ${[order.firstName, order.lastName].filter(Boolean).join(" ") || ""},\n\n` +
              `vielen Dank für Ihren Einkauf bei ${shopName}.\n` +
              `Im Anhang finden Sie Ihre Quittung (Privatverkauf, kein MwSt-Ausweis).\n\n` +
              `Rechnungsnummer: ${invoiceNumber}\n` +
              `Bestellnummer: ${order.id}\n` +
              `Gesamtsumme: ${totalEUR}\n\n` +
              `Viele Grüße\n${shopName}`,
            attachments: [{ filename: invFileName, content: pdfBuffer, contentType: "application/pdf" }],
          });
        }

        // Admin
        await transporter.sendMail({
          from: `"${shopName}" <${fromAddr}>`,
          to: adminEmail,
          subject: `Neue Bestellung ${invoiceNumber} – ${totalEUR}`,
          text:
            `Neue Bestellung eingegangen.\n\n` +
            `Rechnungsnummer: ${invoiceNumber}\n` +
            `Bestellnummer: ${order.id}\n` +
            `Kunde: ${order.email || "—"}\n` +
            `Name: ${[order.firstName, order.lastName].filter(Boolean).join(" ") || "—"}\n` +
            `Adresse:\n${[
              order.address,
              [order.zip, order.city].filter(Boolean).join(" "),
              order.country,
            ].filter(Boolean).join("\n") || "—"}\n\n` +
            `Gesamt: ${totalEUR}\n` +
            `Positionen:\n` +
            order.items
              .map((it) =>
                `- ${it.product?.productName || it.product?.slug || "Artikel"} ×${it.qty} @ ${(it.unitPrice / 100).toFixed(2)} EUR`
              )
              .join("\n"),
          attachments: [{ filename: invFileName, content: pdfBuffer, contentType: "application/pdf" }],
        });
      } catch (mailErr: any) {
        console.warn("[order/confirm] Mail send failed (soft):", mailErr?.message || mailErr);
        // kein throw → Seite bleibt grün
      }
    } else {
      console.info("[order/confirm] SMTP_HOST fehlt – Versand übersprungen (soft).");
    }

    return NextResponse.json({ ok: true, invoiceNumber });
  } catch (e: any) {
    console.error("order/confirm error", e);
    return NextResponse.json({ error: e?.message || "server error" }, { status: 500 });
  }
}