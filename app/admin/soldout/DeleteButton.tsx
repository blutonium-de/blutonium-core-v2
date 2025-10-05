// app/admin/soldout/DeleteButton.tsx
"use client";

export default function DeleteButton({ id, adminKey }: { id: string; adminKey: string }) {
  async function onDelete() {
    if (!confirm("Wirklich löschen? Das kann nicht rückgängig gemacht werden.")) return;
    try {
      const r = await fetch(`/api/admin/products/${id}`, {
        method: "DELETE",
        headers: { "x-admin-key": adminKey },
      });
      if (!r.ok) throw new Error(await r.text());
      location.reload();
    } catch (e: any) {
      alert(e?.message || "Löschen fehlgeschlagen");
    }
  }

  return (
    <button onClick={onDelete} className="px-3 py-1.5 rounded bg-red-600/20 hover:bg-red-600/30">
      Löschen
    </button>
  );
}