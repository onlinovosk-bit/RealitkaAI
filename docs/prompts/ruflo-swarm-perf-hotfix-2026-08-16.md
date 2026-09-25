# RUFLO SWARM — PERF HOTFIX P1: T1/T2 minútové visenia (16.8.2026)

**Cieľová cesta v repe:** `docs/prompts/ruflo-swarm-perf-hotfix-2026-08-16.md`

**Režim (nemenný):** vetva + PR + STOP. **ŽIADNY MERGE, ŽIADNY PUSH DO MAIN,
ŽIADNE CREDENTIALS V REPE, ŽIADNY ZÁSAH DO PROD DB, NIKTO NEPÍŠE DO `memory/`.**
Merge robí výhradne founder. CONSTITUTION limity: soft 400 / hard 600 riadkov na PR.

---

## SYMPTÓM (founder, produkcia, 16.8. ~09:20 CEST, main = `0e3f907`)

| Stránka | T1 (prvé načítanie) | T2 (refresh) |
|---|---|---|
| `/dashboard` | **~4 minúty** | 5 s |
| `/leads` | 4 s | 5 s |
| `/acquisition` | **~5 minút** | **~5 minút (!)** |

Kľúčové stopy:

1. `/leads` bol rýchly MEDZI dvomi minútovými meraniami → **layout (zdieľaný
   všetkými (dashboard) routami) nie je hlavný vinník**.
2. `/acquisition` je pomalý **deterministicky** (aj T2) → v jeho ceste visí niečo
   pri každom requeste. `/dashboard` len na T1.
3. Supabase (projekt `ypgajkhqtbriqqmyawyv`): **Postgres 57 ERRORS za 24 h**,
   červené špičky presne okolo 16.8. ráno (čas meraní). Auth 918 req / 0 errors.
4. `docs/reports/2026-08-15-acquisition-t2-perfgate.md`: 2-min diera medzi
   layout queries a prvým `acquisition_*` SELECT.
5. undici (Node fetch) default headers timeout = **300 s = 5 min** — presne sedí
   na namerané stropy. Ani jeden fetch v celej SSR ceste nemá timeout.

## VSTUPNÁ BRÁNA — každý lane pred štartom

```
git fetch origin && git log --oneline origin/main -3
```

Podmienka: na `origin/main` je `0e3f907` (#418) alebo novší. Ak nie → lane sa
NESPÚŠŤA, zapíš report.

## Nálezy recon vlny (Cowork, 16.8. — file:line na maine `0e3f907`)

- **R-1 [HIGH, global]** `apps/crm/src/lib/supabase/server.ts` (a `admin.ts`,
  proxy klient): žiadny Supabase fetch nemá timeout/AbortSignal. Jedno mŕtve
  keep-alive spojenie = render visí až do undici 300 s. Toto je mechanizmus
  minútových stropov.
- **R-2 [HIGH, acquisition]** `apps/crm/src/app/(dashboard)/acquisition/page.tsx`
  robí VLASTNÝ druhý/tretí `auth.getUser()` + profiles round-trip, plne
  serializovaný pred acquisition selectmi; `load-dashboard.ts` potom robí
  accounts → campaigns → events **sekvenčne**. Presne tu sedí 2-min diera
  z perfgate reportu.
- **R-3 [HIGH, dashboard]** `apps/crm/src/app/(dashboard)/dashboard/DashboardPageClient.tsx:197`
  — 6 sieťových operácií awaitovaných **sekvenčne** (listLeads →
  /api/forecasting/summary → /api/ai/monthly-forecast → auth+profile →
  /api/billing/plan → /api/coaching/insight) za JEDINÝM `isLoading` spinnerom
  (finally). Jedno visiace = celý dashboard visí.
- **R-4 [MEDIUM, both]** `apps/crm/src/proxy.ts:138` — v Next 16 je AKTÍVNY
  middleware `src/proxy.ts` (matcher = všetky non-static cesty);
  `apps/crm/middleware.ts` s matcherom `/api/:path*` je **mŕtvy kód**. Proxy
  awaituje `supabase.auth.getUser()` bez timeoutu na KAŽDEJ stránke aj API
  requeste.
- **R-5 [MEDIUM, both]** `apps/crm/src/lib/profiles/resolve-profile-for-auth.ts`
  — `linkProfileToAuthUser` = ~12+ sekvenčných queries vrátane **UPDATE
  `profiles` na každý request** (tier normalize + `tier_updated_at`). Súbežné
  lambdy (page + /api volania z klienta) → row-lock contention; bez
  lock_timeout môže visieť minúty. Kandidát na zdroj Postgres ERRORS.
- **R-6 [vylúčené]** V render ceste /acquisition NIE JE živé GAQL, žiadny
  self-fetch, žiadne LLM volanie. GoogleAdsClient retry max <1 s. Jediný
  self-fetch v repe je cron pulse healthz.

---

## VLNA P1 — fix lanes (paralelne, disjunktné súbory)

### Dôkaz neprekrytia

| Lane | Zapisuje výhradne do |
|---|---|
| **L30** fetch timeouty | `apps/crm/src/lib/supabase/fetch-timeout.ts` (NOVÝ) · `apps/crm/src/lib/supabase/server.ts` · `apps/crm/src/lib/supabase/admin.ts` · testy `apps/crm/src/lib/supabase/__tests__/fetch-timeout.test.ts` |
| **L31** proxy hardening | `apps/crm/src/proxy.ts` · zmazanie `apps/crm/middleware.ts` (mŕtvy kód) · testy k proxy |
| **L32** acquisition cesta | `apps/crm/src/app/(dashboard)/acquisition/page.tsx` · `apps/crm/src/lib/acquisition/load-dashboard.ts` + testy tamtiež |
| **L33** dashboard klient | `apps/crm/src/app/(dashboard)/dashboard/DashboardPageClient.tsx` + testy |
| **L34** profile chain | `apps/crm/src/lib/profiles/resolve-profile-for-auth.ts` + testy |
| **L35** observabilita + Supabase logy | `docs/reports/2026-08-16-perf-hotfix-diagnostika.md` (NOVÝ) · voliteľne `apps/crm/src/lib/observability/server-timing.ts` (NOVÝ) |

**L30 — Supabase fetch timeout (vetva `fix/supabase-fetch-timeout`):**
Nový helper `fetchWithTimeout(ms)` (wrapper nad global fetch s
`AbortSignal.timeout`, default **8 000 ms**, konfigurovateľné env
`SUPABASE_FETCH_TIMEOUT_MS`). Zapoj do `createClient()` v `server.ts`
a `createServiceRoleClient()` v `admin.ts` cez `global: { fetch: ... }`.
Chybu timeoutu nechaj bublať ako error (page má error.tsx) — fail-fast je
cieľ: **8 s namiesto 300 s**. Unit testy: timeout aborts, normálny prechod,
env override. ŽIADNA zmena query logiky. STOP.

**L31 — proxy middleware (vetva `fix/proxy-auth-timeout`):**
V `src/proxy.ts` obal `auth.getUser()` timeoutom ~5 s (vlastný fetch override
v middleware klientovi). Pri timeoute **fail-open**: pusti request ďalej
(layout aj tak auth re-checkuje a redirectne) + `console.error` s markerom
`[proxy-auth-timeout]` kvôli Vercel logom. Zmaž mŕtvy `apps/crm/middleware.ts`
(Next 16 ho nepoužíva — over `next.config`, žiadny import). Testy: timeout →
request prejde, marker zalogovaný. STOP.

**L32 — /acquisition bez duplicitného auth + paralelné selecty
(vetva `fix/acquisition-render-path`):**
V `page.tsx` NEROB druhý `auth.getUser()` — použi rovnaký per-request pattern
ako layout (React `cache()` helper si lane vytvorí **lokálne v
`load-dashboard.ts`**, nie v zdieľanom súbore, aby sa neprekryl s L30).
V `load-dashboard.ts` spusti accounts/campaigns/events cez `Promise.all`.
Limity a select listy NEMEŇ (tenant-scope pravidlá platia). Ak profile nemá
agency_id, správanie ako doteraz. Testy: mock supabase — 1× auth round-trip,
3 selecty paralelne (assert cez poradie/timing mocku). STOP.
POZOR: `/acquisition` je pomalé AJ na T2 — po fixe over lokálne, či nezostal
ďalší deterministický blocker; ak áno, REPORT (nie improvizácia).

**L33 — dashboard klient paralelne + per-panel render
(vetva `fix/dashboard-client-parallel`):**
V `DashboardPageClient.tsx`: 6 sekvenčných awaitov prepíš na
`Promise.allSettled` skupiny; `isLoading=false` hneď po `listLeads` (hlavný
obsah), ostatné panely nech majú vlastné loading staty a dopĺňajú sa
postupne. Každý klientský `fetch("/api/...")` dostane
`signal: AbortSignal.timeout(10_000)` + catch → panel v error state, stránka
žije. Funkcionalitu panelov NEMEŇ. Testy: existujúce dashboard testy zelené +
nový test, že leads sa vyrenderujú aj keď forecast fetch reject-ne. STOP.

**L34 — profile chain: UPDATE len keď treba (vetva `fix/profile-tier-update-throttle`):**
V `resolve-profile-for-auth.ts`: tier-normalize UPDATE spúšťaj IBA ak sa
hodnoty reálne líšia A `tier_updated_at` je starší ako 1 h (alebo null).
Duplicitný service-role prieskum (`findProfileViaServiceRole` opakuje byAuth /
byLegacyId / byEmail po anon prieskume) zredukuj: ak anon cesta našla profil
s `auth_user_id === userId` a `agency_id`, service-role pass preskoč.
Smolko špeciál-prípady zachovaj 1:1. Testy: existujúce profile testy zelené +
nové: (a) UPDATE sa nevolá pri nezmenených tieroch, (b) service-role skip.
STOP. **Podozrenie: toto je zdroj Postgres 57 ERRORS (write contention).**

**L35 — diagnostika (docs-only + voliteľný helper, vetva `docs/perf-hotfix-diagnostika`):**
(a) Cez Supabase MCP (READ-ONLY, žiadny write) vytiahni Postgres error logy
projektu `ypgajkhqtbriqqmyawyv` za 16.8. 06:00–09:00 UTC — ktoré queries
generovali 57 ERRORS, aké error kódy (deadlock? statement timeout? RLS?).
Ak MCP nie je, napíš do reportu presný kliká-postup pre foundera:
Supabase Dashboard → Logs & Analytics → **Postgres Logs** → Severity=ERROR
→ časové okno 16.8. 06:00–09:00 UTC. (b) Zapíš nálezy do
`docs/reports/2026-08-16-perf-hotfix-diagnostika.md`. (c) Voliteľne pridaj
`server-timing.ts` helper (durationy layout/page fáz do response headers),
ale LEN ak sa zmestíš do limitu PR. STOP.

---

## VLNA P2 — verifikácia (po dobehnutí P1, jeden lane)

**L36 — verify (vetva žiadna — beží nad P1 vetvami, výstup komentáre do PR):**
Pre každý P1 PR: `npm run test` (vitest) dotknutých balíkov, `npm run lint`,
`next build --webpack` musí prejsť. Adverzálne otázky: rozbije timeout 8 s
legitímne dlhé queries (export, bulk)? Rozbije fail-open v proxy security?
(layout re-check je ochrana — over, že layout NAOZAJ redirectuje bez usera).
Nerozbil L33 poradie hydratácie? Výsledky ako checklist do každého PR popisu.
STOP.

## Poradie review pre foundera (ráno/po návrate)

**L30 → L31 → L33 → L32 → L34** (L35/L36 = kontext). Po merge + deploy:
zmeraj T1/T2 na `/dashboard`, `/leads`, `/acquisition` a pozri, či Postgres
ERRORS v Supabase klesli na ~0. Cieľ: T1 < 10 s všade; ak `/acquisition`
zostane pomalé aj po L30+L32, príčina je v DB (RLS plán / lock) — pokračuje
sa podľa L35 diagnostiky.

## Mimo tejto vlny (backlog, nie teraz)

- Supabase Advisor: 8 issues, 4× CRITICAL "Security Definer View"
  (`activity_stream`, `morning_brief_stats`, `arbitrage_stats`,
  `negotiation_briefs`) — samostatná bezpečnostná vlna, nemiešať do perf.
- `/api/nav/permissions`, `/api/crm/tenant-health` volajú celý profile chain —
  kandidát na zjednodušenie po L34.
