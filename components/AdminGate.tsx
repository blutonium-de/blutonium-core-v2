// components/AdminGate.tsx
"use client";

import { useEffect, useState } from "react";

export default function AdminGate({ children }: { children: React.ReactNode }) {
  const [ok, setOk] = useState(false);

  useEffect(() => {
    const url = new URL(window.location.href);
    const qKey = url.searchParams.get("key");
    if (qKey) {
      localStorage.setItem("admin_key", qKey);
      url.searchParams.delete("key");
      window.history.replaceState({}, "", url.toString());
    }
    const k = localStorage.getItem("admin_key");
    setOk(!!k);
  }, []);

  if (!ok) {
    return (
      <div className="max-w-xl mx-auto py-10">
        <p className="mb-4 opacity-80">Admin-Schlüssel erforderlich.</p>
        <button
          className="px-4 py-2 rounded bg-cyan-500 text-black font-semibold"
          onClick={() => {
            const k = prompt("Admin-Key eingeben (ADMIN_TOKEN):");
            if (k) {
              localStorage.setItem("admin_key", k);
              location.reload();
            }
          }}
        >
          Login
        </button>
      </div>
    );
  }

  return <>{children}</>;
}