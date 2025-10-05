"use client";

type ProductBasic = {
  id: string;
  slug: string;
  productName?: string | null;
};

export default function AddToCart({ product }: { product: ProductBasic }) {
  function handleSubmit() {
    try {
      // 1) Cart schreiben (synchron)
      const raw = typeof window !== "undefined" ? localStorage.getItem("cart") : null;
      const cart: Record<string, { id: string; qty: number }> = raw ? JSON.parse(raw) : {};
      const currentQty = cart[product.id]?.qty || 0;
      cart[product.id] = { id: product.id, qty: currentQty + 1 };
      localStorage.setItem("cart", JSON.stringify(cart));
      // 2) NICHT preventDefault aufrufen → Browser navigiert via <form action="/de/merch">
      //    Das passiert unmittelbar nach diesem Handler.
    } catch (e) {
      console.error("addToCart error:", e);
      // Im Fehlerfall lieber auf der Seite bleiben (kein preventDefault nötig)
    }
    // nichts returnen → Standard-Submit (Navigation) läuft
  }

  return (
    <form
      action="/de/merch"
      method="get"
      // alles an Klicks bleibt in diesem Formular (kein Bubbling nach außen)
      onClickCapture={(e) => {
        e.stopPropagation();
      }}
      onSubmit={handleSubmit}
    >
      <button
        type="submit"
        className="inline-block px-3 py-1.5 rounded bg-cyan-500 hover:bg-cyan-400 text-black font-semibold"
      >
        In den Warenkorb
      </button>
    </form>
  );
}