// lib/mail.ts
import nodemailer from "nodemailer";

const {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASS,
  MAIL_FROM,
  MAIL_TO_INTERNAL,
} = process.env;

export function getTransport() {
  if (!SMTP_HOST || !SMTP_PORT) {
    throw new Error("SMTP not configured");
  }
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: Number(SMTP_PORT) === 465,
    auth: SMTP_USER && SMTP_PASS ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
  });
}

export async function sendOrderEmails(opts: {
  customerEmail?: string | null;
  subjectCustomer: string;
  subjectInternal: string;
  textBody: string;
  htmlBody: string;
}) {
  const transporter = getTransport();

  const from = MAIL_FROM || "shop@localhost";
  const tasks: Promise<any>[] = [];

  // an Kunde (falls vorhanden)
  if (opts.customerEmail) {
    tasks.push(
      transporter.sendMail({
        from,
        to: opts.customerEmail,
        subject: opts.subjectCustomer,
        text: opts.textBody,
        html: opts.htmlBody,
      })
    );
  }

  // intern
  if (MAIL_TO_INTERNAL) {
    tasks.push(
      transporter.sendMail({
        from,
        to: MAIL_TO_INTERNAL,
        subject: opts.subjectInternal,
        text: opts.textBody,
        html: opts.htmlBody,
      })
    );
  }

  await Promise.allSettled(tasks);
}