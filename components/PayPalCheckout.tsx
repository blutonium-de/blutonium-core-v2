// components/PayPalCheckout.tsx
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

function Buttons({ total }: { total: number }) {
  const [{ isPending }] = usePayPalScriptReducer();

  // ⚡️ Fix: Immer 9.00 EUR für Test
  const value = useMemo(() => format2(9), [total]);

  return (
    <>
      {isPending && <div className="text-sm opacity-70">PayPal lädt…</div>}

      <PayPalButtons
        fundingSource={FUNDING.PAYPAL}
        style={{ layout: 'horizontal', label: 'paypal', shape: 'rect', height: 45 }}
        forceReRender={[value, 'EUR']}
        createOrder={async () => {
          try {
            const r = await fetch('/api/paypal/create-order', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              cache: 'no-store',
              body: JSON.stringify({
                amountEUR: Number(value),
                description: 'Blutonium Records Testbestellung',
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
            const orderID = data.orderID!;
            const r = await fetch(`/api/paypal/capture-order/${orderID}`, {
              method: 'POST',
              cache: 'no-store',
            });
            const j = await r.json().catch(() => ({}));
            if (!r.ok) throw new Error(j?.error || 'capture-order fehlgeschlagen');

            try { localStorage.removeItem('cart'); } catch {}
            window.location.href = '/de/checkout/success?paypal=1';
          } catch (err: any) {
            console.error('onApprove/capture error', err);
            alert(err?.message || 'PayPal Capture fehlgeschlagen.');
          }
        }}
        onError={(err) => {
          console.error('PayPal onError', err);
          alert('PayPal-Zahlung konnte nicht gestartet werden. Bitte erneut versuchen.');
        }}
        disabled={Number(value) <= 0}
      />
    </>
  );
}

export default function PayPalCheckout({ total }: { total: number }) {
  const clientId = (process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || '').trim();
  const disabled = (process.env.NEXT_PUBLIC_PAYPAL_DISABLED || '') === '1';

  // Wenn kein Client ID vorhanden → gar nichts rendern
  if (!clientId) return null;

  // Temporär deaktiviert: Hinweis statt Button
  if (disabled) {
    return (
      <div className="mt-3 text-sm opacity-70">
        PayPal-Zahlung ist vorübergehend deaktiviert.
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
      <Buttons total={total} />
    </PayPalScriptProvider>
  );
}