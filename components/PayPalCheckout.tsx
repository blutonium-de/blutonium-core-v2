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
  const value = useMemo(() => format2(total), [total]);

  return (
    <>
      {isPending && <div className="text-sm opacity-70">PayPal lädt…</div>}

      <PayPalButtons
        // Nur der gelbe PayPal-Button (kein „Pay Later“, keine Karten)
        fundingSource={FUNDING.PAYPAL}
        // etwas robusteres Styling
        style={{ layout: 'horizontal', label: 'paypal', shape: 'rect', height: 45 }}

        // PayPal soll rerendern, wenn Betrag/Currency wechselt
        forceReRender={[value, 'EUR']}

        // 1) Order auf UNSEREM Server erstellen (stabiler, besseres Logging)
        createOrder={async () => {
          try {
            const r = await fetch('/api/paypal/create-order', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              cache: 'no-store',
              body: JSON.stringify({
                amountEUR: Number(value),
                description: 'Blutonium Records Bestellung',
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

        // 2) Order auf UNSEREM Server capturen
        onApprove={async (data) => {
          try {
            const orderID = data.orderID!;
            const r = await fetch(`/api/paypal/capture-order/${orderID}`, {
              method: 'POST',
              cache: 'no-store',
            });
            const j = await r.json().catch(() => ({}));
            if (!r.ok) throw new Error(j?.error || 'capture-order fehlgeschlagen');

            // Warenkorb leeren & Success
            try { localStorage.removeItem('cart'); } catch {}
            window.location.href = '/de/checkout/success?paypal=1';
          } catch (err: any) {
            console.error('onApprove/capture error', err);
            alert(err?.message || 'PayPal Capture fehlgeschlagen.');
          }
        }}

        onCancel={() => {
          // optional: zurück zur Checkout-Seite (bereits der Fall)
        }}

        onError={(err) => {
          console.error('PayPal onError', err);
          alert('PayPal-Zahlung konnte nicht gestartet werden. Bitte erneut versuchen.');
        }}

        // Schutz: bei 0€ deaktivieren
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
        intent: 'capture',                      // klein schreiben
        commit: true,                           // „Jetzt zahlen“ Fluss
        components: 'buttons',                  // explizit nur Buttons laden
        'disable-funding': 'card,paylater,venmo', // nur PayPal zulassen
        'data-sdk-integration-source': 'react-paypal-js',
        // unbekannte Felder werden vom SDK ignoriert – daher kein "debug" hier
      } as any}
    >
      <Buttons total={total} />
    </PayPalScriptProvider>
  );
}