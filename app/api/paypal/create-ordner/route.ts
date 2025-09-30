import { NextResponse } from "next/server";

const BASE = process.env.PAYPAL_MODE === "live"
  ? "https://api-m.paypal.com"
  : "https://api-m.sandbox.paypal.com";

async function getAccessToken() {
  const client = process.env.PAYPAL_CLIENT_ID!;
  const secret = process.env.PAYPAL_SECRET!;
  const creds = Buffer.from(`${client}:${secret}`).toString("base64");

  const res = await fetch(`${BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${creds}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`oauth failed: ${res.status} ${t}`);
  }
  const json = await res.json();
  return json.access_token as string;
}

export async function POST(req: Request) {
  try {
    const { amountEUR, description } = await req.json();
    if (!amountEUR || Number(amountEUR) <= 0) {
      return NextResponse.json({ error: "amount missing" }, { status: 400 });
    }

    const token = await getAccessToken();

    const res = await fetch(`${BASE}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          {
            amount: { currency_code: "EUR", value: Number(amountEUR).toFixed(2) },
            description: description || "Order",
          },
        ],
        application_context: {
          user_action: "PAY_NOW",
          return_url: `${process.env.NEXT_PUBLIC_BASE_URL || ""}/de/checkout/success?paypal=1`,
          cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL || ""}/de/checkout?paypal_cancel=1`,
        },
      }),
    });

    const json = await res.json();
    if (!res.ok) {
      return NextResponse.json({ error: json?.message || "create order failed", raw: json }, { status: 500 });
    }

    const approve = (json.links || []).find((l: any) => l.rel === "approve")?.href;
    return NextResponse.json({ id: json.id, approveUrl: approve });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "server error" }, { status: 500 });
  }
}