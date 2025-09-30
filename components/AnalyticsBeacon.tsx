"use client";

import { useEffect } from "react";

export default function AnalyticsBeacon({ enabled = true }: { enabled?: boolean }) {
  useEffect(() => {
    if (!enabled) return;
    if (typeof window === "undefined") return;

    // Nicht in Dev-Umgebung posten
    if (process.env.NODE_ENV === "development") return;

    const payload = {
      path: window.location.pathname + window.location.search,
      ref: document.referrer?.slice(0, 200) || "",
      ts: Date.now(),
    };

    try {
      const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
      if (navigator.sendBeacon) {
        navigator.sendBeacon("/api/analytics/track", blob);
      } else {
        fetch("/api/analytics/track", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          keepalive: true,
          body: JSON.stringify(payload),
        }).catch(() => {});
      }
    } catch {}
  }, [enabled]);

  return null;
}