// lib/mailer.ts
import nodemailer from "nodemailer";

export function hasMailerEnv() {
  return !!(process.env.MAIL_HOST && process.env.MAIL_PORT && process.env.MAIL_FROM);
}

export function getTransport() {
  const host = process.env.MAIL_HOST!;
  const port = Number(process.env.MAIL_PORT || "587");
  const user = process.env.MAIL_USER || undefined;
  const pass = process.env.MAIL_PASS || undefined;

  const secure = port === 465;

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: user && pass ? { user, pass } : undefined,
  });
}