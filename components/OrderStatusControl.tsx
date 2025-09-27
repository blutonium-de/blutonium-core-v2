"use client";

import { useState } from "react";

const STATUSES = ["open", "paid", "processing", "shipped", "canceled", "refunded"] as const;
type Status = typeof STATUSES[number];

export default function OrderStatusControl({
  orderId,
  current,
  adminKey,
}: {
  orderId: string;
  current: string;
  adminKey?: string;
}) {
  const [value, setValue] = useState<Status>(
    (STATUSES.includes(current as Status) ? current : "paid") as Status
  );
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      const r = await fetch(`/api/admin/orders/${orderId}/status?key=${encodeURIComponent(adminKey ?? "")}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: value }),
      });
      if (!r.ok) throw new Error(await r.text());
      setMsg("Gespeichert.");
    } catch (e: any) {
      setMsg("Fehler: " + (e?.message ?? "unbekannt"));
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
      >
        Speichern
      </button>
      {msg && <span className="text-sm opacity-70">{msg}</span>}
    </div>
  );
}