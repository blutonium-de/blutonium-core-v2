// lib/paypal.ts
const mode = process.env.PAYPAL_MODE === "live" ? "live" : "sandbox";
const base = mode === "live"
  ? "https://api-m.paypal.com"
  : "https://api-m.sandbox.paypal.com";

export function paypalBaseUrl() {
  return base;
}

async function getAccessToken() {
  const id = process.env.PAYPAL_CLIENT_ID || "";
  const secret = process.env.PAYPAL_SECRET || "";

  const res = await fetch(`${base}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Authorization": "Basic " + Buffer.from(`${id}:${secret}`).toString("base64"),
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });

  if (!res.ok) throw new Error("PayPal OAuth failed");
  const j = await res.json();
  return j.access_token as string;
}

export async function paypalApi(path: string, init?: RequestInit) {
  const token = await getAccessToken();

  const res = await fetch(`${base}${path}`, {
    ...(init || {}),
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = (json as any)?.message || (json as any)?.error || res.statusText;
    throw new Error(`PayPal API ${res.status}: ${msg}`);
  }
  return json;
}