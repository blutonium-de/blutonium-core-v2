// components/CookieConsent.tsx
"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const STORAGE_KEY = "cookieConsent.v1"; // "accepted" | "declined"

export default function CookieConsent() {
  const pathname = usePathname() || "/";
  const isEN = pathname.startsWith("/en");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const v = localStorage.getItem(STORAGE_KEY);
      if (!v) setVisible(true);
    } catch {
      setVisible(true);
    }
  }, []);

  function accept() {
    try { localStorage.setItem(STORAGE_KEY, "accepted"); } catch {}
    setVisible(false);
  }
  function decline() {
    try { localStorage.setItem(STORAGE_KEY, "declined"); } catch {}
    setVisible(false);
  }

  if (!visible) return null;

  const privacyHref = isEN ? "/en/privacy" : "/de/datenschutz";
  const text = isEN
    ? {
        title: "Cookies & local storage",
        body:
          "We use essential cookies and local storage (e.g. for your cart). External services like Stripe/Spotify may set cookies when used.",
        accept: "Accept",
        decline: "Decline",
        more: "Learn more",
      }
    : {
        title: "Cookies & Local Storage",
        body:
          "Wir verwenden notwendige Cookies und Local Storage (z. B. für deinen Warenkorb). Externe Dienste wie Stripe/Spotify können beim Nutzen Cookies setzen.",
        accept: "Akzeptieren",
        decline: "Ablehnen",
        more: "Mehr erfahren",
      };

  return (
    <div
      role="dialog"
      aria-live="polite"
      className="fixed inset-x-0 bottom-0 z-[60] px-4 pb-4"
    >
      <div className="mx-auto max-w-3xl rounded-2xl border border-white/15 bg-black/85 backdrop-blur p-4 shadow-lg">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 h-6 w-6 shrink-0 rounded-full bg-white/10 grid place-items-center">🍪</div>
          <div className="min-w-0 flex-1">
            <div className="font-semibold">{text.title}</div>
            <p className="mt-1 text-sm opacity-80">{text.body}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={accept}
                className="rounded bg-cyan-500 hover:bg-cyan-400 text-black font-semibold px-3 py-1.5"
              >
                {text.accept}
              </button>
              <button
                onClick={decline}
                className="rounded bg-white/10 hover:bg-white/20 px-3 py-1.5"
              >
                {text.decline}
              </button>
              <a
                href={privacyHref}
                className="ml-auto text-sm underline decoration-white/30 hover:decoration-white"
                target="_self"
                rel="noreferrer"
              >
                {text.more}
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}