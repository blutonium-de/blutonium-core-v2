// lib/paypal.ts

// --- Mode / Base ------------------------------------------------------------
export const paypalMode = process.env.PAYPAL_MODE === "live" ? "live" : "sandbox";
export const isLive = paypalMode === "live";

const BASE =
  paypalMode === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

export function paypalBaseUrl() {
  return BASE;
}

export function getPaypalClientId(): string {
  // Praktisch für das JS-SDK im Client (NEXT_PUBLIC_*).
  return (
    process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID ||
    process.env.PAYPAL_CLIENT_ID || // fallback, falls du sie nur serverseitig gesetzt hast
    ""
  );
}

// --- Helpers ----------------------------------------------------------------
function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) {
    throw new Error(`[paypal] Missing env ${name}`);
  }
  return v;
}

// Kleines In-Memory Token-Caching, um unnötige OAuth-Calls zu vermeiden.
let tokenCache: { token: string; exp: number } | null = null;

async function getAccessToken(): Promise<string> {
  const client = requireEnv("PAYPAL_CLIENT_ID");
  const secret = requireEnv("PAYPAL_SECRET");

  // Wenn noch gültig, wiederverwenden
  if (tokenCache && Date.now() < tokenCache.exp) {
    return tokenCache.token;
  }

  const auth = Buffer.from(`${client}:${secret}`).toString("base64");

  const res = await fetch(`${BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    // @ts-expect-error next runtime
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error("[paypal] oauth failed:", res.status, text);
    throw new Error("PayPal OAuth failed");
  }

  const j: any = await res.json();

  const token = j?.access_token as string | undefined;
  const ttlSec = Number(j?.expires_in || 0);

  if (!token) {
    console.error("[paypal] oauth response missing access_token:", j);
    throw new Error("PayPal OAuth missing token");
  }

  // 60s Puffer
  const exp = Date.now() + Math.max(0, ttlSec - 60) * 1000;
  tokenCache = { token, exp };

  return token;
}

// Zentraler API-Wrapper: gleiche Auth, sauberes Error-Handling.
export async function paypalApi(path: string, init?: RequestInit) {
  const token = await getAccessToken();

  const res = await fetch(`${BASE}${path}`, {
    ...(init || {}),
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
      ...(init?.headers || {}),
    },
    // @ts-expect-error next runtime
    cache: "no-store",
  });

  const raw = await res.text().catch(() => "");

  // Versuche JSON zu parsen – sonst leeres Objekt
  let json: any = {};
  try {
    json = raw ? JSON.parse(raw) : {};
  } catch {
    /* noop */
  }

  if (!res.ok) {
    // PayPal liefert häufig {name, message, details[]}
    const msg =
      json?.message ||
      json?.error ||
      json?.name ||
      res.statusText ||
      "PayPal API error";

    console.error("[paypal] api error", {
      path,
      status: res.status,
      msg,
      details: json?.details,
      body: raw,
    });

    throw new Error(`PayPal API ${res.status}: ${msg}`);
  }

  return json;
}