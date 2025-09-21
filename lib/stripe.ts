// lib/stripe.ts
import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY fehlt in .env.local / Vercel Env");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  // Nimm eine feste, bewährte API-Version (stabiler Builds)
  apiVersion: "2024-06-20",
});