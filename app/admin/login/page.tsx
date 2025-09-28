// app/admin/login/page.tsx
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export default function AdminLogin() {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();
  const sp = useSearchParams();
  const next = sp.get("next") || "/admin/products";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const r = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: pw }),
    });
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      setErr(j?.error || "Login fehlgeschlagen");
      return;
    }
    router.replace(next);
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <h1 className="text-2xl font-extrabold mb-4">Admin Login</h1>
      <form onSubmit={onSubmit} className="space-y-3">
        <input
          type="password"
          className="w-full rounded bg-white/5 border border-white/10 px-3 py-2"
          placeholder="Admin-Passwort"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          autoFocus
        />
        {err && <div className="text-red-400 text-sm">{err}</div>}
        <button
          type="submit"
          className="w-full px-4 py-2 rounded bg-cyan-500 hover:bg-cyan-400 text-black font-semibold"
        >
          Einloggen
        </button>
      </form>
    </div>
  );
}