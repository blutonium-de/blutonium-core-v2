// components/PayPalCheckout.tsx
'use client';

import { PayPalScriptProvider, PayPalButtons, usePayPalScriptReducer } from '@paypal/react-paypal-js';
import { useEffect, useMemo, useRef, useState } from 'react';

const CURRENCY = 'EUR';

function Buttons({ total }: { total: number }) {
  const [{ isPending }] = usePayPalScriptReducer();
  const value = useMemo(() => Number.isFinite(total) ? total.toFixed(2) : '0.00', [total]);
  const [rendered, setRendered] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Debug: zeigt, ob das SDK im Window hängt
    // @ts-ignore
    console.log('[paypal] window.paypal?', !!window?.paypal, window?.paypal?.version);
  }, []);

  useEffect(() => {
    // Kurzer Check ob ein PayPal-iframe im Container landet
    const t = setTimeout(() => {
      const hasIframe = !!containerRef.current?.querySelector('iframe[src*="paypal.com"]');
      console.log('[paypal] iframe in container?', hasIframe);
      setRendered(hasIframe);
    }, 800);
    return () => clearTimeout(t);
  }, [value]);

  return (
    <div
      ref={containerRef}
      style={{
        minWidth: 300,
        maxWidth: 420,
        marginTop: 8,
      }}
    >
      {isPending && <div className="text-sm opacity-70">PayPal lädt…</div>}

      <PayPalButtons
        // 👉 erzwinge re-render bei Betrags-/Währungswechsel
        forceReRender={[value, CURRENCY]}
        // 👉 versuche ausschließlich die klassische PayPal-Zahlart
        fundingSource="paypal"
        style={{ layout: 'vertical', label: 'paypal', shape: 'rect' }}
        createOrder={(_, actions) =>
          actions.order.create({
            intent: 'CAPTURE',
            purchase_units: [
              {
                amount: { currency_code: CURRENCY, value },
              },
            ],
          })
        }
        onApprove={(_, actions) =>
          actions.order!.capture().then((details) => {
            console.log('[paypal] success', details);
            try { localStorage.removeItem('cart'); } catch {}
            window.location.href = '/de/checkout/success?paypal=1';
          })
        }
        onInit={(data, actions) => {
          console.log('[paypal] onInit', data);
        }}
        onClick={(data, actions) => {
          console.log('[paypal] onClick', data);
        }}
        onError={(err) => {
          console.error('[paypal] onError', err);
          alert('PayPal-Zahlung fehlgeschlagen (siehe Konsole).');
        }}
        disabled={Number(value) <= 0}
      />

      {/* Falls PayPal nichts rendert, wenigstens ein Hinweis */}
      {!isPending && !rendered && (
        <div className="mt-2 text-xs opacity-70">
          PayPal-Button nicht verfügbar. Prüfe Blocker/CSP oder probiere Stripe.
        </div>
      )}
    </div>
  );
}

export default function PayPalCheckout({ total }: { total: number }) {
  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || '';

  if (!clientId) {
    if (typeof window !== 'undefined') {
      console.warn('[paypal] Client ID fehlt. Prüfe NEXT_PUBLIC_PAYPAL_CLIENT_ID in Vercel.');
    }
    return null;
  }

  return (
    <PayPalScriptProvider
      options={{
        clientId,
        currency: CURRENCY,
        intent: 'CAPTURE',
        components: 'buttons', // explizit
        'data-sdk-integration-source': 'react-paypal-js',
      } as any}
    >
      <Buttons total={total} />
    </PayPalScriptProvider>
  );
}