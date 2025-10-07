// /components/fsk.ts
export function parseFsk(v?: string | number | null): 0|6|12|16|18|null {
  if (v == null) return null;

  const s = v.toString().toLowerCase();

  if (s.includes("18")) return 18;
  if (s.includes("16")) return 16;
  if (s.includes("12")) return 12;
  if (s.includes("6"))  return 6;
  if (s.includes("0"))  return 0;

  return null;
}

export function fskIconPath(v?: string | number | null): string | null {
  const n = parseFsk(v);
  return n == null ? null : `/fsk/fsk-${n}.png`;
}