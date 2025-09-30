'use client';

import {
  PayPalScriptProvider,
  PayPalButtons,
  usePayPalScriptReducer,
  FUNDING,
} from '@paypal/react-paypal-js';
import { useMemo } from 'react';

function Buttons({ total }: { total: number }) {
  const [{ isPending }] = usePayPalScriptReducer();
  const value = useMemo(() => (Number.isFinite(total) ? total.toFixed(2) : '0.00'), [total]);

  return (
    <>
      {isPending && <div>PayPal lädt…</div>}
      <PayPalButtons
        fundingSource={FUNDING.PAYPAL}               // <- nur gelber PayPal-Button
        style={{ layout: 'horizontal', label: 'paypal', shape: 'rect' }}
        forceReRender={[value, 'EUR']}
        createOrder={(_, actions) =>
          actions.order.create({
            intent: 'CAPTURE',
            purchase_units: [{ amount: { currency_code: 'EUR', value } }],
          })
        }
        onApprove={(_, actions) =>
          actions.order!.capture().then(() => {
            try { localStorage.removeItem('cart'); } catch {}
            window.location.href = '/de/checkout/success?paypal=1';
          })
        }
        onError={(err) => {
          console.error('PayPal error', err);
          alert('PayPal-Zahlung fehlgeschlagen. Bitte erneut versuchen.');
        }}
        disabled={Number(value) <= 0}
      />
    </>
  );
}

export default function PayPalCheckout({ total }: { total: number }) {
  const clientId = (process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || '').trim();
  if (!clientId) return null;

  return (
    <PayPalScriptProvider
      options={{
        clientId,
        currency: 'EUR',
        intent: 'capture',                           // <- klein in der URL!
        'data-sdk-integration-source': 'react-paypal-js',
      } as any}
    >
      <Buttons total={total} />
    </PayPalScriptProvider>
  );
}