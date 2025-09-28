// components/BarcodeScanner.tsx
"use client";

import { useEffect, useRef } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import type { Result } from "@zxing/library";

type Props = {
  onClose: () => void;
  onDetected: (code: string) => void;
  /**
   * Optional: Liste erlaubter Formate (z.B. ["ean_13","ean_8","upc_a","upc_e","code_128"])
   * Wird aktuell nur dokumentarisch verwendet; Filterung kann bei Bedarf ergänzt werden.
   */
  formats?: string[];
};

export default function BarcodeScanner({ onClose, onDetected }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const stopRequestedRef = useRef(false);

  // Kamera-Stream stoppen
  const stopStream = () => {
    try {
      const stream = streamRef.current;
      if (stream) {
        stream.getTracks().forEach((t) => {
          try { t.stop(); } catch {}
        });
      }
    } catch {}
    if (videoRef.current) {
      try { (videoRef.current as any).srcObject = null; } catch {}
      try { videoRef.current.pause(); } catch {}
    }
    streamRef.current = null;
  };

  // Beim Unmount aufräumen
  useEffect(() => {
    return () => {
      stopRequestedRef.current = true;
      stopStream();
      readerRef.current = null; // kein reset() nötig/typisiert
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Starten
  useEffect(() => {
    let cancelled = false;

    async function start() {
      stopRequestedRef.current = false;

      const constraints: MediaStreamConstraints = {
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      };

      try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;

        if (videoRef.current) {
          (videoRef.current as any).srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }

        const reader = new BrowserMultiFormatReader();
        readerRef.current = reader;

        await reader.decodeFromVideoDevice(
          undefined,
          videoRef.current!,
          (result: Result | undefined /* , err */) => {
            if (stopRequestedRef.current) return;
            if (result) {
              const text = result.getText?.() ?? String(result);
              stopRequestedRef.current = true;
              stopStream();
              try { onDetected(text); } catch {}
              try { onClose(); } catch {}
            }
          }
        );
      } catch (e) {
        console.error("BarcodeScanner start error:", e);
        try { onClose(); } catch {}
      }
    }

    start();

    return () => {
      cancelled = true;
      stopRequestedRef.current = true;
      stopStream();
      readerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md rounded-xl overflow-hidden border border-white/10 bg-black">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <div className="font-semibold">Barcode scannen</div>
          <button
            onClick={() => {
              stopRequestedRef.current = true;
              stopStream();
              onClose();
            }}
            className="rounded bg-white/10 hover:bg-white/20 px-3 py-1"
          >
            Schließen
          </button>
        </div>

        <div className="relative">
          <video
            ref={videoRef}
            className="block w-full h-[360px] object-cover bg-black"
            playsInline
            muted
            autoPlay
          />
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="w-48 h-48 border-2 border-cyan-400/70 rounded" />
          </div>
        </div>

        <div className="px-4 py-3 text-sm opacity-70">
          Tippe zum Fokussieren; halte den Code ruhig innerhalb des Rahmens.
        </div>
      </div>
    </div>
  );
}