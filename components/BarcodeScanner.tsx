// components/BarcodeScanner.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import {
  BrowserMultiFormatReader,
} from "@zxing/browser";
import {
  BarcodeFormat,
  DecodeHintType,
  Result,
} from "@zxing/library";

type Props = {
  /** Wird vom Parent als Overlay gerendert (optional). */
  onClose: () => void;
  /** Callback bei erkannter EAN/UPC/etc. */
  onDetected: (code: string) => void;
  /** Optional: gewünschte Formate, z.B. ["ean_13","ean_8","upc_a","upc_e","code_128"] */
  formats?: string[];
};

const FORMAT_MAP: Record<string, BarcodeFormat> = {
  ean_13: BarcodeFormat.EAN_13,
  ean_8: BarcodeFormat.EAN_8,
  upc_a: BarcodeFormat.UPC_A,
  upc_e: BarcodeFormat.UPC_E,
  code_128: BarcodeFormat.CODE_128,
  code_39: BarcodeFormat.CODE_39,
  qr: BarcodeFormat.QR_CODE,
};

export default function BarcodeScanner({ onClose, onDetected, formats }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    async function start() {
      setErr(null);

      // Hints optional setzen
      let hints: Map<DecodeHintType, any> | undefined = undefined;
      if (formats && formats.length) {
        const fmts = formats
          .map((f) => FORMAT_MAP[f.toLowerCase()])
          .filter(Boolean);
        if (fmts.length) {
          hints = new Map();
          hints.set(DecodeHintType.POSSIBLE_FORMATS, fmts);
        }
      }

      // Reader anlegen (mit Hints, wenn vorhanden)
      const reader = new BrowserMultiFormatReader(hints);
      readerRef.current = reader;

      try {
        // iOS: rear camera + playsInline
        const deviceId = undefined; // auto-pick
        await reader.decodeFromVideoDevice(
          deviceId,
          videoRef.current!,
          (result: Result | undefined, err) => {
            if (isCancelled) return;
            if (result) {
              try {
                onDetected(result.getText());
              } finally {
                // nach erstem Treffer wieder schließen
                onClose();
              }
            }
            // Fehler im Frame ignorieren (kontinuierlicher Scan)
          }
        );
      } catch (e: any) {
        console.error("ZXing start error:", e);
        // Häufig: Permission / HTTPS / Kamera blockiert
        setErr(
          e?.message ||
            "Kamera konnte nicht gestartet werden. Bitte Berechtigung erteilen und HTTPS/Live-Domain verwenden."
        );
      }
    }

    start();

    return () => {
      isCancelled = true;
      try {
        readerRef.current?.reset();
      } catch {}
      readerRef.current = null;
      // Kamera-Stream sauber beenden
      const v = videoRef.current;
      const stream = v?.srcObject as MediaStream | null;
      stream?.getTracks()?.forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md rounded-xl border border-white/15 bg-black/40 p-3">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold">Barcode scannen</h2>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 rounded bg-white/10 hover:bg-white/20"
          >
            Schließen
          </button>
        </div>

        <div className="relative rounded-lg overflow-hidden bg-black/50">
          <video
            ref={videoRef}
            className="w-full h-[320px] object-cover"
            muted
            autoPlay
            playsInline
          />
          {/* einfache Zielhilfe */}
          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <div className="w-3/4 max-w-xs h-28 border-2 border-cyan-400/70 rounded" />
          </div>
        </div>

        {err && (
          <p className="mt-3 text-sm text-amber-300">
            {err}
            <br />
            <span className="opacity-80">
              Tipp: iOS Safari/Chrome nur über HTTPS, Kamera in
              Website-Einstellungen erlauben. In-App-Browser vermeiden.
            </span>
          </p>
        )}

        <div className="mt-3 text-xs opacity-75">
          Hält den Code in das Rechteck. Unterstützte Formate:{" "}
          {formats?.length ? formats.join(", ") : "automatische Erkennung"}.
        </div>
      </div>
    </div>
  );
}