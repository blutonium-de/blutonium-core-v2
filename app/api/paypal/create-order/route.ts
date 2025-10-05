// app/api/paypal/create-order/route.ts
import { NextResponse } from "next/server";
import { paypalApi } from "@/lib/paypal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CreateOrderBody = {
  amountEUR?: unknown;
  description?: unknown;
};

function sanitizeAmount(v: unknown): number | null {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 100) / 100;
}

export async function POST(req: Request) {
  try {
    let payload: CreateOrderBody;
    try {
      payload = await req.json();
    } catch {
      return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
    }

    const amount = sanitizeAmount(payload.amountEUR);
    if (amount == null) {
      return NextResponse.json({ error: "amountEUR missing/invalid" }, { status: 400 });
    }

    const desc =
      (typeof payload.description === "string" ? payload.description : "Order").slice(0, 127);

    const brand = process.env.NEXT_PUBLIC_SITE_NAME || "Blutonium Records";
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "";

    const body = {
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: `PU-${Date.now()}`,
          amount: { currency_code: "EUR", value: amount.toFixed(2) },
          description: desc,
        },
      ],
      application_context: {
        brand_name: brand,
        locale: "de-DE",
        user_action: "PAY_NOW",
        return_url: `${baseUrl}/de/checkout/success?paypal=1`,
        cancel_url: `${baseUrl}/de/checkout?paypal_cancel=1`,
      },
    };

    // wichtig: vollständige Repräsentation anfordern
    const json = await paypalApi("/v2/checkout/orders", {
      method: "POST",
      headers: {
        Prefer: "return=representation",
        "PayPal-Request-Id": `ord-${Date.now()}`, // idempotent (optional, hilfreich beim Debuggen)
      },
      body: JSON.stringify(body),
    });

    const approveUrl = Array.isArray(json?.links)
      ? json.links.find((l: any) => l?.rel === "approve")?.href
      : undefined;

    if (!json?.id) {
      // Wenn PayPal ok, aber ohne Body geliefert hat → als Fehler behandeln
      return NextResponse.json(
        { error: "Missing order id in PayPal response", raw: json },
        { status: 502 }
      );
    }

    return NextResponse.json({ id: json.id, approveUrl }, { status: 200 });
  } catch (e: any) {
    console.error("[paypal create-order]", e);
    return NextResponse.json({ error: e?.message || "server error" }, { status: 500 });
  }
}