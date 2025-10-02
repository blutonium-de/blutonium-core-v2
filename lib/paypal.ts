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
    // @ts-ignore
    cache: "no-store",
    body: "grant_type=client_credentials",
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`PayPal OAuth failed (${res.status}): ${t || res.statusText}`);
  }
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
    // @ts-ignore
    cache: "no-store",
  });

  const text = await res.text();               // ← erst Text lesen
  let json: any = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* ignore */ }

  if (!res.ok) {
    const msg =
      (json && (json.message || json.error_description || json.name)) ||
      res.statusText;
    const details = json?.details ? ` ${JSON.stringify(json.details)}` : "";
    throw new Error(`PayPal API ${res.status}: ${msg}${details}`);
  }

  return json ?? {};                            // leeres Objekt nur falls wirklich leer
}