# Open PR stack — reprodukcia na aktuálnom `main`

**Dátum:** 2026-09-17  
**`origin/main`:** `6f6381ca04d00b31c24f1cbefc01d052bd3cd784`  
**Metóda:** read-only `git show` / `git grep` / `git merge-base` / `node` assert nad `origin/main`; docs cez EC-001 (`docs/contracts/EC-001-state-claim-verifier.md`).  
**Zákazy dodržané:** žiadny merge, žiadny push do `main`, žiadna migrácia/PROD DB, žiadny close cudzích PR.

## Verdikt (11 riadkov)

| PR | Chyba (claim PR) | Reprodukovaná? | Príkaz (dôkaz) | Verdikt |
|----|------------------|----------------|----------------|---------|
| #537 | `runUnreadNotificationDigest` bez tenant scope + Resend error ignorovaný → wipe unread | **REPRODUKOVANÉ** | `node` assert: digest chunk po `runUnreadNotificationDigest` nemá `.eq('agency_id')`; `git show origin/main:apps/crm/src/lib/infra/notification-delivery.ts` select len `.is("read_at", null)` | **MERGNÚŤ** (0 conflict markers) |
| #486 | HubSpot sync + AI analyze fail-open pri `agency_id = null` | **REPRODUKOVANÉ** | `git grep -n "callerProfile?.agency_id &&" origin/main -- apps/crm/src/app/api/integrations/hubspot/sync/route.ts apps/crm/src/app/api/ai/call/analyze/route.ts` → 2 hits | **MERGNÚŤ** (0 conflict markers) |
| #447 | `POST /api/invite` upsert bez `agency_id` | **REPRODUKOVANÉ** | `git show origin/main:apps/crm/src/app/api/invite/route.ts` — `select("role")`, upsert bez `agency_id` | **MERGNÚŤ** (0 conflict markers) |
| #369 | `/upgrade` číta nested `d.data` / `data.data.result.url` vs `okResponse` spread | **REPRODUKOVANÉ** | `git show 'origin/main:apps/crm/src/app/(dashboard)/upgrade/page.tsx'` obsahuje `d.ok && d.data` + `data.data?.result?.url`; `okResponse` = `{ ok:true, ...data }` | **MERGNÚŤ** po rebase (1 conflict: `billing-credits.verification.test.ts`) |
| #374 | credits-cycle retry wipe nového grantu | **NEREPRODUKOVANÉ** | `git grep -n "refuse expire: current-period grant already applied" origin/main -- apps/crm/src/lib/credits/grant-engine.ts` → hit; landed ako `#452` `76bb31080` | **ZAVRIEŤ** |
| #358 | dead-export check + baseline (chore) | **REPRODUKOVANÉ** (chýba artefakt) | `git cat-file -e origin/main:apps/crm/scripts/find-dead-exports.mjs` → exit 128; CI už referencuje súbor cez `hashFiles` | **MERGNÚŤ** (0 conflict markers) |
| #304 | `/reset-password?code=` client PKCE exchange | **REPRODUKOVANÉ** | `git show origin/main:apps/crm/src/app/reset-password/page.tsx` stále `exchangeCodeForSession(code)`; PR mení na redirect `/auth/callback?code=` | **MERGNÚŤ** (0 conflict markers; rebase 303 behind) |
| #480 | docs: 3 HIGH (HubSpot, analyze, cron `Bearer undefined`) | **ČIASTOČNE** — 1–2 áno, 3 nie | Claims 1–2: rovnaký `callerProfile?.agency_id &&` ako #486. Claim 3: `onboarding-dispatch`/`agency-scraping`/`arbitrage-scan`/`price-trail-sync` už `isAuthorizedCronBearer` (#503 `43e59bafc`) | **ZAVRIEŤ** (stale claim 3; 1–2 = #486) |
| #441 | docs ZISTI: žiadny GPT Sol↔Opus5 autonomous comms artefakt | **N/A bug**; claim **CONFIRMED** | `git grep` na `origin/main` nenašiel operational comms SSOT; report nie je na main (exit 128). Draft contract je len v otvorenom #442 | **NEISTÉ** (archív; 0 produktovej hodnoty) |
| #357 | docs: `.cursor/rules/revolis-incidents.mdc` | **REPRODUKOVANÉ** (súbor chýba) | `git cat-file -e origin/main:.cursor/rules/revolis-incidents.mdc` → exit 128; migrácia `ai_generations` na main na rule odkazuje | **MERGNÚŤ** |
| #366 | docs: listing-gen bez `is_sandbox` parity | **CONFIRMED** (tvrdenia stále platia) | `git show origin/main:apps/crm/supabase/migrations/20260803120000_ai_generations.sql` — stĺpec `is_sandbox` chýba; `listing-content` stále `saveGeneration` | **MERGNÚŤ** (docs still accurate) |

## Node assert (spustené 2026-09-17)

```text
REPRO_OR_PRESENT   #447 upsert lacks agency_id
REPRO_OR_PRESENT   #486 hubspot fail-open
REPRO_OR_PRESENT   #486 analyze fail-open
REPRO_OR_PRESENT   #537 no agency eq on digest
REPRO_OR_PRESENT   #369 upgrade uses d.data
REPRO_OR_PRESENT   #369 okResponse spreads
REPRO_OR_PRESENT   #304 client exchangeCode
REPRO_OR_PRESENT   #374 refuse expire present   ← fix už na main
```

## EC-001 poznámky (docs)

- **#480 claim 3** → `CONTRADICTED` voči `origin/main` (helper `apps/crm/src/lib/cron-auth.ts` + citované routy).
- **#366** → `CONFIRMED` (schema + write path stále bez sandbox flagu).
- **#441** → `CONFIRMED` ako negatívny nález v SSOT; merge je preferencia foundera, nie nutnosť opravy.
- **#357 I-01** historický incident: `spendCredits` už má call-site cez `spendForAction` (`listing-content`, `property-launch-pack`). Rule ako katalóg minulých incidentov ostáva užitočná; nie je to runtime fix.

## Behind counts (po `git fetch`)

| PR | behind `origin/main` | ahead |
|----|----------------------|-------|
| 537 | 6 | 3 |
| 486 | 5 | 5 |
| 447 | 7 | 2 |
| 369 | 221 | 1 |
| 374 | 217 | 1 |
| 358 | 221 | 3 |
| 304 | 303 | 1 |
| 480 | 5 | 3 |
| 441 | 7 | 2 |
| 357 | 221 | 1 |
| 366 | 221 | 1 |

## Čo agent neurobil

- Nemergoval, nezatvoril PR, nepushol do cudzej vetvy.
- Nespúšťal migrácie / zápis do PROD DB.
- Runtime HTTP repro (živé Stripe / Resend / invite email) = **unknown** (vyžaduje secrets/prostredie); statický dôkaz na `origin/main` stačí na verdikt REPRO/NEREPRO podľa MUST.
