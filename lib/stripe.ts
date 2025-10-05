// lib/stripe.ts
import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
  appInfo: { name: "Blutonium Records Shop" },
});

export function appOriginFromHeaders(req: Request) {
  const proto = (req.headers.get("x-forwarded-proto") || "https").split(",")[0].trim();
  const host = (req.headers.get("x-forwarded-host") || req.headers.get("host") || "").split(",")[0].trim();
  return `${proto}://${host}`;
}

/** HTTPS-Absolute URL bauen. Fällt auf Request-Origin zurück, wenn BASE fehlt. */
export function absFrom(req: Request, path: string) {
  const baseEnv = (process.env.NEXT_PUBLIC_BASE_URL || "").replace(/\/+$/, "");
  const base = baseEnv || appOriginFromHeaders(req);
  if (/^https?:\/\//i.test(path)) return path;
  return new URL(path, base + "/").toString();
}