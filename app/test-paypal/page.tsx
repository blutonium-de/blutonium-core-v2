'use client';

import PayPalCheckout from '@/components/PayPalCheckout';

export default function TestPayPalPage() {
  return (
    <div style={{ padding: '2rem' }}>
      <h1 className="text-2xl font-bold mb-4">PayPal Test</h1>
      <p className="mb-4 opacity-70">
        Hier kannst du testen, ob der PayPal-Button korrekt lädt (Sandbox).
      </p>
      <PayPalCheckout total={9.50} />
    </div>
  );
}