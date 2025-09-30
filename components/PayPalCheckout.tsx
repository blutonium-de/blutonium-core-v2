// components/PayPalCheckout.tsx
'use client';

import { PayPalScriptProvider, PayPalButtons, usePayPalScriptReducer } from '@paypal/react-paypal-js';
import { useEffect, useMemo, useRef, useState } from 'react';

const CURRENCY = 'EUR';

function Buttons({ total }: { total: number }) {
  const [{ isPending }] = usePayPalScriptReducer();
  const value = useMemo(() => Number.isFinite(total) ? total.toFixed(2) : '0.00', [total]);
  const [rendered, setRendered] = useState(false);
  const [diagnose, setDiagnose] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // kleine Helper
  const checkIframe = () => !!containerRef.current?.querySelector('iframe[src*="paypal.com"]');
  const checkScript = () => document.querySelector<HTMLScriptElement>('script[src*="paypal.com/sdk/js"]')?.src ?? '';

  useEffect(() => {
    const t = setTimeout(() => {
      const hasIframe = checkIframe();
      const scriptUrl = checkScript();
      // @ts-ignore
      const sdk = typeof window !== 'undefined' ? (window as any).paypal : undefined;
      // @ts-ignore
      const funding = sdk?.FUNDING;
      // @ts-ignore
      const eligiblePaypal = sdk?.isFundingEligible ? sdk.isFundingEligible(funding?.PAYPAL) : undefined;
      // @ts-ignore
      const eligibleCard   = sdk?.isFundingEligible ? sdk.isFundingEligible(funding?.CARD)   : undefined;

      console.log('[paypal] sdk ', sdk?.version, 'script=', scriptUrl);
      console.log('[paypal] eligibility: paypal=', eligiblePaypal, 'card=', eligibleCard);
      console.log('[paypal] iframe in container?', hasIframe);

      setRendered(hasIframe);

      if (!scriptUrl) {
        setDiagnose('SDK-Script nicht gefunden (CSP/Blocker?)');
      } else if (sdk && eligiblePaypal === false && eligibleCard === false) {
        setDiagnose('Keine Zahlungsart eligible (Sandbox-Account / Funding-Settings prüfen)');
      } else if (sdk && eligiblePaypal === false) {
        setDiagnose('PayPal (Wallet) nicht eligible; evtl. nur Karten erlaubt.');
      } else if (!sdk) {
        setDiagnose('SDK geladen, aber window.paypal fehlt (Blocker/3rd-Party-Cookies?).');
      } else {
        setDiagnose(null);
      }
    }, 900);
    return () => clearTimeout(t);
  }, [value]);

  return (
    <div ref={containerRef} style={{ minWidth: 300, maxWidth: 440, marginTop: 8 }}>
      {isPending && <div className="text-sm opacity-70">PayPal lädt…</div>}

      <PayPalButtons
        forceReRender={[value, CURRENCY]}
        // Lass ALLE Buttons zu, damit wir sehen, ob evtl. nur "Card" eligible ist
        style={{ layout: 'vertical', shape: 'rect', label: 'paypal' }}
        createOrder={(_, actions) =>
          actions.order.create({
            intent: 'CAPTURE',
            purchase_units: [{ amount: { currency_code: CURRENCY, value } }],
          })
        }
        onApprove={(_, actions) =>
          actions.order!.capture().then((details) => {
            console.log('[paypal] success', details);
            try { localStorage.removeItem('cart'); } catch {}
            window.location.href = '/de/checkout/success?paypal=1';
          })
        }
        onInit={(data) => console.log('[paypal] onInit', data)}
        onClick={(data) => console.log('[paypal] onClick', data)}
        onError={(err) => {
          console.error('[paypal] onError', err);
          alert('PayPal-Zahlung fehlgeschlagen (siehe Konsole).');
        }}
        disabled={Number(value) <= 0}
      />

      {!isPending && !rendered && (
        <div className="mt-2 text-xs opacity-70">
          PayPal-Button nicht sichtbar.
          {diagnose ? <> Hinweis: {diagnose}</> : <> Prüfe Blocker/CSP oder probiere Stripe.</>}
        </div>
      )}
    </div>
  );
}

export default function PayPalCheckout({ total }: { total: number }) {
  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || '';
  if (!clientId) {
    if (typeof window !== 'undefined') console.warn('[paypal] Client ID fehlt.');
    return null;
  }

  // SDK-URL in die Logs schreiben (hilft im Network-Tab)
  if (typeof window !== 'undefined') {
    const url = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&currency=${CURRENCY}&intent=CAPTURE&components=buttons`;
    console.log('[paypal] will load SDK:', url.slice(0, 140) + '…');
  }

  return (
    <PayPalScriptProvider
      options={{
        clientId,
        currency: CURRENCY,
        intent: 'CAPTURE',
        components: 'buttons',
        'data-sdk-integration-source': 'react-paypal-js',
      } as any}
    >
      <Buttons total={total} />
    </PayPalScriptProvider>
  );
}