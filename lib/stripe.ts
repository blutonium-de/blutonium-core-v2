// lib/stripe.ts
import Stripe from "stripe";

// TS zufriedenstellen: benutze die von den Typen erwartete neueste Literal-Version
const apiVersion: Stripe.LatestApiVersion = "2025-08-27.basil";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion,
});

// Kleiner Helfer, um die Origin korrekt zu bestimmen (lokal/Vercel)
export function appOriginFromHeaders(req: Request) {
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  const host =
    req.headers.get("x-forwarded-host") ??
    req.headers.get("host") ??
    "localhost:3000";
  return `${proto}://${host}`;
}