// lib/stripe.ts
import Stripe from "stripe";

// Verwende die SDK-Default-API-Version (empfohlen)
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);