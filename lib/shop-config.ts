// lib/shop-config.ts
export const FREE_SHIPPING_EUR: number = (() => {
  const raw =
    process.env.NEXT_PUBLIC_FREE_SHIPPING_EUR ??
    process.env.SHOP_FREE_SHIPPING_MIN;
  const n = Number(raw);
  return Number.isFinite(n) ? n : 50;
})();