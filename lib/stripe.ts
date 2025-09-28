// lib/stripe.ts
import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

export function appOriginFromHeaders(req: Request) {
  // 1) explizit via ENV (empfohlen auf Vercel)
  const env = process.env.NEXT_PUBLIC_APP_ORIGIN?.trim();
  if (env) return env.replace(/\/+$/, "");

  // 2) sonst aus Request-Headern ermitteln
  const proto = (req.headers.get("x-forwarded-proto") || "http").split(",")[0].trim();
  const host = (req.headers.get("x-forwarded-host") || req.headers.get("host") || "localhost:3000")
    .split(",")[0].trim();
  return `${proto}://${host}`;
}