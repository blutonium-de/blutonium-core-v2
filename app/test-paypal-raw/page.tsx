'use client';
import PayPalInline from '@/components/PayPalInline';

export default function TestPayPalRaw() {
  return (
    <div style={{ padding: 24 }}>
      <h1 className="text-2xl font-bold mb-4">PayPal Raw Test</h1>
      <PayPalInline total={9.5} />
    </div>
  );
}