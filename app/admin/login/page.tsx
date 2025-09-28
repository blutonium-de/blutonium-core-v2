// app/admin/login/page.tsx
"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<div className="max-w-md mx-auto px-4 py-10">Lade …</div>}>
      <AdminLoginInner />
    </Suspense>
  );
}

function AdminLoginInner() {
  const router = useRouter();
  const search = useSearchParams();

  const [key, setKey] = useState("");
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const next = search.get("next") || "/admin";

  useEffect(() => {
    // evtl. vorhandenes Token aus LocalStorage vorfüllen (komfort)
    try {
      const k = localStorage.getItem("admin_key") || "";
      if (k) setKey(k);
    } catch {}
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      // optional im LocalStorage merken (nur Komfort, Sicherheit macht Cookie+Middleware)
      try {
        if (remember) localStorage.setItem("admin_key", key);
        else localStorage.removeItem("admin_key");
      } catch {}

      // Cookie via API setzen (httpOnly)
      const r = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, remember }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j?.ok) throw new Error(j?.error || "Login fehlgeschlagen");

      router.push(next);
      router.refresh();
    } catch (e: any) {
      setErr(e?.message || "Fehler beim Login");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 py-10">
      <h1 className="text-3xl font-extrabold">Admin Login</h1>
      <p className="mt-2 text-white/70 text-sm">
        Bitte Admin-Token eingeben, um fortzufahren.
      </p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <label className="block">
          <div className="text-sm mb-1 opacity-80">Admin-Token</div>
          <input
            type="password"
            className="w-full rounded-lg bg-white/5 border border-white/15 px-3 py-2"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            required
          />
        </label>

        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
          />
          <span className="text-sm opacity-80">Auf diesem Gerät merken</span>
        </label>

        {err && <div className="text-sm text-red-400">{err}</div>}

        <button
          type="submit"
          disabled={busy}
          className="px-4 py-2 rounded bg-cyan-500 hover:bg-cyan-400 text-black font-semibold disabled:opacity-60"
        >
          {busy ? "Prüfe …" : "Einloggen"}
        </button>
      </form>
    </div>
  );
}