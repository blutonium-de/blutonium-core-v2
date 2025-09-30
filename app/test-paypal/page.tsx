'use client';

import { useEffect, useRef, useState } from 'react';
import Script from 'next/script';

export default function TestPayPalRaw() {
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID!;

  useEffect(() => {
    if (!sdkLoaded) return;
    // @ts-ignore
    const pp = (window as any).paypal;
    console.log('[raw] window.paypal =', !!pp, pp?.version);
    if (!pp) {
      setError('SDK geladen, aber window.paypal fehlt (Blocker/CSP?)');
      return;
    }
    try {
      pp.Buttons({
        style: { layout: 'vertical', label: 'paypal' },
        createOrder: (_: any, actions: any) =>
          actions.order.create({
            intent: 'CAPTURE',
            purchase_units: [{ amount: { currency_code: 'EUR', value: '9.50' } }],
          }),
        onApprove: (_: any, actions: any) =>
          actions.order.capture().then((d: any) => {
            console.log('[raw] success', d);
          }),
        onError: (e: any) => {
          console.error('[raw] onError', e);
          setError(String(e));
        },
      }).render(ref.current!);
    } catch (e: any) {
      console.error('[raw] render error', e);
      setError(String(e));
    }
  }, [sdkLoaded]);

  const sdkUrl = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(
    clientId
  )}&currency=EUR&intent=CAPTURE&components=buttons`;

  return (
    <div style={{ padding: 24 }}>
      <h1 className="text-2xl font-bold mb-4">PayPal Raw Test</h1>

      <p className="mb-2 text-sm opacity-70">SDK URL:</p>
      <code className="block text-xs break-all mb-4">{sdkUrl}</code>

      <div id="pp-container" ref={ref} style={{ minWidth: 320, maxWidth: 420 }} />

      <Script
        src={sdkUrl}
        strategy="afterInteractive"
        onLoad={() => {
          console.log('[raw] sdk loaded');
          setSdkLoaded(true);
        }}
        onError={(e) => {
          console.error('[raw] sdk load error', e);
          setError('SDK konnte nicht geladen werden (CSP/Netzwerk?).');
        }}
      />

      {error && <div className="mt-4 text-sm text-red-400">Fehler: {error}</div>}
    </div>
  );
}