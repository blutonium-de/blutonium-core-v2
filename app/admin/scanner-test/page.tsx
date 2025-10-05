// app/admin/scanner-test/page.tsx
"use client";

import { useState } from "react";
// Wenn du keine Base-URL (@) nutzt, mach den relativen Pfad wie in deinen anderen Dateien:
import BarcodeScanner from "../../../components/BarcodeScanner";

export default function ScannerTestPage() {
  const [open, setOpen] = useState(false);
  const [last, setLast] = useState<string | null>(null);

  return (
    <div className="max-w-xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold">Scanner-Test</h1>

      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="px-3 py-2 rounded bg-cyan-500 text-black font-semibold hover:bg-cyan-400"
        >
          Scanner öffnen
        </button>
        {last && (
          <div className="px-2 py-1 rounded bg-white/10 text-sm">
            Letzter Code: <span className="font-mono">{last}</span>
          </div>
        )}
      </div>

      {/* Scanner-Overlay nur rendern, wenn `open` */}
      {open && (
        <BarcodeScanner
          onClose={() => setOpen(false)}
          onDetected={(code) => {
            setLast(code);
            setOpen(false);
          }}
          formats={["ean_13", "ean_8", "upc_a", "upc_e", "code_128"]}
        />
      )}
    </div>
  );
}