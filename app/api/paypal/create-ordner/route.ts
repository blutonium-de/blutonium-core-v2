import { NextResponse } from "next/server";
import { paypalApi } from "../../../../lib/paypal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  // Entweder exakten Betrag schicken ODER (später) Warenkorb-IDs
  amountEUR: number;
  description?: string;
};

export async function POST(req: Request) {
  try {
    const { amountEUR, description }: Body = await req.json();

    if (!Number.isFinite(amountEUR) || amountEUR <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    // PayPal Order erstellen (Capture-Intent)
    const order = await paypalApi("/v2/checkout/orders", {
      method: "POST",
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          {
            amount: {
              currency_code: process.env.PAYPAL_CURRENCY || "EUR",
              value: amountEUR.toFixed(2),
            },
            description: description || "Blutonium Order",
          },
        ],
        application_context: {
          brand_name: "BLUTONIUM",
          user_action: "PAY_NOW",
        },
      }),
    });

    return NextResponse.json(order, { status: 200 });
  } catch (e: any) {
    console.error("[paypal create-order]", e);
    return NextResponse.json({ error: e?.message || "server error" }, { status: 500 });
  }
}