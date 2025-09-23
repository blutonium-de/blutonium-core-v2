// lib/stripe.ts
import Stripe from "stripe";

// Keine feste apiVersion angeben – die SDK nutzt automatisch die passende Version
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "");