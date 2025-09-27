# Deployment-Anleitung (Vercel) — blutonium-core-v2

## 1) Node & Next.js
- Node: >= 18.18 (siehe `package.json` engines)
- Next.js: 14.2.5, App Router

## 2) Umgebungsvariablen (Vercel Project Settings → Environment Variables)
- ADMIN_TOKEN
- NEXT_PUBLIC_SITE_URL
- STRIPE_SECRET_KEY
- STRIPE_WEBHOOK_SECRET
- (Optional) NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
- DATABASE_URL  ← **Für Produktion NICHT SQLite verwenden.**
- YOUTUBE_API_KEY
- NEXT_PUBLIC_YT_CHANNEL_ID
- SPOTIFY_CLIENT_ID
- SPOTIFY_CLIENT_SECRET
- SPOTIFY_MARKET
- DISCOGS_KEY
- DISCOGS_SECRET

> Lege zuerst alle Vars in **Preview** und **Production** an.

## 3) Datenbank-Hinweis
Dein `schema.prisma` nutzt aktuell `provider = "sqlite"`. Auf Vercel sind Schreibzugriffe auf lokale Dateien nicht persistent.
**Empfehlung:** Migriere auf eine gehostete DB:
- Vercel Postgres (PostgreSQL)
- PlanetScale (MySQL)
- Turso/LibSQL (SQLite-Remote)
- Neon/Render (PostgreSQL)

Passe `datasource db` und `DATABASE_URL` entsprechend an und führe Migrationen aus:
```bash
npx prisma migrate deploy
```

## 4) Stripe Webhook (Next.js App Router)
- Route: `app/api/stripe/webhook/route.ts`
- Wichtig: `export const runtime = "nodejs"` und `await req.text()` für raw body sind vorhanden.
- In Vercel: Richte den Endpoint als Webhook-URL ein, z. B.
  `https://<your-deployment>/api/stripe/webhook` und trage das Secret `STRIPE_WEBHOOK_SECRET` ein.

## 5) Entwickeln & Bauen
```bash
pnpm i           # oder npm i / yarn
pnpm dev         # localhost:3000
pnpm build       # Production-Build
pnpm start       # Preview lokal (optional)
```

## 6) Tailwind
- Konfiguration vorhanden (`tailwind.config.js`, `postcss.config.js`)
- Achte darauf, dass alle relevanten Pfade im `content`-Array enthalten sind (App Router ist abgedeckt).

## 7) Prisma Client
- In `lib/db.ts` wird ein globaler Client verwendet → ok für Next.js/Hot-Reload.
- In Server Actions und API-Routen denselben Client importieren.

## 8) Health Checks / Admin
- `ADMIN_TOKEN` wird in API/Pages geprüft. Stelle sicher, dass der Wert gesetzt ist und nicht im Client gebundlet wird (nur Server verwenden).

## 9) Cache/ISR
- Prüfe, ob dynamische Routen korrekt als `dynamic = "force-dynamic"` markiert sind, wenn sie Mutationen/SSR benötigen.
