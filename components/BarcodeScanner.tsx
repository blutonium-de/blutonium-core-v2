// components/BarcodeScanner.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  BrowserMultiFormatReader,
  BarcodeFormat,
  DecodeHintType,
} from "@zxing/browser";

type Props = {
  open: boolean;
  onClose: () => void;
  onDetected: (code: string) => void;
  /** z.B. ["ean_13","ean_8","upc_a","upc_e","code_128"] */
  formats?: string[];
};

function isInAppWebView(ua: string) {
  ua = ua.toLowerCase();
  return (
    ua.includes("fbav") || ua.includes("fban") || // Facebook
    ua.includes("instagram") ||                   // Instagram
    ua.includes("line") ||                        // LINE
    ua.includes("wv") ||                          // Generic WebView (Android)
    ua.includes("twitter") ||                     // X/Twitter
    ua.includes("whatsapp")                       // WhatsApp
  );
}

function mapFormats(list?: string[]) {
  // Default: die gängigen Handelscodes
  const wanted = (list && list.length ? list : ["ean_13", "ean_8", "upc_a", "upc_e", "code_128"])
    .map((s) => s.toLowerCase());

  const set = new Set<BarcodeFormat>();
  if (wanted.includes("ean_13")) set.add(BarcodeFormat.EAN_13);
  if (wanted.includes("ean_8")) set.add(BarcodeFormat.EAN_8);
  if (wanted.includes("upc_a")) set.add(BarcodeFormat.UPC_A);
  if (wanted.includes("upc_e")) set.add(BarcodeFormat.UPC_E);
  if (wanted.includes("code_128")) set.add(BarcodeFormat.CODE_128);
  if (wanted.includes("code_39")) set.add(BarcodeFormat.CODE_39);
  if (wanted.includes("itf")) set.add(BarcodeFormat.ITF);
  return set;
}

export default function BarcodeScanner({
  open,
  onClose,
  onDetected,
  formats,
}: Props) {
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false); // Kamera initialisiert
  const [starting, setStarting] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);

  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const inApp = useMemo(() => isInAppWebView(ua), [ua]);

  const hints = useMemo(() => {
    const h = new Map();
    h.set(DecodeHintType.POSSIBLE_FORMATS, Array.from(mapFormats(formats)));
    return h;
  }, [formats]);

  // Aufräumen (Tracks stoppen)
  function stopAll() {
    try {
      readerRef.current?.stopContinuousDecode();
    } catch {}
    readerRef.current = null;

    const s = streamRef.current;
    if (s) {
      s.getTracks().forEach((t) => {
        try { t.stop(); } catch {}
      });
    }
    streamRef.current = null;
    setReady(false);
  }

  useEffect(() => {
    if (!open) {
      // Modal ist zu → sicherheitshalber stoppen
      stopAll();
      setError(null);
      setStarting(false);
    } else {
      // Beim Öffnen noch keinen Autostart → iOS will User-Geste
      setError(null);
      setStarting(false);
      setReady(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function startCamera() {
    setError(null);

    // Grundchecks
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Kamera-API nicht verfügbar.");
      return;
    }
    if (location.protocol !== "https:" && location.hostname !== "localhost") {
      setError("Kamera erfordert HTTPS. Bitte über https aufrufen.");
      return;
    }
    if (inApp) {
      setError("Dieser In-App-Browser blockiert den Kamera-Zugriff. Bitte in Safari oder Chrome öffnen.");
      return;
    }

    try {
      setStarting(true);

      // Rückkamera bevorzugen
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: "environment" },
          // etwas konservativ für iPhone-Performance
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      const video = videoRef.current!;
      video.srcObject = stream;
      // iOS braucht playsInline, muted, kein Autoplay-Block
      video.setAttribute("playsinline", "true");
      (video as any).muted = true;

      await video.play();

      // ZXing-Reader
      const reader = new BrowserMultiFormatReader(hints, 300);
      readerRef.current = reader;

      await reader.decodeFromVideoDevice(
        undefined,
        video,
        (result, err, controls) => {
          // Bei jedem Frame Callback: result = Barcode, err = DecodingError/NotFound
          if (result) {
            // Code gefunden → sofort stoppen
            try { controls.stop(); } catch {}
            stopAll();
            onDetected(result.getText());
          }
        }
      );

      setReady(true);
    } catch (e: any) {
      console.error("Scanner start error:", e);
      setError(e?.message || "Kamera-Zugriff verweigert oder fehlgeschlagen.");
    } finally {
      setStarting(false);
    }
  }

  return !open ? null : (
    <div
      className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-lg rounded-xl border border-white/15 bg-zinc-900 shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <h2 className="text-lg font-semibold">Barcode scannen</h2>
          <button
            onClick={() => { stopAll(); onClose(); }}
            className="px-3 py-1.5 rounded bg-white/10 hover:bg-white/20"
          >
            Schließen
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Video-Viewport */}
          <div className="aspect-video w-full bg-black/60 rounded-lg grid place-items-center overflow-hidden">
            <video
              ref={videoRef}
              className="w-full h-full object-contain"
              playsInline
            />
            {!ready && (
              <div className="absolute text-sm opacity-80 px-3 py-1 rounded bg-white/10">
                {starting ? "Kamera wird gestartet …" : "Bereit"}
              </div>
            )}
          </div>

          {error ? (
            <div className="rounded border border-red-500/30 bg-red-500/10 text-red-200 p-3 text-sm">
              {error}
              {inApp && (
                <div className="mt-2 opacity-80">
                  Öffne die Seite bitte direkt in <b>Safari</b> oder <b>Chrome</b> (nicht aus WhatsApp/Instagram).
                </div>
              )}
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={startCamera}
                disabled={starting}
                className="px-4 py-2 rounded bg-cyan-500 hover:bg-cyan-400 text-black font-semibold disabled:opacity-60"
              >
                {starting ? "Starte Kamera …" : "Kamera starten"}
              </button>
              <button
                onClick={stopAll}
                className="px-4 py-2 rounded bg-white/10 hover:bg-white/20"
              >
                Kamera stoppen
              </button>
            </div>
          )}

          <div className="text-xs opacity-70">
            Tipp: Halte den Code ruhig ins Bild. Unterstützt werden EAN-13/8, UPC-A/E, CODE-128 (konfigurierbar).
          </div>
        </div>
      </div>
    </div>
  );
}