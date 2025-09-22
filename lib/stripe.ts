// lib/stripe.ts
import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
// keine apiVersion → nutzt die Version, die zur SDK passt