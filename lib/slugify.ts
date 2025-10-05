// lib/slugify.ts
export function slugify(de: string) {
  const map: Record<string, string> = {
    ä: "ae", ö: "oe", ü: "ue", Ä: "ae", Ö: "oe", Ü: "ue", ß: "ss",
  };
  return de
    .trim()
    .replace(/[äöüÄÖÜß]/g, (m) => map[m])
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/--+/g, "-");
}