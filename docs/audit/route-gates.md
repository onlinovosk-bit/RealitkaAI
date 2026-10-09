# Brány API trás — inventár (WP-4 ROUTE-GATES)

> Vygenerované skriptom `scripts/ops/route-gates.mjs` (deterministický, bez LLM, bez siete). **Needitovať ručne.**

## Pôvod a prepočet

- Zdrojový commit: `e9ece0f` (dátum commitu 2026-10-09).
- Prepočet (z koreňa repa):

```bash
node scripts/ops/route-gates.mjs --out docs/audit/route-gates.md
```

- Vstupy: `apps/crm/src/app/api/**/route.ts` a `apps/crm/src/proxy.ts`. Rovnaký vstup dáva rovnaký výstup (dátum je dátum commitu, nie hodiny).

## Čo skript NEDOKAZUJE

Je to **heuristika nad textom zdrojákov**. Skript len nájde *rozpoznanú* bránu (volanie/import z fixného zoznamu mien). Nedokazuje:

- že brána je **správna** (napr. že výsledok `getUser()` sa naozaj skontroluje na `null` a vráti 401),
- že je **fail-closed** (pri chýbajúcom env/secrete, pri výnimke, pri timeoute),
- že **tenant filter** (`agency_id`, `sameAgency`, …) je aplikovaný na *každý* dotaz a cestu v handleri — `GATED-TENANT` znamená len „v handleri je session signál aj tenant signál“,
- že kód beží v PROD ani že PROD zodpovedá tomuto commitu (nič nehovorí o zatvorených/otvorených cestách v produkcii),
- že `GATED-SESSION (proxy-only)` je bezpečné: session vynucuje len `proxy.ts` (matcher + `getUser()`), v trase žiadna kontrola — pri service-role klientovi je to jediná obrana,
- správnosť dôvodov pri `PUBLIC-BY-DESIGN` (dôvod je z komentárov `proxy.ts` / názvu cesty, nie overený).

Overenie správnosti brán je **manuálna práca P14**. `UNKNOWN` = skript nevie rozhodnúť (nenájdený handler, wrapper/re-export, alebo len slabý náznak brány); **nikdy sa nezaokrúhľuje na GATED**. Slabosť metód: ak má trasa viac metód, kategória trasy je kategória *najslabšej* metódy (stĺpec „Metódy“ ukazuje všetky).

Ako číta proxy: `PUBLIC_PATHS` + `/api/healthz*` = bez session; `/api/agents*`, `/api/cron/*`, `/api/followup`, `/api/inbound/gmail-pull`, `/api/scoring*` (cron), `/api/webhooks*`, importy `realvia`/`uc`/`realsoft`, 410 shimy a odstránené cesty **obchádzajú session** (potrebujú vlastnú bránu v trase). Všetky ostatné `/api/*` trasy dostanú od proxy 401 bez prihláseného usera.

## Súhrn podľa kategórie

Počet trás (`route.ts`): **232**

| Kategória | Počet |
|---|---:|
| GATED-TENANT | 53 |
| GATED-SESSION | 105 |
| GATED-SECRET | 45 |
| PUBLIC-BY-DESIGN | 18 |
| GONE | 5 |
| UNGATED | 3 |
| UNKNOWN | 3 |

Z toho `GATED-SESSION` výlučne cez proxy (bez kontroly v trase): **29**.

### Kategória × režim proxy

| Kategória | bypass:410-shim | bypass:cron | bypass:import | bypass:webhook | public | session |
|---|---:|---:|---:|---:|---:|---:|
| GATED-TENANT | 0 | 0 | 0 | 0 | 0 | 53 |
| GATED-SESSION | 0 | 1 | 0 | 0 | 0 | 104 |
| GATED-SECRET | 0 | 32 | 0 | 2 | 0 | 11 |
| PUBLIC-BY-DESIGN | 0 | 0 | 0 | 0 | 18 | 0 |
| GONE | 2 | 1 | 0 | 0 | 0 | 2 |
| UNGATED | 0 | 0 | 3 | 0 | 0 | 0 |
| UNKNOWN | 0 | 0 | 0 | 1 | 0 | 2 |

## Zosúladenie čísel „27/40“ a „28/40“

Skript naráta **232** súborov `route.ts`; z nich **203** má rozpoznanú bránu (GATED-*), **18** je verejných podľa dizajnu, **5** je 410, **3** je UNGATED a **3** UNKNOWN. Zoznam „40 ciest“ v repe neexistuje, takže čitateľ 27 (decisions.md) ani 28 (STATUS) sa tu **nedá zreprodukovať** — definícia „40“ je NEZNÁMA. Tento dokument nerobí žiadne tvrdenie o stave ciest v PROD.

## UNGATED a UNKNOWN podľa rizika

Riziko = súčet váh nad celým súborom trasy: odosielanie 5, platby 5, service-role 4, DB-zápis 3, mutácia 2, mutujúca HTTP metóda 1, AI/náklady 1, ext-fetch 1. Je to len triedenie, nie hodnotenie závažnosti.

| # | Riziko | Cesta | Kategória | Metódy | Proxy | Rizikové znaky | Poznámka |
|--:|--:|---|---|---|---|---|---|
| 1 | 7 | `/api/starter-pack/download` | UNKNOWN | GET | session | platby, mutácia | GET: slabý náznak brány bez rozpoznanej: verifyStarterPackDownloadToken, searchParams.get("token" |
| 2 | 5 | `/api/billing/checkout-config` | UNKNOWN | GET | session | platby | GET: slabý náznak brány bez rozpoznanej: STRIPE_WEBHOOK_SECRET |
| 3 | 1 | `/api/realsoft/import` | UNGATED | GET,POST | bypass:import | - | GET: proxy bypass:import nevynucuje session a v trase nie je rozpoznaná brána; POST: proxy bypass:import nevynucuje session; request sa deleguje do importovanej funkcie (handleUcImportPost(request), brána môže byť tam, skript to nevie |
| 4 | 1 | `/api/realvia/import` | UNGATED | GET,POST | bypass:import | - | GET: proxy bypass:import nevynucuje session a v trase nie je rozpoznaná brána; POST: proxy bypass:import nevynucuje session; request sa deleguje do importovanej funkcie (validateRequest(req), brána môže byť tam, skript to nevie |
| 5 | 1 | `/api/uc/import` | UNGATED | GET,POST | bypass:import | - | GET: proxy bypass:import nevynucuje session a v trase nie je rozpoznaná brána; POST: proxy bypass:import nevynucuje session; request sa deleguje do importovanej funkcie (handleUcImportPost(request), brána môže byť tam, skript to nevie |
| 6 | 1 | `/api/webhooks/realvia` | UNKNOWN | GET,POST | bypass:webhook | - | POST: proxy bypass:webhook nevynucuje session; request sa deleguje do importovanej funkcie (validateRequest(request), brána môže byť tam, skript to nevie |

## Sledovať: session len cez proxy + service-role / odosielanie / platby

Trasy bez kontroly session v samotnej trase, ktoré sa spoliehajú výlučne na `proxy.ts` a zároveň používajú service-role klienta, odosielanie alebo platby. Nie sú UNGATED, ale pri chybe v proxy (matcher, výnimka) nemajú druhú líniu.

| Riziko | Cesta | Metódy | Rizikové znaky |
|--:|---|---|---|
| 20 | `/api/neighborhood-watch/subscribe` | POST | odosielanie, platby, service-role, DB-zápis, mutácia |
| 12 | `/api/acquisition/google/connect` | GET,POST | platby, DB-zápis, mutácia, AI/náklady |
| 8 | `/api/billing/checkout` | POST | platby, mutácia |
| 8 | `/api/billing/credits/checkout` | POST | platby, mutácia |
| 8 | `/api/billing/portal` | POST | platby, mutácia |
| 6 | `/api/l99/bri` | POST | platby |
| 6 | `/api/neighborhood-watch/alerts` | GET | service-role, mutácia |
| 6 | `/api/observability/probes` | GET | platby, ext-fetch |

## PUBLIC-BY-DESIGN (v PUBLIC_PATHS)

| Cesta | Metódy | Dôvod (nie overený) | Brány v trase | Poznámka |
|---|---|---|---|---|
| `/api/acquire/email` | POST | príjem akvizičného e-mailu | secret:timingSafeEqual; tenant:agency_id+agencyId | - |
| `/api/acquisition/google/lead-webhook` | GET,POST | webhook Google lead formulára | - | GET: proxy public nevynucuje session a v trase nie je rozpoznaná brána; POST: slabý náznak brány bez rozpoznanej: headers.get("x-google-key", GOOGLE_ADS_WEBHOOK_KEY |
| `/api/billing/webhook` | POST | webhook platobnej brány (autentifikácia podpisom v trase) | secret:verifyStripeWebhook | - |
| `/api/concierge/callback` | POST | widget na webe klienta (proxy.ts komentár: CONCIERGE_SHARED_SECRET) | secret:conciergeSecretOk; tenant:agency_id+agencyId | - |
| `/api/concierge/freebusy` | GET | widget na webe klienta (proxy.ts komentár: CONCIERGE_SHARED_SECRET) | secret:conciergeSecretOk; tenant:agencyId | - |
| `/api/concierge/properties` | GET | widget na webe klienta (proxy.ts komentár: CONCIERGE_SHARED_SECRET) | secret:conciergeSecretOk; tenant:agency_id+agencyId | - |
| `/api/demo/capture-lead` | POST | verejný demo formulár (akvizícia) | - | POST: slabý náznak brány bez rozpoznanej: headers.get("x-api-key" |
| `/api/demo/estimate` | POST | verejný demo odhad (akvizícia) | - | POST: proxy public nevynucuje session a v trase nie je rozpoznaná brána; verejná trasa bez rozpoznaného secretu/session/rate-limitu |
| `/api/demo/prefill-links` | POST | verejný demo helper (akvizícia) | - | POST: slabý náznak brány bez rozpoznanej: headers.get("x-demo-admin-token" |
| `/api/demo/request` | POST | verejný demo formulár (akvizícia) | - | POST: proxy public nevynucuje session a v trase nie je rozpoznaná brána |
| `/api/healthz` | GET | liveness/health probe | - | GET: proxy public nevynucuje session a v trase nie je rozpoznaná brána; verejná trasa bez rozpoznaného secretu/session/rate-limitu |
| `/api/integrations/google/callback` | GET | OAuth redirect z Google (volá prehliadač bez našej session) | - | GET: slabý náznak brány bez rozpoznanej: verifyGoogleOAuthState, GOOGLE_OAUTH_CLIENT_SECRET |
| `/api/leads/inbound` | POST | príjem leadov z externých zdrojov | - | POST: proxy public nevynucuje session a v trase nie je rozpoznaná brána |
| `/api/onboarding/session` | GET,POST,PUT | verejný onboarding wizard (proxy.ts komentár: Founder GO 2026-09-17; session_id + rate-limit v trase) | - | GET: proxy public nevynucuje session a v trase nie je rozpoznaná brána; POST: proxy public nevynucuje session; request sa deleguje do importovanej funkcie (validateBody(request), brána môže byť tam, skript to nevie; PUT: proxy public nevynucuje session a v trase nie je rozpoznaná brána |
| `/api/proof` | POST | verejná proof stránka/dáta | - | POST: proxy public nevynucuje session; request sa deleguje do importovanej funkcie (validateBody(request), brána môže byť tam, skript to nevie |
| `/api/valuation/estimate` | POST | verejný odhad nehnuteľnosti | - | POST: proxy public nevynucuje session a v trase nie je rozpoznaná brána |
| `/api/valuation/submit` | POST | verejný odhad nehnuteľnosti (lead capture) | - | POST: proxy public nevynucuje session a v trase nie je rozpoznaná brána |
| `/api/webhooks/hubspot` | POST | webhook HubSpot (podpis v trase) | secret:timingSafeEqual+createHmac+verifyHubSpotSignature | - |

## Úplná tabuľka

| Cesta | Metódy | Kategória | Proxy | Dôkaz brány | Rizikové znaky |
|---|---|---|---|---|---|
| `/api/acquire/email` | POST | PUBLIC-BY-DESIGN | public | secret:timingSafeEqual; tenant:agency_id+agencyId | DB-zápis, mutácia |
| `/api/acquisition/audit-log` | GET | GATED-TENANT | session | session:getUser; tenant:agency_id+agencyId | mutácia, AI/náklady |
| `/api/acquisition/dashboard` | GET | GATED-TENANT | session | session:getUser; tenant:agency_id+agencyId | mutácia, AI/náklady |
| `/api/acquisition/google/accounts` | GET | GATED-TENANT | session | session:getUser; tenant:agency_id+agencyId | platby, mutácia, AI/náklady |
| `/api/acquisition/google/connect` | GET:GATED-SESSION, POST:GATED-TENANT | GATED-SESSION | session | session:proxy-only; session:getUser; tenant:agency_id+agencyId | platby, DB-zápis, mutácia, AI/náklady |
| `/api/acquisition/google/lead-webhook` | GET:UNGATED, POST:UNKNOWN | PUBLIC-BY-DESIGN | public | - | DB-zápis, mutácia, AI/náklady |
| `/api/activities` | GET | GATED-SESSION | session | session:getUser | mutácia |
| `/api/agents/cleaner` | GET | GATED-SECRET | bypass:cron | secret:revolisGuard | DB-zápis, mutácia |
| `/api/agents/competitor-watch` | GET | GATED-SECRET | bypass:cron | secret:revolisGuard | - |
| `/api/agents/deal-trigger` | GET,POST | GATED-SECRET | bypass:cron | secret:revolisGuard; secret:authorizeCronBearer+CRON_SECRET | service-role, mutácia |
| `/api/agents/social-scout` | POST | GATED-SECRET | bypass:cron | secret:revolisGuard | DB-zápis, mutácia |
| `/api/ai/autopilot/run` | POST | GATED-SESSION | session | session:getUser | mutácia |
| `/api/ai/bri-stream` | GET | GATED-SESSION | session | session:getUser | mutácia |
| `/api/ai/call-coach/stream` | POST | GATED-TENANT | session | session:getUser; tenant:agency_id+agencyId | mutácia |
| `/api/ai/call/analyze` | POST | GATED-TENANT | session | session:getUser; tenant:sameAgency+agency_id | service-role, mutácia |
| `/api/ai/call/transcribe` | POST | GATED-SESSION | session | session:getUser | mutácia, AI/náklady |
| `/api/ai/closing-window/recompute` | POST | GATED-SESSION | session | session:getUser | DB-zápis, mutácia |
| `/api/ai/dead-lead-campaign` | GET:GATED-SESSION, POST:GATED-TENANT | GATED-SESSION | session | session:getUser; tenant:agency_id+agencyId | mutácia |
| `/api/ai/decision/recompute-queue` | POST | GATED-SESSION | session | session:getUser | mutácia |
| `/api/ai/decision/score-lead` | POST | GATED-SESSION | session | session:getUser | DB-zápis, mutácia |
| `/api/ai/insights` | GET | GATED-TENANT | session | session:getCurrentProfile; tenant:agency_id | mutácia |
| `/api/ai/lead-events` | POST | GATED-TENANT | session | session:getCurrentProfile; tenant:agency_id+agencyId | DB-zápis, mutácia |
| `/api/ai/listing-content` | POST | GATED-TENANT | session | session:getUser; tenant:agency_id+agencyId | platby, DB-zápis, mutácia |
| `/api/ai/listing-content/generations` | GET | GATED-TENANT | session | session:getUser; tenant:agency_id+agencyId | mutácia, AI/náklady |
| `/api/ai/listing-content/generations/[id]` | PATCH | GATED-TENANT | session | session:getUser; tenant:agency_id+agencyId | mutácia, AI/náklady |
| `/api/ai/listing-content/stream` | POST | GATED-SESSION | session | session:getUser | mutácia |
| `/api/ai/micro-actions/schedule` | POST | GATED-SESSION | session | session:getUser | DB-zápis, mutácia |
| `/api/ai/monthly-forecast` | GET | GATED-SESSION | session | session:getUser | mutácia |
| `/api/ai/process-lead` | POST | GATED-TENANT | session | session:getCurrentProfile; tenant:agency_id+agencyId | mutácia |
| `/api/ai/property-launch-pack` | POST | GATED-TENANT | session | session:getUser; tenant:agency_id+agencyId | platby, DB-zápis, mutácia, AI/náklady |
| `/api/ai/rescue/trigger` | POST | GATED-SESSION | session | session:getUser | DB-zápis, mutácia |
| `/api/analytics/demand-signals` | POST | GATED-SESSION | session | session:getUser | DB-zápis, mutácia |
| `/api/analytics/heatmap` | GET | GATED-SECRET | session | secret:isAuthorizedCronBearer | service-role, mutácia |
| `/api/analytics/revenue-telemetry` | POST | GATED-SESSION | session | session:getCurrentProfile | - |
| `/api/analytics/upgrade-intent` | POST | GATED-SESSION | session | session:getCurrentProfile | - |
| `/api/arbitrage` | GET,PATCH | GATED-SESSION | session | session:getUser | DB-zápis, mutácia |
| `/api/arbitrage/analyze` | POST | GATED-SESSION | session | session:getUser | mutácia |
| `/api/auth/login` | POST | GATED-SESSION | session | session:proxy-only | mutácia |
| `/api/automation/rules` | GET,POST | GATED-TENANT | session | session:getUser+requireCallerAgency; tenant:requireCallerAgency+agency_id+agencyId | mutácia |
| `/api/automation/rules/[id]` | PATCH,DELETE | GATED-TENANT | session | session:getUser+requireCallerAgency; tenant:requireCallerAgency+assertRuleOwned+agency_id+agencyId | mutácia |
| `/api/billing/checkout` | POST | GATED-SESSION | session | session:proxy-only | platby, mutácia |
| `/api/billing/checkout-config` | GET | UNKNOWN | session | - | platby |
| `/api/billing/credits/checkout` | POST | GATED-SESSION | session | session:proxy-only | platby, mutácia |
| `/api/billing/plan` | GET | GATED-SESSION | session | session:getUser | platby, mutácia |
| `/api/billing/portal` | POST | GATED-SESSION | session | session:proxy-only | platby, mutácia |
| `/api/billing/redeem-code` | POST | GATED-TENANT | session | session:getCurrentProfile; tenant:agency_id+agencyId | - |
| `/api/billing/webhook` | POST | PUBLIC-BY-DESIGN | public | secret:verifyStripeWebhook | platby |
| `/api/call-script` | POST | GATED-TENANT | session | session:getUser; tenant:agency_id+agencyId | mutácia, AI/náklady |
| `/api/ceo-command` | GET | GATED-TENANT | session | session:getUser+resolveProfileForAuthUser; tenant:agency_id+agencyId | mutácia |
| `/api/ceo-command/[id]/read` | POST | GATED-TENANT | session | session:getUser+resolveProfileForAuthUser; tenant:sameAgency+agency_id | mutácia |
| `/api/coaching/insight` | GET | GATED-SESSION | session | session:getUser | mutácia |
| `/api/concierge/callback` | POST | PUBLIC-BY-DESIGN | public | secret:conciergeSecretOk; tenant:agency_id+agencyId | DB-zápis, mutácia |
| `/api/concierge/freebusy` | GET | PUBLIC-BY-DESIGN | public | secret:conciergeSecretOk; tenant:agencyId | - |
| `/api/concierge/properties` | GET | PUBLIC-BY-DESIGN | public | secret:conciergeSecretOk; tenant:agency_id+agencyId | mutácia |
| `/api/crm/tenant-health` | GET | GATED-SESSION | session | session:getUser | mutácia |
| `/api/cron/agency-scraping` | POST | GATED-SECRET | bypass:cron | secret:isAuthorizedCronBearer | service-role, mutácia |
| `/api/cron/arbitrage-scan` | GET | GATED-SECRET | bypass:cron | secret:isAuthorizedCronBearer | DB-zápis, mutácia |
| `/api/cron/auto-tune` | POST | GATED-SECRET | bypass:cron | secret:CRON_SECRET | - |
| `/api/cron/bri-snapshot` | GET | GATED-SECRET | bypass:cron | secret:CRON_SECRET | DB-zápis, mutácia |
| `/api/cron/credits-cycle` | GET | GATED-SECRET | bypass:cron | secret:CRON_SECRET; tenant:agencyId | - |
| `/api/cron/credits-expire` | GET | GATED-SECRET | bypass:cron | secret:CRON_SECRET | mutácia |
| `/api/cron/credits-grant` | GET | GATED-SECRET | bypass:cron | secret:CRON_SECRET | mutácia |
| `/api/cron/customer-health` | GET | GATED-SECRET | bypass:cron | secret:CRON_SECRET; tenant:agencyId | service-role, mutácia |
| `/api/cron/daily-match` | GET | GATED-SECRET | bypass:cron | secret:authorizeCron+CRON_SECRET | - |
| `/api/cron/dashboard-insights` | GET | GATED-SECRET | bypass:cron | secret:CRON_SECRET; tenant:agencyId | service-role, mutácia |
| `/api/cron/demo-brief` | GET | GATED-SECRET | bypass:cron | secret:CRON_SECRET | service-role, DB-zápis, mutácia |
| `/api/cron/demo-recap` | GET | GATED-SECRET | bypass:cron | secret:CRON_SECRET | service-role, DB-zápis, mutácia |
| `/api/cron/follow-up-sweep` | GET | GATED-SECRET | bypass:cron | secret:CRON_SECRET; tenant:agency_id+agencyId | service-role, DB-zápis, mutácia |
| `/api/cron/guardian-digest` | GET | GATED-SECRET | bypass:cron | secret:CRON_SECRET; tenant:agencyId | service-role, mutácia |
| `/api/cron/guardian-run` | GET | GATED-SECRET | bypass:cron | secret:CRON_SECRET; tenant:agencyId | service-role, mutácia |
| `/api/cron/heartbeat-check` | GET | GATED-SECRET | bypass:cron | secret:CRON_SECRET | service-role, mutácia |
| `/api/cron/lead-ai-triage` | GET | GATED-SECRET | bypass:cron | secret:CRON_SECRET; tenant:agency_id | service-role, DB-zápis, mutácia, AI/náklady |
| `/api/cron/morning-brief` | GET | GATED-SECRET | bypass:cron | secret:CRON_SECRET | service-role, mutácia |
| `/api/cron/night-watch` | GET | GATED-SECRET | bypass:cron | secret:revolisGuard | mutácia |
| `/api/cron/notification-digest` | GET | GATED-SECRET | bypass:cron | secret:CRON_SECRET; tenant:agencyId | service-role, mutácia |
| `/api/cron/onboarding-dispatch` | POST | GATED-SECRET | bypass:cron | secret:isAuthorizedCronBearer | - |
| `/api/cron/price-trail-sync` | GET | GATED-SECRET | bypass:cron | secret:isAuthorizedCronBearer | mutácia |
| `/api/cron/pulse` | GET | GATED-SECRET | bypass:cron | secret:CRON_SECRET | - |
| `/api/cron/realvia-process` | GET | GATED-SECRET | bypass:cron | secret:CRON_SECRET | - |
| `/api/cron/recompute-bri` | GET | GATED-SECRET | bypass:cron | secret:CRON_SECRET | service-role, mutácia |
| `/api/cron/seller-rescue` | GET:GATED-SECRET, POST:GATED-TENANT | GATED-SECRET | bypass:cron | secret:CRON_SECRET; tenant:agency_id+agencyId; session:getUser+resolveProfileForAuthUser | service-role, DB-zápis, mutácia |
| `/api/cron/stealth-recruiter-ingest` | GET | GONE | bypass:cron | 410 | service-role, DB-zápis, mutácia |
| `/api/daily-actions` | GET | GATED-SESSION | session | session:getUser | mutácia |
| `/api/dashboard/insights` | POST | GATED-TENANT | session | session:getCurrentProfile; tenant:agency_id | mutácia |
| `/api/dashboard/summary` | GET | GATED-SESSION | session | session:getUser | mutácia |
| `/api/decision` | GET | GATED-SECRET | session | secret:isAuthorizedCronBearer | service-role, mutácia |
| `/api/demo` | GET | GATED-SECRET | session | secret:revolisGuard | - |
| `/api/demo/capture-lead` | POST | PUBLIC-BY-DESIGN | public | - | service-role, DB-zápis, mutácia |
| `/api/demo/estimate` | POST | PUBLIC-BY-DESIGN | public | - | - |
| `/api/demo/prefill-links` | POST | PUBLIC-BY-DESIGN | public | - | DB-zápis, mutácia |
| `/api/demo/request` | POST | PUBLIC-BY-DESIGN | public | - | DB-zápis, mutácia |
| `/api/developer/request-key` | POST | GATED-SESSION | session | session:proxy-only | DB-zápis, mutácia |
| `/api/embeddings/backfill` | POST | GATED-SECRET | session | secret:isAuthorizedCronBearer; tenant:agency_id+agencyId | service-role, DB-zápis, mutácia, AI/náklady |
| `/api/embeddings/index` | POST | GATED-TENANT | session | session:getUser; tenant:agency_id+agencyId | DB-zápis, mutácia, AI/náklady |
| `/api/enterprise/onboard-start` | POST | GATED-TENANT | session | session:getUser; tenant:agency_id | platby, mutácia |
| `/api/events` | POST | GATED-SESSION | session | session:getUser | mutácia |
| `/api/events/stream` | GET | GATED-TENANT | session | session:getUser; tenant:agency_id+agencyId | mutácia |
| `/api/followup` | GET:GATED-TENANT, POST:GATED-SECRET | GATED-SECRET | bypass:cron | session:getCurrentUser+getCurrentProfile; tenant:agency_id+agencyId; secret:CRON_SECRET | service-role, mutácia |
| `/api/forecasting/summary` | GET | GATED-SESSION | session | session:getUser | mutácia |
| `/api/founder/ai-plan` | GET | GATED-SESSION | session | session:getUser | mutácia |
| `/api/founder/send-legal-update-email` | POST | GATED-SESSION | session | session:requireRole | odosielanie, mutácia |
| `/api/ghostwriter/generate` | POST | GATED-TENANT | session | session:getUser; tenant:agency_id+agencyId | service-role, DB-zápis, mutácia, AI/náklady |
| `/api/ghostwriter/send-email` | POST | GATED-SESSION | session | session:getUser | odosielanie, service-role, DB-zápis, mutácia |
| `/api/guarantee/claim` | POST | GATED-SESSION | session | session:getUser | odosielanie, DB-zápis, mutácia |
| `/api/guardian/open-summary` | GET | GATED-TENANT | session | session:getUser+resolveProfileForAuthUser; tenant:agency_id+agencyId | mutácia |
| `/api/healthz` | GET | PUBLIC-BY-DESIGN | public | - | - |
| `/api/hub/competition-radar` | GET | GATED-SESSION | session | session:getCurrentUser | - |
| `/api/hub/get-tier` | GET | GATED-SESSION | session | session:getUser | mutácia |
| `/api/import` | POST | GATED-TENANT | session | session:getUser; tenant:agency_id+agencyId | DB-zápis, mutácia |
| `/api/import/test-xml` | POST | GATED-TENANT | session | session:getCurrentProfile; tenant:agency_id+agencyId | service-role, DB-zápis, mutácia, AI/náklady, ext-fetch |
| `/api/inbound/gmail-pull` | GET,POST | GATED-SECRET | bypass:cron | secret:CRON_SECRET; tenant:agencyId | mutácia, AI/náklady |
| `/api/integrations/calendar` | GET,POST,DELETE | GATED-SESSION | session | session:getCurrentProfile | mutácia |
| `/api/integrations/calendar/sync` | POST | GATED-SESSION | session | session:getCurrentProfile | - |
| `/api/integrations/email/sync` | POST | GATED-SESSION | session | session:getUser | mutácia |
| `/api/integrations/gmail` | GET,POST,DELETE | GATED-SESSION | session | session:getCurrentProfile | mutácia |
| `/api/integrations/gmail/sync` | POST | GATED-SESSION | session | session:getCurrentProfile | - |
| `/api/integrations/google/auth` | GET | GATED-SESSION | session | session:getUser+getCurrentProfile | mutácia |
| `/api/integrations/google/callback` | GET | PUBLIC-BY-DESIGN | public | - | mutácia, ext-fetch |
| `/api/integrations/hubspot/sync` | POST | GATED-TENANT | session | session:getUser; tenant:sameAgency+agency_id | service-role, DB-zápis, mutácia |
| `/api/integrations/portal/import` | POST | GATED-SESSION | session | session:getUser | mutácia |
| `/api/invite` | POST | GATED-TENANT | session | session:getUser; tenant:agency_id | service-role, DB-zápis, mutácia |
| `/api/kataster/watch` | GET,POST | GATED-SESSION | session | session:getUser | DB-zápis, mutácia |
| `/api/l99/bri` | POST | GATED-SESSION | session | session:proxy-only | platby |
| `/api/l99/bri-history` | GET | GATED-SESSION | session | session:getUser | platby, mutácia |
| `/api/leads` | GET:GATED-SESSION, POST:GATED-TENANT | GATED-SESSION | session | session:getUser; tenant:agency_id+agencyId | mutácia |
| `/api/leads/[id]` | GET,PATCH,DELETE | GATED-TENANT | session | session:getUser; tenant:sameAgency+agency_id; tenant:sameAgency+agency_id+agencyId | mutácia |
| `/api/leads/[id]/activities` | GET,POST | GATED-TENANT | session | session:getUser; tenant:sameAgency+agency_id; session:getUser+getCurrentProfile | mutácia |
| `/api/leads/[id]/assistant` | POST | GATED-TENANT | session | session:getUser; tenant:sameAgency+agency_id | mutácia |
| `/api/leads/[id]/contact-attempt` | POST | GATED-TENANT | session | session:getCurrentProfile; tenant:agency_id+agencyId | service-role, mutácia |
| `/api/leads/[id]/deal-strategy` | GET | GATED-TENANT | session | session:getUser; tenant:sameAgency+agency_id | mutácia |
| `/api/leads/[id]/demand-matches` | GET | GATED-TENANT | session | session:getUser; tenant:sameAgency+agency_id+agencyId | mutácia |
| `/api/leads/[id]/drafts/[activityId]/approve` | POST | GATED-TENANT | session | session:getCurrentProfile; tenant:agency_id+agencyId | mutácia |
| `/api/leads/[id]/matches` | GET | GATED-TENANT | session | session:getUser; tenant:sameAgency+agency_id | mutácia |
| `/api/leads/[id]/matches/[matchId]` | PATCH | GATED-TENANT | session | session:getUser; tenant:agency_id | mutácia |
| `/api/leads/[id]/moves` | GET,POST | GATED-TENANT | session | session:getUser; tenant:sameAgency+agency_id | mutácia |
| `/api/leads/[id]/sales-brain` | GET | GATED-TENANT | session | session:getUser; tenant:sameAgency+agency_id | mutácia |
| `/api/leads/[id]/sofia` | POST | GATED-SESSION | session | session:getUser | mutácia |
| `/api/leads/bri-history` | GET | GATED-SESSION | session | session:getUser | mutácia |
| `/api/leads/bri-recompute` | POST | GATED-SESSION | session | session:getUser | mutácia |
| `/api/leads/inbound` | POST | PUBLIC-BY-DESIGN | public | - | DB-zápis, mutácia |
| `/api/leads/inventory` | GET | GATED-TENANT | session | session:getUser+resolveProfileForAuthUser; tenant:agency_id+agencyId | mutácia |
| `/api/legal/dpa-request` | POST | GATED-SESSION | session | session:proxy-only | mutácia |
| `/api/login` | POST | GATED-SESSION | session | session:proxy-only | - |
| `/api/matching/action` | POST | GATED-SESSION | session | session:getUser | DB-zápis, mutácia |
| `/api/matching/export` | GET | GATED-SESSION | session | session:getUser | mutácia |
| `/api/matching/recalculate` | POST | GATED-SESSION | session | session:getUser | mutácia |
| `/api/meta/lookalike` | POST | GATED-SECRET | session | secret:isAuthorizedCronBearer | service-role, mutácia, ext-fetch |
| `/api/morning-brief/track/click` | GET | GATED-SESSION | session | session:proxy-only | DB-zápis, mutácia |
| `/api/morning-brief/track/open` | GET | GATED-SESSION | session | session:proxy-only | DB-zápis, mutácia |
| `/api/nav/permissions` | GET | GATED-SESSION | session | session:getUser | mutácia |
| `/api/neighborhood-watch/alerts` | GET | GATED-SESSION | session | session:proxy-only | service-role, mutácia |
| `/api/neighborhood-watch/subscribe` | POST | GATED-SESSION | session | session:proxy-only | odosielanie, platby, service-role, DB-zápis, mutácia |
| `/api/notifications/subscribe` | POST | GATED-SESSION | session | session:getUser | platby, DB-zápis, mutácia |
| `/api/notifications/unsubscribe` | GET | GATED-SESSION | session | session:proxy-only | DB-zápis, mutácia |
| `/api/observability/fallback-matrix` | GET | GATED-SESSION | session | session:proxy-only | - |
| `/api/observability/probes` | GET | GATED-SESSION | session | session:proxy-only | platby, ext-fetch |
| `/api/observability/rules` | GET | GATED-SESSION | session | session:proxy-only | - |
| `/api/onboarding/goals` | POST | GATED-SESSION | session | session:proxy-only | - |
| `/api/onboarding/mvp/at-risk` | GET | GATED-SESSION | session | session:requirePlatformAdmin | mutácia |
| `/api/onboarding/mvp/checklist` | GET,POST | GATED-SESSION | session | session:requirePlatformAdmin | DB-zápis, mutácia |
| `/api/onboarding/mvp/messages/schedule` | POST | GATED-SESSION | session | session:requirePlatformAdmin | DB-zápis, mutácia |
| `/api/onboarding/role` | POST | GATED-SESSION | session | session:getUser | mutácia |
| `/api/onboarding/session` | GET:UNGATED, POST:UNKNOWN, PUT:UNGATED | PUBLIC-BY-DESIGN | public | - | DB-zápis, mutácia |
| `/api/onboarding/summary` | GET | GATED-SESSION | session | session:getCurrentUser | mutácia |
| `/api/outreach` | GET | GATED-SECRET | session | secret:revolisGuard | DB-zápis, mutácia |
| `/api/outreach/approve` | POST | GATED-TENANT | session | session:getCurrentProfile; tenant:agency_id+agencyId | mutácia |
| `/api/outreach/campaigns` | POST | GATED-SESSION | session | session:getUser | DB-zápis, mutácia |
| `/api/outreach/preview` | POST | GATED-TENANT | session | session:getUser+getCurrentProfile; tenant:agencyId | mutácia, AI/náklady |
| `/api/outreach/segments` | GET,POST | GATED-SESSION | session | session:getUser | DB-zápis, mutácia |
| `/api/outreach/send` | POST | GATED-TENANT | session | session:getCurrentProfile; tenant:agency_id+agencyId | mutácia |
| `/api/outreach/templates` | GET,POST | GATED-SESSION | session | session:getUser | DB-zápis, mutácia |
| `/api/playbook` | GET | GATED-SESSION | session | session:proxy-only | mutácia |
| `/api/playbook/auto` | GET | GATED-SECRET | session | secret:revolisGuard | - |
| `/api/playbook/confirm-viewing` | POST | GATED-SESSION | session | session:getCurrentUser | odosielanie, mutácia |
| `/api/playbook/generate` | GET | GATED-SECRET | session | secret:isAuthorizedCronBearer | service-role, DB-zápis, mutácia |
| `/api/price-trail` | GET,POST | GATED-SESSION | session | session:getUser | mutácia |
| `/api/profiles` | GET | GATED-SESSION | session | session:getUser | mutácia |
| `/api/profiles/[id]` | GET,PATCH | GATED-TENANT | session | session:getUser; tenant:agency_id+agencyId | service-role, DB-zápis, mutácia |
| `/api/proof` | POST | PUBLIC-BY-DESIGN | public | - | mutácia |
| `/api/properties` | GET:GATED-SESSION, POST:GATED-TENANT, PUT:GATED-SESSION, DELETE:GATED-SESSION | GATED-SESSION | session | session:getUser; tenant:agency_id+agencyId | DB-zápis, mutácia |
| `/api/properties/[id]` | PATCH,DELETE | GATED-TENANT | session | session:getUser; tenant:sameAgency+agency_id+agencyId | mutácia |
| `/api/properties/inventory` | GET | GATED-SESSION | session | session:getUser | mutácia |
| `/api/push/subscribe` | POST,DELETE | GATED-SESSION | session | session:getUser | platby, DB-zápis, mutácia |
| `/api/realsoft/import` | GET:UNGATED, POST:UNKNOWN | UNGATED | bypass:import | - | - |
| `/api/realvia/import` | GET:UNGATED, POST:UNKNOWN | UNGATED | bypass:import | - | - |
| `/api/recommendations` | GET,POST | GATED-SESSION | session | session:getUser | mutácia |
| `/api/recommendations/[id]` | PATCH | GATED-TENANT | session | session:getUser; tenant:sameAgency+agency_id+agencyId | mutácia |
| `/api/recommendations/bulk` | PATCH | GATED-SESSION | session | session:getUser | mutácia |
| `/api/recommendations/recalculate` | POST | GATED-SESSION | session | session:getUser | mutácia |
| `/api/reports/generate-developer-insights` | GET | GATED-SESSION | session | session:getCurrentUser | DB-zápis, mutácia |
| `/api/reports/profit` | GET | GATED-SECRET | session | secret:revolisGuard | mutácia |
| `/api/resend-webhook` | POST | GATED-SECRET | session | secret:verifyStandardWebhook | odosielanie, service-role, mutácia |
| `/api/sales-funnel/demo-request` | POST | GATED-SESSION | session | session:proxy-only | mutácia |
| `/api/sales-funnel/update-status` | POST | GATED-SESSION | session | session:requirePlatformAdmin | DB-zápis, mutácia |
| `/api/scheduled-events` | GET:GATED-SESSION, POST:GATED-TENANT | GATED-SESSION | session | session:getUser; session:getCurrentProfile; tenant:agency_id | mutácia |
| `/api/scheduled-events/[id]` | GET:GATED-SESSION, PATCH:GATED-TENANT, DELETE:GATED-TENANT | GATED-SESSION | session | session:getUser; session:getCurrentProfile; tenant:agency_id+agencyId | mutácia |
| `/api/scheduled-outreach` | POST | GATED-SECRET | session | secret:isAuthorizedCronBearer+CRON_SECRET | service-role, mutácia |
| `/api/scoring` | GET | GONE | bypass:410-shim | 410 | - |
| `/api/scoring/recalculate` | POST | GATED-SESSION | bypass:cron | session:getUser | mutácia |
| `/api/search/semantic` | POST | GATED-TENANT | session | session:getUser+getCurrentUser+getCurrentProfile; tenant:agency_id+agencyId | DB-zápis, mutácia, AI/náklady |
| `/api/segmentation` | GET,POST | GONE | bypass:410-shim | 410 | - |
| `/api/session/context` | GET | GATED-TENANT | session | session:getCurrentUser+getCurrentProfile; tenant:agency_id+agencyId | - |
| `/api/settings/auth-email-tests` | GET,POST | GATED-TENANT | session | session:getUser+resolveProfileForAuthUser; tenant:agency_id; tenant:assertSameAgencyTarget+agency_id | service-role, DB-zápis, mutácia |
| `/api/settings/plan` | GET | GATED-SESSION | session | session:proxy-only | - |
| `/api/settings/usage-metrics` | GET | GATED-TENANT | session | session:getCurrentUser+getCurrentProfile; tenant:agency_id+agencyId | mutácia |
| `/api/starter-pack/download` | GET | UNKNOWN | session | - | platby, mutácia |
| `/api/stealth-recruiter/outreach` | POST | GONE | session | 410 | odosielanie, platby, DB-zápis, mutácia, AI/náklady |
| `/api/stealth-recruiter/scan` | POST | GONE | session | 410 | platby, mutácia, AI/náklady |
| `/api/strategic-alerts` | GET | GATED-SESSION | session | session:proxy-only | mutácia |
| `/api/support/request` | POST | GATED-SESSION | session | session:proxy-only | mutácia |
| `/api/system/health-dashboard` | GET | GATED-SESSION | session | session:getCurrentUser | mutácia, AI/náklady |
| `/api/system/smoke` | GET | GATED-SESSION | session | session:proxy-only | - |
| `/api/tasks` | POST | GATED-SESSION | session | session:getUser | mutácia |
| `/api/tasks/[id]` | PATCH,DELETE | GATED-TENANT | session | session:getUser; tenant:sameAgency+agency_id | mutácia |
| `/api/team/assign-lead` | POST | GATED-SESSION | session | session:getUser | mutácia |
| `/api/team/teams` | GET:GATED-SESSION, POST:GATED-TENANT | GATED-SESSION | session | session:getUser; tenant:agency_id+agencyId | mutácia |
| `/api/team/teams/[id]` | PATCH | GATED-TENANT | session | session:getUser; tenant:sameAgency+agency_id | mutácia |
| `/api/team/users` | GET:GATED-SESSION, POST:GATED-TENANT | GATED-SESSION | session | session:getUser; tenant:agency_id+agencyId | mutácia |
| `/api/uc/import` | GET:UNGATED, POST:UNKNOWN | UNGATED | bypass:import | - | - |
| `/api/universal-import/errors` | GET | GATED-SESSION | session | session:proxy-only | - |
| `/api/universal-import/mapping` | POST | GATED-SESSION | session | session:proxy-only | mutácia |
| `/api/universal-import/preview` | GET | GATED-SESSION | session | session:proxy-only | - |
| `/api/universal-import/realvia-json` | POST | GATED-SESSION | session | session:proxy-only | mutácia |
| `/api/universal-import/run` | POST | GATED-SESSION | session | session:proxy-only | - |
| `/api/universal-import/start` | POST | GATED-SESSION | session | session:proxy-only | mutácia |
| `/api/valuation/estimate` | POST | PUBLIC-BY-DESIGN | public | - | mutácia |
| `/api/valuation/submit` | POST | PUBLIC-BY-DESIGN | public | - | DB-zápis, mutácia |
| `/api/webhooks/calendly` | POST | GATED-SECRET | bypass:webhook | secret:verifyCalendlySignature | service-role, DB-zápis, mutácia |
| `/api/webhooks/hubspot` | POST | PUBLIC-BY-DESIGN | public | secret:timingSafeEqual+createHmac+verifyHubSpotSignature | platby, DB-zápis, mutácia |
| `/api/webhooks/inbound-lead` | POST | GATED-SECRET | bypass:webhook | secret:timingSafeEqual | DB-zápis, mutácia |
| `/api/webhooks/realvia` | GET:GATED-SECRET, POST:UNKNOWN | UNKNOWN | bypass:webhook | secret:CRON_SECRET | - |
| `/api/workdesk/first-audit` | GET | GATED-TENANT | session | session:getCurrentUser; tenant:agency_id | mutácia |
