// lib/stripe.ts
import Stripe from "stripe"

// Stripe-Instanz ohne feste API-Version → nimmt automatisch die Version,
// die zu deinem Account / SDK passt
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)