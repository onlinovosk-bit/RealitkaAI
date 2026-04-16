# Incident: PROD `/dashboard` — React #418 + #185 (2026-04)

## Symptómy

- **URL:** `https://app.revolis.ai/dashboard`
- **Chyby v konzole:** Minified React **#418** (hydration mismatch), potom **#185** (maximum update depth exceeded).
- **UI:** `error.tsx` — „Stránka sa nepodarila načítať“.
- **Zásah:** všetci používatelia načítavajúci dashboard po nasadení kódu so zraniteľným headerom.

## Root cause (RCA)

**Príčina (root):** V `SpaceHeader` bol **živý čas** inicializovaný cez `useState(() => formatClock(new Date()))`. Počas **SSR** a na **prvom klientovskom paint** bol obsah textu iný → **hydration mismatch (React #418)**. Následné opätovné pokusy Reactu o zosúladenie stromu v kombinácii s ďalšími client-only aktualizáciami (header, AI mock store) viedli k kaskáde aktualizácií a symptómu **#185**.

**Trigger:** prvý load `/dashboard` (SSR + hydrate).

**Súvisiace predchádzajúce riziká:** nekonzistentný dotaz na `profiles` (`user_id` vs `auth_user_id`) — opravené v samostatnom commite; nie je priamou príčinou #418, ale zvyšoval hluk v konzole (400).

## Fix (safe)

- `SpaceHeader`: `clock` inicializované prázdny reťazec; `formatClock(new Date())` **iba v `useEffect`** po mounte.
- `suppressHydrationWarning` na elemente s časom (obranný pás pre okrajové rozdiely).
- Predchádzajúce úpravy: odstránenie live-typing v headeri, spevnenie `AIPulseSystem`, správny stĺpec `auth_user_id` pre profil.

## Preventívne opatrenia

- Pravidlo: **žiadny `Date` / `Math.random` / `localStorage` v prvom renderi** komponentov pod `(dashboard)` bez `useEffect` alebo server-only vetvy.
- Vitest: `SpaceHeader.test.tsx` kontroluje SSR reťazec (žiadny `HH:MM:SS`).
- Odporúčanie: periodicky spúšťať Playwright smoke na `/dashboard` po prihlásení a failovať na `console` chybách.

## Guard / test

- `src/components/layout/SpaceHeader.test.tsx` — SSR `renderToString` nesmie obsahovať časový formát `\d{2}:\d{2}:\d{2}`.

## Monitoring / alerting (failure mode)

- **Syntetické / manuálne:** HTTP 200 na `/dashboard` po autentifikácii; DevTools bez #418/#185.
- **Existujúce API:** `GET /api/observability/probes` (ak nasadené) — doplniť kontrolu kľúčových route podľa interného playbooku.
- **Vercel:** build/deploy notifikácie; na úrovni produktu zvážiť Real User Monitoring (Sentry/crash reporting) na `Error` v bundle.

## Exact env (runtime CRM / Vercel)

Povinné pre aplikáciu (nepovinné pre samotný hydration fix):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (alebo ekvivalent publishable key podľa vášho namingu)
- `NEXT_PUBLIC_APP_URL` (smoke / redirecty)
- Voliteľné: `VERCEL_*` pre CLI deploy z CI

## Test plan (po deployi)

1. Inkognito okno: prihlásenie test používateľom → otvoriť `/dashboard`.
2. Očakávanie: žiadna červená obrazovka `error.tsx`; hlavička zobrazí čas po ~0–1 s (najprv môže byť krátka medzera prázdneho času).
3. Konzola: žiadny **#418** / **#185**.
4. Spustiť `npx vitest run` a `npx playwright test` (CI) na `main`.

## Rollback plán

1. V GitHub-e / Vercel: **Promote previous deployment** na posledný známy zelený build pred incident fix commitmi (`SpaceHeader` clock hydration).
2. Alternatíva: `git revert` posledných commitov týkajúcich sa `SpaceHeader` + súvisiacich zmien a push na `main` (spustí CI znova).
3. Overenie rollbacku: krok 1–3 z test plánu.

## Acceptance criteria mapping

| # | Stav |
|---|------|
| 1 Incident odstránený v PROD | Po merge + Vercel deploy |
| 2 Repro zlyhá po fixe | SSR test + manuálna verifikácia |
| 3 Guard/test | `SpaceHeader.test.tsx` |
| 4 Monitoring | Tento dokument + existujúce probes API |
| 5 Rollback | Vyššie |
