// components/PayPalCheckout.tsx
'use client';

import { PayPalScriptProvider, PayPalButtons, usePayPalScriptReducer } from '@paypal/react-paypal-js';
import { useMemo } from 'react';

function Buttons({ total }: { total: number }) {
  const [{ isPending }] = usePayPalScriptReducer();
  const value = useMemo(() => Number.isFinite(total) ? total.toFixed(2) : '0.00', [total]);

  return (
    <>
      {isPending && <div>PayPal lädt…</div>}
      <PayPalButtons
        forceReRender={[value, 'EUR']}
        style={{ layout: 'horizontal' }}
        createOrder={(_, actions) =>
          actions.order.create({
            intent: 'CAPTURE', // ✅ Pflichtfeld laut Typ
            purchase_units: [
              {
                amount: {
                  currency_code: 'EUR',
                  value,
                },
              },
            ],
          })
        }
        onApprove={(_, actions) =>
          actions.order!.capture().then((details) => {
            console.log('PayPal success:', details);
            window.location.href = '/de/checkout/success?paypal=1';
          })
        }
        onError={(err) => {
          console.error('PayPal error', err);
          alert('PayPal-Zahlung fehlgeschlagen.');
        }}
        disabled={Number(value) <= 0}
      />
    </>
  );
}

export default function PayPalCheckout({ total }: { total: number }) {
  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || '';
  if (!clientId) {
    if (typeof window !== 'undefined') {
      console.warn('PayPal Client ID fehlt. Prüfe NEXT_PUBLIC_PAYPAL_CLIENT_ID in Vercel.');
    }
    return null;
  }

  return (
    <PayPalScriptProvider
      options={{
        clientId,
        currency: 'EUR',
        intent: 'CAPTURE',
        'data-sdk-integration-source': 'react-paypal-js',
      } as any}
    >
      <Buttons total={total} />
    </PayPalScriptProvider>
  );
}