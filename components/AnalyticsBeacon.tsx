"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

type Props = { enabled?: boolean };

export default function AnalyticsBeacon({ enabled = true }: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Merker für vorherigen Pfad (als interner Referrer)
  const prevPathRef = useRef<string | null>(null);

  // stabile Session-ID pro Tab/Session
  function getSessionId() {
    try {
      const k = "session_id";
      let v = sessionStorage.getItem(k);
      if (!v) {
        v = crypto.randomUUID();
        sessionStorage.setItem(k, v);
      }
      return v;
    } catch {
      return null;
    }
  }

  function send(payload: any) {
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
    } catch {
      // schlucken
    }
  }

  useEffect(() => {
    if (!enabled) return;
    if (typeof window === "undefined") return;
    if (process.env.NODE_ENV === "development") return;

    const path = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : "");

    // Referrer: erster Hit -> document.referrer, danach -> vorheriger interner Pfad
    const ref =
      prevPathRef.current ??
      (document.referrer ? String(document.referrer).slice(0, 200) : "");

    const payload = {
      path,
      ref,
      ts: Date.now(),
      sessionId: getSessionId(),
    };

    send(payload);

    // aktuellen Pfad als zukünftigen Referrer merken
    prevPathRef.current = path;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, pathname, searchParams]);

  return null;
}