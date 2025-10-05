'use client';

import {
  PayPalScriptProvider,
  PayPalButtons,
  FUNDING,
  usePayPalScriptReducer,
} from '@paypal/react-paypal-js';
import { useMemo } from 'react';

function format2(n: number) {
  const x = Number.isFinite(n) ? n : 0;
  return x.toFixed(2);
}

type ShippingMini = { name: string; amountEUR: number; carrier?: string };

type ButtonsProps = {
  total: number;                  // Anzeige – Server rechnet selbst
  orderId?: string;
  disabled?: boolean;
  shipping?: ShippingMini | null; // Versand (Name + Betrag)
};

function Buttons({ total, orderId, disabled, shipping }: ButtonsProps) {
  const [{ isPending }] = usePayPalScriptReducer();
  const value = useMemo(() => format2(total), [total]);
  const blocked = disabled || !orderId || Number(value) <= 0;

  return (
    <>
      {isPending && <div className="text-sm opacity-70">PayPal lädt…</div>}

      <PayPalButtons
        fundingSource={FUNDING.PAYPAL}
        style={{ layout: 'horizontal', label: 'paypal', shape: 'rect', height: 45 }}
        forceReRender={[value, 'EUR', !!orderId, !!disabled, shipping?.name, shipping?.amountEUR]}
        disabled={blocked}
        createOrder={async () => {
          if (blocked) throw new Error('Bitte zuerst Bestellung anlegen.');
          try {
            const r = await fetch('/api/paypal/create-order', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              cache: 'no-store',
              body: JSON.stringify({
                // Hinweis: amountEUR ist nur best effort; Backend prüft selbst.
                amountEUR: Number(value),
                description: `Blutonium Records Bestellung ${orderId || ''}`.trim(),
                orderId,
                shipping: shipping
                  ? {
                      name: shipping.name,
                      amountEUR: Number.isFinite(shipping.amountEUR) ? shipping.amountEUR : 0,
                      carrier: shipping.carrier || '',
                    }
                  : null,
              }),
            });
            const j = await r.json().catch(() => ({}));
            if (!r.ok || !j?.id) throw new Error(j?.error || 'create-order fehlgeschlagen');
            return j.id as string;
          } catch (err: any) {
            console.error('createOrder error', err);
            alert(err?.message || 'PayPal konnte nicht gestartet werden.');
            throw err;
          }
        }}
        onApprove={async (data) => {
          try {
            const ppOrderId = data.orderID!;
            // 👉 orderId beim Capture mitsenden, damit das Backend weiß, welche Order zu finalisieren ist
            const url = `/api/paypal/capture-order/${ppOrderId}?orderId=${encodeURIComponent(orderId || '')}`;
            const r = await fetch(url, { method: 'POST', cache: 'no-store' });
            const j = await r.json().catch(() => ({}));
            if (!r.ok) throw new Error(j?.error || 'PayPal Capture fehlgeschlagen');

            // Rechnung/Mails (non-blocking)
            if (orderId) {
              try {
                await fetch('/api/order/confirm', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ orderId }),
                });
              } catch (e) {
                console.warn('order/confirm failed (non-blocking)', e);
              }
            }

            try { localStorage.removeItem('cart'); } catch {}
            window.location.href = `/de/checkout/success?paypal=1${orderId ? `&order_id=${encodeURIComponent(orderId)}` : ''}`;
          } catch (err: any) {
            console.error('onApprove/capture error', err);
            alert(err?.message || 'PayPal Capture fehlgeschlagen.');
          }
        }}
        onError={(err) => {
          console.error('PayPal onError', err);
          alert('PayPal-Zahlung konnte nicht gestartet werden. Bitte erneut versuchen.');
        }}
      />
    </>
  );
}

export default function PayPalCheckout({
  total,
  orderId,
  disabled,
  shipping,
}: {
  total: number;
  orderId?: string;
  disabled?: boolean;
  shipping?: ShippingMini | null;
}) {
  const clientId = (process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || '').trim();
  const disabledByEnv = (process.env.NEXT_PUBLIC_PAYPAL_DISABLED || '') === '1';

  if (!clientId) return null;
  if (disabledByEnv) {
    return (
      <div className="mt-3 text-sm opacity-70">
        PayPal ist derzeit nicht verfügbar. Bitte wählen Sie eine andere Zahlart.
      </div>
    );
  }

  return (
    <PayPalScriptProvider
      options={{
        clientId,
        currency: 'EUR',
        intent: 'capture',
        commit: true,
        components: 'buttons',
        'disable-funding': 'card,paylater,venmo',
        'data-sdk-integration-source': 'react-paypal-js',
      } as any}
    >
      <Buttons total={total} orderId={orderId} disabled={disabled} shipping={shipping} />
    </PayPalScriptProvider>
  );
}