# INC: Chýbajúci informačný riadok (blog) na `/dashboard`

**Dátum:** 2026-04-16  
**Prostredie:** produkcia (`https://app.revolis.ai`)  
**Stav:** uzavreté (fix + hardening)

## Symptóm

Po prihlásení na `/dashboard` sa nezobrazoval spodný pás s odkazmi na blogové články (`BlogPromoTicker`).

## Root cause analysis (RCA)

| Položka | Popis |
|--------|--------|
| **Príčina** | `BlogPromoTicker` nebol súčasťou **dashboard** chrome — bol len na marketingových stránkach / login; `DashboardClientLayout` ho neobsahoval. |
| **Trigger** | Nasadenie alebo refaktor layoutu bez presunutia / duplikácie komponentu v autentifikovanom shell-e. |
| **Dopad** | UX regresia (chýbajúce odkazy), nie security incident. |

## Preventívne opatrenia (implementované)

1. **`BlogPromoTicker` v `dashboard-client-layout.tsx`** — spodný `shrink-0` blok s `z-[2]`.
2. **Smoke:** kontrola `blog-promo-config` v `runSmokeTests()` (`BLOG_PROMO_ITEMS.length >= 1`).
3. **E2E:** Playwright `dashboard-stability.spec.ts` — viditeľnosť `section[data-testid="blog-promo-ticker"]` a odkazu „Všetky články“.
4. **Monitoring:** `/api/observability/probes` volá `GET /api/system/smoke` a degraduje pri `ok: false` (vrátane zlyhania smoke kontroly).
5. **Pravidlo:** `system-smoke-pack` v `lib/observability-rules.ts`.

## Exact env list (relevantné pre tento incident)

| Premenná | Účel |
|----------|------|
| `NEXT_PUBLIC_APP_URL` | Základná URL pre odkazy a syntetické probe-y (default `https://app.revolis.ai`). |
| `TEST_USER_EMAIL` / `TEST_USER_PASSWORD` | Playwright login pre `dashboard-stability` (voliteľné; fallback v teste). |

Žiadne ďalšie env sú **vyžadované** špecificky pre zobrazenie blog pásu — dáta sú v `lib/blog-articles.ts` (`BLOG_PROMO_ITEMS`).

## Test plan (po deployi)

1. **Manuálne:** `https://app.revolis.ai/login` → login → `/dashboard` → dole viditeľný pás „Blog“, 4 články + „Všetky články“.
2. **API:** `GET https://app.revolis.ai/api/system/smoke` → JSON `ok: true`, kontrola `checks` obsahuje `blog-promo-config` s `ok: true`.
3. **Probes:** `GET https://app.revolis.ai/api/observability/probes` → `ok: true`, položka pre `/api/system/smoke` má `status: "ok"`.
4. **CI / lokálne:** `cd apps/crm && npx playwright test tests/dashboard-stability.spec.ts` (server beží na `3000`).

## Rollback plán

1. **Vercel:** Deployments → predchádzajúci stabilný deployment → **Promote to Production** (alebo **Redeploy** z posledného zeleného commitu).
2. **Git:** `git revert <commit-sha-fix>` a merge na main, ak je potrebný čistý rollback kódu.
3. **Overenie po rollbacku:** opakovať bod 1–3 z test planu; očakáva sa **regresia** (chýbajúci pás), ak je to pred-fix stav — potom znova nasadiť fix.

## Alerting (odporúčanie)

- Externý monitor (Vercel Cron / Uptime / Datadog) na `GET /api/observability/probes` každých 1–5 min; alert ak `ok !== true` alebo `degradedCount > 0`.
- Alternatíva: priamo `GET /api/system/smoke` s alertom na `ok: false`.
