"use client";

import { useEffect, useState } from "react";

const KEY = "cookie_consent_v1";

export default function CookieConsent() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      // 1) Cookie prüfen
      const cookieHit = document.cookie.split("; ").some(c => c.startsWith(`${KEY}=1`));
      if (cookieHit) return;

      // 2) Fallback: localStorage prüfen (falls du früher LS genutzt hast)
      const ls = localStorage.getItem(KEY);
      if (ls === "1") {
        // Backfill in Cookie
        document.cookie = `${KEY}=1; Max-Age=${60 * 60 * 24 * 365}; Path=/; SameSite=Lax`;
        return;
      }

      setOpen(true);
    } catch {
      setOpen(true);
    }
  }, []);

  function accept() {
    try {
      localStorage.setItem(KEY, "1"); // optional
    } catch {}
    document.cookie = `${KEY}=1; Max-Age=${60 * 60 * 24 * 365}; Path=/; SameSite=Lax`;
    setOpen(false);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[100]">
      <div className="mx-auto max-w-4xl m-3 rounded-xl border border-white/15 bg-black/80 backdrop-blur px-4 py-3 text-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex-1">
            Wir verwenden Cookies für grundlegende Shop-Funktionen (z. B. Warenkorb).
            Mit Klick auf „Akzeptieren“ stimmst du dem zu.
          </div>
          <div className="flex gap-2">
            <button
              onClick={accept}
              className="px-4 py-2 rounded bg-cyan-500 text-black font-semibold hover:bg-cyan-400"
            >
              Akzeptieren
            </button>
            <a
              href="/de/datenschutz"
              className="px-4 py-2 rounded bg-white/10 hover:bg-white/20"
            >
              Details
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}