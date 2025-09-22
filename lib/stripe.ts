// lib/stripe.ts
import Stripe from "stripe"

// Stripe-Instanz mit fester API-Version
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})