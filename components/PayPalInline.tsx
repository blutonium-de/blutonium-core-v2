'use client';

import { useEffect, useRef, useState } from 'react';
import Script from 'next/script';

type Props = { total: number };

export default function PayPalInline({ total }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [elig, setElig] = useState<{ paypal?: boolean; card?: boolean }>({});

  const value = Number.isFinite(total) ? total.toFixed(2) : '0.00';
  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || '';
  const sdkUrl = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(
    clientId
  )}&currency=EUR&intent=CAPTURE&components=buttons`;

  useEffect(() => {
    if (!sdkLoaded || !ref.current) return;
    // @ts-ignore
    const pp = (window as any).paypal;
    console.log('[raw] window.paypal =', !!pp, pp?.version, 'src=', sdkUrl);
    if (!pp) {
      setError('SDK geladen, aber window.paypal fehlt (Blocker/3rd-Party-Cookies?).');
      return;
    }

    try {
      // Eligibility prüfen
      const funding = (pp as any).FUNDING;
      const isEligible = (src: any) => (pp as any).isFundingEligible ? (pp as any).isFundingEligible(src) : undefined;
      const paypalElig = isEligible(funding?.PAYPAL);
      const cardElig = isEligible(funding?.CARD);
      setElig({ paypal: paypalElig, card: cardElig });
      console.log('[raw] elig paypal=', paypalElig, 'card=', cardElig);

      // Wenn PayPal nicht eligible ist, versuche Card (nur zum Testen)
      const opts: any = {
        style: { layout: 'vertical', shape: 'rect', label: 'paypal' },
        createOrder: (_: any, actions: any) =>
          actions.order.create({
            intent: 'CAPTURE',
            purchase_units: [{ amount: { currency_code: 'EUR', value } }],
          }),
        onApprove: (_: any, actions: any) =>
          actions.order.capture().then((details: any) => {
            console.log('[raw] success', details);
            try { localStorage.removeItem('cart'); } catch {}
            window.location.href = '/de/checkout/success?paypal=1';
          }),
        onError: (e: any) => {
          console.error('[raw] onError', e);
          setError(String(e));
        },
      };

      // Versuche zuerst "paypal", sonst "card"
      const buttons =
        paypalElig !== false
          ? pp.Buttons(opts) // paypal (Standard)
          : pp.Buttons({ ...opts, fundingSource: (pp as any).FUNDING.CARD }); // Fallback: Card

      buttons.render(ref.current);
    } catch (e: any) {
      console.error('[raw] render error', e);
      setError(String(e));
    }
  }, [sdkLoaded, value, sdkUrl]);

  if (!clientId) return <div className="text-sm text-red-400">PayPal Client ID fehlt.</div>;

  return (
    <div style={{ minWidth: 300, maxWidth: 440 }}>
      <div id="pp-inline-container" ref={ref} />
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
      {error && <div className="mt-2 text-xs text-red-400">{error}</div>}
      {!error && (elig.paypal !== undefined || elig.card !== undefined) && (
        <div className="mt-2 text-xs opacity-70">
          Eligibility → PayPal: {String(elig.paypal)} · Card: {String(elig.card)}
        </div>
      )}
    </div>
  );
}