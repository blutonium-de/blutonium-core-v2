// components/BarcodeScanner.tsx
"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  onDetected: (code: string) => void;
  onClose: () => void;
  formats?: string[]; // z.B. ["ean_13","ean_8","upc_a","upc_e","code_128"]
};

type BarcodeDetectorType = {
  new (opts?: { formats?: string[] }): {
    detect: (img: CanvasImageSource) => Promise<Array<{ rawValue: string }>>;
  };
};

export default function BarcodeScanner({ onDetected, onClose, formats }: Props) {
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function start() {
      // Check Browser support
      const BD = (window as any).BarcodeDetector as BarcodeDetectorType | undefined;
      if (!BD) {
        setError(
          "Dein Browser unterstützt den Kamera-Barcode-Scanner nicht. Bitte nutze Chrome/Edge/Safari – oder tippe den Code ein."
        );
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
        if (cancelled) return;
        streamRef.current = stream;

        const v = videoRef.current!;
        (v as any).srcObject = stream;
        await v.play();

        const detector = new BD({
          formats:
            formats ||
            [
              "ean_13",
              "ean_8",
              "upc_a",
              "upc_e",
              "code_128",
              "code_39",
              "itf",
              "qr_code",
            ],
        });

        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d")!;

        const tick = async () => {
          if (!videoRef.current) return;
          const vw = videoRef.current.videoWidth || 0;
          const vh = videoRef.current.videoHeight || 0;
          if (vw && vh) {
            canvas.width = vw;
            canvas.height = vh;
            ctx.drawImage(videoRef.current, 0, 0, vw, vh);
            try {
              const results = await detector.detect(canvas as unknown as CanvasImageSource);
              if (results && results.length) {
                const value = results[0].rawValue?.trim();
                if (value) {
                  stop();
                  onDetected(value);
                  return;
                }
              }
            } catch {
              // ignore and keep scanning
            }
          }
          rafRef.current = requestAnimationFrame(tick);
        };

        rafRef.current = requestAnimationFrame(tick);
      } catch (e: any) {
        setError(e?.message || "Kamera konnte nicht gestartet werden.");
      }
    }

    start();

    function stop() {
      rafRef.current && cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    return () => {
      cancelled = true;
      stop();
    };
  }, [formats, onDetected]);

  return (
    <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-black rounded-lg border border-white/20 p-3">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold">Barcode scannen</h2>
          <button
            type="button"
            onClick={onClose}
            className="px-2 py-1 rounded bg-white/10 hover:bg-white/20"
          >
            Schließen
          </button>
        </div>

        <video ref={videoRef} playsInline autoPlay muted className="w-full rounded bg-black" />

        {error && (
          <p className="text-red-500 text-sm mt-3">
            {error}
          </p>
        )}

        {!error && (
          <p className="opacity-70 text-sm mt-3">
            Richte die Kamera auf den EAN/UPC-Barcode. Der Scan passiert automatisch.
          </p>
        )}
      </div>
    </div>
  );
}