"use client";

import { useMemo, useState } from "react";

const STATUSES = ["open", "paid", "processing", "shipped", "canceled", "refunded"] as const;
type Status = typeof STATUSES[number];

export default function OrderStatusControl({
  orderId,
  current,
  adminKey,
}: {
  orderId: string;
  current: string | null | undefined;
  adminKey?: string;
}) {
  const initial: Status = useMemo(() => {
    return STATUSES.includes((current as Status) ?? "open")
      ? ((current as Status) || "open")
      : "open";
  }, [current]);

  const [value, setValue] = useState<Status>(initial);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [ok, setOk] = useState<boolean | null>(null);

  async function save() {
    setBusy(true);
    setMsg(null);
    setOk(null);
    try {
      const url = `/api/admin/orders/${orderId}/status?key=${encodeURIComponent(adminKey ?? "")}`;
      const r = await fetch(url, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          // Header zusätzlich – falls Query irgendwo verloren geht
          ...(adminKey ? { "x-admin-key": adminKey } : {}),
        },
        body: JSON.stringify({ status: value }),
      });

      const text = await r.text();
      let j: any = null;
      try { j = JSON.parse(text); } catch {}

      if (!r.ok) {
        const reason =
          j?.error ||
          (r.status === 401 || r.status === 403
            ? "Kein/ungültiger Admin-Token (bitte neu einloggen)."
            : text || `HTTP ${r.status}`);
        throw new Error(reason);
      }

      setOk(true);
      setMsg("Gespeichert ✓");
    } catch (e: any) {
      setOk(false);
      setMsg(e?.message || "Fehler beim Speichern");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={value}
        onChange={(e) => setValue(e.target.value as Status)}
        className="bg-white/10 border border-white/10 rounded px-2 py-1"
      >
        {STATUSES.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>

      <button
        onClick={save}
        disabled={busy}
        className="px-3 py-1.5 rounded bg-white/10 hover:bg-white/20 disabled:opacity-50"
        title="Status speichern"
      >
        {busy ? "Speichere …" : "Speichern"}
      </button>

      {msg && (
        <span
          className={`text-sm ${
            ok == null ? "opacity-70" : ok ? "text-emerald-400" : "text-red-400"
          }`}
        >
          {msg}
        </span>
      )}
    </div>
  );
}