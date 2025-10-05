// components/useLocalCart.ts
import { useEffect, useMemo, useState } from "react";

export type CartItem = { id: string; qty: number };

const STORAGE_KEY = "cart_v2";

function read(): CartItem[] {
  try {
    const raw = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    const data = raw ? JSON.parse(raw) : [];
    return Array.isArray(data) ? data.filter(x => x && typeof x.id === "string" && Number.isFinite(x.qty)) : [];
  } catch {
    return [];
  }
}

function write(items: CartItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {}
}

export function useLocalCart() {
  const [items, setItems] = useState<CartItem[]>([]);

  // initial laden
  useEffect(() => {
    setItems(read());
  }, []);

  // persistieren
  useEffect(() => {
    write(items);
  }, [items]);

  const add = (id: string, qty = 1) =>
    setItems(prev => {
      const i = prev.findIndex(x => x.id === id);
      if (i >= 0) {
        const next = [...prev];
        next[i] = { ...next[i], qty: next[i].qty + qty };
        return next;
      }
      return [...prev, { id, qty }];
    });

  const setQty = (id: string, qty: number) =>
    setItems(prev =>
      prev
        .map(x => (x.id === id ? { ...x, qty: Math.max(0, Math.floor(qty)) } : x))
        .filter(x => x.qty > 0)
    );

  const remove = (id: string) => setItems(prev => prev.filter(x => x.id !== id));
  const clear = () => setItems([]);

  const count = useMemo(() => items.reduce((a, b) => a + (b.qty || 0), 0), [items]);

  return { items, add, setQty, remove, clear, count };
}