# Acquisition OS Stage 0 PASS report

**Dátum:** 2026-08-15
**Vetva tohto PR:** `feat/acquisition-s07-dashboard`
**Kill deadline Stage 0:** 2026-08-31
**Test MCC:** `7024414113` (guard). Child účty: RK A `3726370609`, RK B `2272781649`.
**Demo agency:** `b101361c-e250-4c43-b099-52c4febeb450`
**Connect account:** `40a02a8e-7e31-439e-aecd-11aec040b2a2`
**Pravidlo:** polozka bez dokazu = nesplnena. Ziadne secrets v tomto subore.

## Verdikt

**PASS s otvorenými závislosťami.** Sandbox loop (connect, tenant scope, webhook `is_test`, read-only live sync, dashboard) je dokázaný. Stage 1 sa nespúšťa.

Otvorene pred tvrdenim "Stage 0 zatvorený":

1. Produktový `GoogleAdsClient.search()` na `main` stále volá `POST /v25/customers/{id}:search` (HTML 404). Oprava je **PR #413** (`googleAds:search` + date filter na search terms). Live sync 15.8.2026 isiel cez oficiálnu cestu v one-off runneri, nie cez produktový client.
2. V CRM nie su tabulky pre ad groups / keywords / search terms / metrics. Tie workery su overene in-memory + testami, nie persistenciou.
3. `GOOGLE_ADS_*` credentials su Preview-only. Production webhook kluc bol po hosted 200 zmazany. Dashboard na Production cita DB, nesaha na Google Ads API.

## DoD checklist (blueprint §11)

| Položka | Stav | Dokaz |
|---|---|---|
| OAuth connect funguje | PASS | `docs/reports/2026-08-17-stage0-smoke.md`: `POST /api/acquisition/google/connect` → 200, `PENDING`, Demo + `customer_id=7024414113`. Druhy connect → 409 unique. |
| credential sa uloží encrypted | PASS s vyhradou | Stage 0 vault = Vercel env / `.env.local`, DB drzi len `credential_ref=env:GOOGLE_ADS_SA_KEY_JSON`. Nie KMS. Response connect/accounts/dashboard **neobsahuje** `credential_ref` ani SA JSON (`containsGoogleAdsSecret`, accounts test, dashboard test). |
| test MCC sa identifikuje | PASS | Connect aj webhook lookup via `acquisition_accounts.customer_id=7024414113`. Seed guard `scripts/seed-test-campaigns.ts` pusti len tento MCC. |
| customer_id sa nikdy neberie z client payload | PASS | Connect schema ignoruje `agency_id` / `customer_id` / `manager_customer_id`. Smoke payload mal zámerne cudzi UUID + `9998887777`; v DB ostal Demo + `7024414113`. Dashboard GET nema searchParams. |
| sync campaign funguje | PASS | Library `syncGoogleCampaigns` + testy. Live 15.8.: RK A fetched 1 / upserted 1 (`24134657673` RKA-test-byty PAUSED); RK B fetched 1 / upserted 1 (`24134894838` RKB-test-domy PAUSED). Store vtedy in-memory. Display persist do `acquisition_campaigns` 15.8. (rovnake ID, nie Google write). |
| sync ad group funguje | PASS (in-memory) | Live: 1 ad group na RK A aj RK B. Žiadna DB tabuľka. |
| sync keyword funguje | PASS (in-memory) | Live: RK A 50 keyword riadkov (pre-existing kampaň), RK B 4. Žiadna DB tabuľka. |
| sync search terms funguje | FAIL na `main` / PASS v #413 | Live 15.8. na produkte: HTTP 400 `EXPECTED_FILTERS_ON_DATE_RANGE`. Fix `WHERE segments.date DURING LAST_7_DAYS` je v PR #413, nemergnuty. |
| metrics sync funguje | PASS (prázdne serving) | Live `LAST_7_DAYS`: 0 riadkov. Očakávané: test MCC neservuje, kampane PAUSED. |
| agency A — iba A data | PASS | Live store: RK A neobsahuje `24134894838`. Dashboard API test: agency-a nevidi agency-b. RLS policy `acquisition_*_tenant`. |
| agency B — iba B data | PASS | Live: RK B neobsahuje `24134657673`. Dashboard API test: tenant B len B riadky. |
| cross-tenant attack — 403 / no data | PASS | Connect/accounts bez session → 401. RLS test `blocks cross-tenant reads` (local harness). Composite FK mismatch rejected. |
| duplicate sync — idempotentny | PASS | Campaign upsert unique `(provider, provider_campaign_id)`. Webhook unique `(agency_id, provider, provider_event_id, event_type)` — rls test dedupes. |
| failed API call — retry | PASS | `GoogleAdsClient.request` retry na 408/425/429/5xx, `computeBackoffMs`. Unit testy clienta. |
| API rate limit — backoff | PASS | Rovnaky client: 429 retry + exponential backoff, `DEFAULT_INITIAL_BACKOFF_MS=200`. |
| žiadny write do Google Ads | PASS | Client exponuje `request` + `search`, nie mutate. Seed zapisoval len do test MCC a vsetky kampane PAUSED (`docs/reports/2026-08-15-seed-test-campaigns.md`). Dashboard/API su read-only. |
| audit log funguje | PASS | `GET /api/acquisition/audit-log` (session). Webhook eventy v `acquisition_events` (3× `LOGGED_TEST` 15.8.). |
| credentials nie su v logoch | PASS | `credentials.ts`: never log secret values. Smoke leak scan: ziadny `BEGIN PRIVATE KEY` / developer token. Dashboard select list bez `credential_ref` a bez event `metadata`. |
| credentials nie su v LLM context | PASS | SA JSON je private field; public meta ma len `hasServiceAccountKey` boolean. Ziadny Stage 0 kod neposiela `saKeyJson` do LLM. |
| webhook `is_test=true` | PASS | Handler + hosted Production 15.8.: HTTP 200 `LOGGED_TEST`, `lead_id=null`, `leads.count` ostalo 480. Event `stage0-prod-1786811631390`. Zly kluc → 401. Allowlist #412. Po smoku `vercel env rm GOOGLE_ADS_WEBHOOK_KEY production`. |
| Dashboard: zobraziť syncnuté data z testovacieho účtu | PASS v tomto PR | `GET /api/acquisition/dashboard` + page `/acquisition`. Ucet `7024414113`, kampane `RKA-test-byty` / `RKB-test-domy` (display persist z live sync). 3 test webhook eventy. Spend/CPL/ROI sa **nezobrazuju** (neboli namerane). |

## Roadmap checkboxy (mimo DoD boxu)

| Položka | Stav | Dokaz |
|---|---|---|
| Google Test MCC + test client accounts | PASS | Seed report; child ucty RK A/B. |
| Service account flow + vault | PASS s vyhradou | SA env, nie user OAuth; pointer v DB. |
| DB tabulky accounts / campaigns / events | PASS | Existuju v `ypgajkhqtbriqqmyawyv`. Composite FK `(agency_id, acquisition_account_id)`. |
| Composite FKs | PASS | `acquisition_campaigns_agency_id_acquisition_account_id_fkey`. RLS test mismatch. |
| Read-only sync campaign/ad group/keyword/search term/metrics | PARTIAL | Campaign + ad group + keyword + metrics live. Search terms FAIL na main (#413). |
| Test webhook plumbing | PASS | #409 + #412 + Production 200. |
| Supabase RLS tenant isolation | PASS | Policies `acquisition_accounts_tenant`, `acquisition_campaigns_tenant`, `acquisition_events_tenant` (`polcmd=*`). Test harness v `acquisition-core-rls.test.ts`. |
| Audit log kazdy sync | PARTIAL | Webhook eventy ano. HTTP/cron sync job neexistuje, takze sync audit trail je live-sync report, nie `acquisition_events` per worker. |

## Dashboard (tento PR)

- API: `GET /api/acquisition/dashboard` — session `getUser`, `agency_id` z `profiles`, RLS.
- UI: `/acquisition` (dashboard layout), nav **Google Ads (test)** pre owner.
- Nie je v `PUBLIC_PATHS` / `BYPASS_PREFIXES` (verification test).
- Display persist kampani: insert dvoch Google campaign ID z live sync do `acquisition_campaigns`. To **nie je** produktovy HTTP sync worker a **nie je** Google Ads write.

## Co toto NIE je

- Stage 1 (reálny RK, serving, conversion upload).
- Merge #413.
- Merge `chore/stage0-smoke`.
- Návrat `GOOGLE_ADS_WEBHOOK_KEY` do Production.
- Generic marketing dashboard so spend/ROI číslami.

## PRs

| PR | Stav | Role |
|---|---|---|
| #409 lead-webhook | merged | `is_test` plumbing |
| #411 evidence docs | merged | seed / webhook / live-sync reporty |
| #412 allowlist | merged | Production hosted 200 |
| #413 search URL + date filter | OPEN | blokuje produktovy search() a search-terms |
| toto (S0.7) | tento PR | dashboard + tento report |