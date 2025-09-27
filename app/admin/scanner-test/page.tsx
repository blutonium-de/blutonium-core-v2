// app/admin/scanner-test/page.tsx
"use client";

import { useState } from "react";
import BarcodeScanner from "../../../components/BarcodeScanner";

export default function ScannerTestPage() {
  const [open, setOpen] = useState(false);
  const [last, setLast] = useState<string>("—");

  return (
    <div className="max-w-xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold">Scanner-Test</h1>
      <p className="opacity-70 mt-2">Testet nur das Kamera-Modal und die Erkennung.</p>

      <button
        className="mt-6 px-4 py-2 rounded bg-cyan-500 text-black font-semibold"
        onClick={() => setOpen(true)}
      >
        Scanner öffnen
      </button>

      <div className="mt-4">Letzter Code: <span className="font-mono">{last}</span></div>

      <BarcodeScanner
        open={open}
        onClose={() => setOpen(false)}
        onDetected={(code) => {
          setLast(code);
          setOpen(false);
        }}
      />
    </div>
  );
}