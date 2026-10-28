# INTEGRATIONS — endpointy, autentifikácia, závislosti

> Revolis.AI reverse-engineering & system discovery v1.0 · 2026-10-21 · HEAD `a04bc5e` (main, #908)
> Značky: **CONFIRMED** (prečítané v kóde) · **INFERRED** (vyvodené) · **UNKNOWN** (nedá sa overiť z repozitára).
> Cesty relatívne k rootu repozitára: `crm/` = `apps/crm/`, `S/` = `apps/crm/src/`. Riadky s „~" sú približné (z delegovaného čítania, neprečítané znova).
> **Hodnoty env premenných sa nikdy neuvádzajú — len ich mená.** Kód ≠ beh v PROD: nastavenie dashboardov (Resend, Stripe, Realvia, Vercel env) je UNKNOWN.

## 1. Autentifikácia ciest

### 1.1 Brána
`S/proxy.ts` je session brána: Supabase `getUser()` s timeoutom 5 s; pri timeoute **API cesty zlyhajú uzavreto (401), stránky otvorene** (`:132-199`). CONFIRMED.

Čo session preskočí úplne:
- `PUBLIC_PATHS` (24 presných ciest, `:6-40`) + prefixy `/odhad/`, `/api/healthz*`, `/_next`, `/images`, `/icons`, `/logos`;
- `/api/realvia/import`, `/api/uc/import`, `/api/realsoft/import` (`:133-134`);
- celý podstrom `/api/webhooks` (`:54,135`);
- `/api/agents*`, `/api/cron/*`, `/api/followup`, `/api/inbound/gmail-pull`, `/api/scoring*` (`:42-49,138`); 410 shimy `/api/scoring`, `/api/segmentation` (`:51`).

**Pravidlo, ktoré z toho plynie:** každá z týchto ciest je chránená *iba* vlastným handlerom. Proxy komentár (`:180-182`) hovorí, že handlery so service-role klientom sa spoliehajú na bránu a nerobia druhý `getUser`. CONFIRMED.

### 1.2 Verejné cesty a ich autentifikácia v handleri

| Cesta | Autentifikácia v handleri | Rate limit | Poznámka |
|---|---|---|---|
| `/api/healthz` | žiadna (7 riadkov) | — | triviálne |
| `/api/demo/estimate` | žiadna; čistý výpočet (`:28-72`) | **nie** | bez vedľajších efektov |
| `/api/demo/request` | — | `checkAiRateLimit` 3/okno (`:9`) | zapisuje service-role |
| `/api/proof` | — | `checkAiRateLimit` 5/min (`:12`) | service-role |
| `/api/demo/prefill-links` | hlavička `x-demo-admin-token` porovnaná `===` (`:9-14`) | **nie** | F-18, F-29 |
| `/api/demo/capture-lead` | API kľúč, `timingSafeEqual` (`:1-15`) | **nenájdený** | F-29 |
| `/api/billing/webhook` | Stripe `constructEvent` (`S/lib/billing-store.ts:788-799`); pri zlyhaní non-2xx → Stripe opakuje | — | viď `DATA_FLOWS.md §4.2` |
| `/api/integrations/google/callback` | `verifyGoogleOAuthState` (`:27-30`) | — | OAuth state HMAC |
| `/api/webhooks/hubspot` | HMAC v3 + `timingSafeEqual` (`:18-79`) | — | |
| `/api/webhooks/calendly` | `verifyCalendlySignature` (`:31-38`) | — | |
| `/api/webhooks/inbound-lead` | Bearer secret, sha256 + `timingSafeEqual` (`:12-26`) | — | |
| `/api/webhooks/realvia` | `validateRequest`: dvojica identifikátorov + IP allowlist; diagnostické GET vyžadujú Bearer `CRON_SECRET` (`:30,160-190`) | — | dev bypass F-16 |
| `/api/leads/inbound` | slug + token → agentúra fixovaná konfiguráciou (`~:76`) | `rateLimit` 10/min/IP | |
| `/api/acquire/email` | shared-secret hlavička, `timingSafeEqual` (`:240-246`) | **nie** | F-29 |
| `/api/acquisition/google/lead-webhook` | kľúč cez `safeCompare`; kľúč môže prísť v URL query | `rateLimit` 60/min (`:151`) | F-18 |
| `/api/valuation/submit`, `/estimate` | — | `rateLimit` | service-role |
| `/api/onboarding/session` | validácia `session_id` | `rateLimit` | |
| `/api/concierge/{properties,callback,freebusy}` | `conciergeSecretOk` (fail-closed, `===`) | `rateLimit` | F-18 |
| `/api/realvia/import` | `validateRequest` (`S/lib/realvia/validate.ts`) | — | loguje 1000 znakov XML (F-06) |
| `/api/uc/import`, `/api/realsoft/import` | user/pass cez RPC `resolve_agency_id_for_realsoft_credentials` (`S/lib/realsoft/auth.ts:24`) | **nenájdený** | F-05 |
| `/api/followup` | GET session; POST `isCronAuthorized` | — | `NODE_ENV==="test"` bypass (F-16) |
| `/api/inbound/gmail-pull` | Bearer `CRON_SECRET` (`:17-19`) | — | |
| `/api/scoring/recalculate` | `getUser` (`:12`) — proxy session obchádza, handler je jediná brána | — | |
| `/api/agents/*` | `revolisGuard` (HMAC); deal-trigger POST Bearer | — | F-07, F-15 |

- **CONFIRMED:** žiadna verejná cesta nemá nulovú autentifikáciu okrem `/api/healthz` a `/api/demo/estimate`.
- **CONFIRMED (static) / UNKNOWN (živé):** `/api/resend-webhook` a `/api/morning-brief/track/{open,click}` v žiadnom zozname chýbajú → proxy im bez cookie vráti 401 (F-02). Tento turn znova overené grepom v `proxy.ts` a `vercel.json`.

### 1.3 Cron cesty
- **CONFIRMED:** 31 súborov `/api/cron/*`, všetky fail-closed, žiadny bez autentifikácie.
  - 4 používajú `S/lib/cron-auth.ts` (`agency-scraping:10`, `arbitrage-scan:14`, `onboarding-dispatch:6`, `price-trail-sync:13`);
  - 25 inline `!cronSecret || authorization !== Bearer …` (napr. `bri-snapshot:11-13`, `morning-brief:26`, `seller-rescue:132`);
  - `daily-match:7-22` Bearer **alebo** `x-cron-secret`; `auto-tune:12-18` **iba** `x-cron-secret` (503 ak nenastavený);
  - `night-watch` cez `revolisGuard` (HMAC, bez Bearer).
- 27 z 31 nepoužíva zdieľaný helper — drift, nie diera (F-18).
- **Plánovanie:** `crm/vercel.json` plánuje 19 záznamov (`dashboard-insights` dvakrát); zvyšné cron routes nemajú v repozitári známy spúšťač. UNKNOWN: `agency-scraping`, `auto-tune`, `credits-expire`, `credits-grant`, `daily-match`, `demo-brief`, `demo-recap`, `night-watch`, `onboarding-dispatch`, `stealth-recruiter-ingest` (F-28). Najmä `credits-grant`/`credits-expire` ovplyvňujú tok kreditov z `DATA_FLOWS.md §4.4`.
- **`revolisGuard` (HMAC) cesty** vyžadujú hlavičky, ktoré v repozitári nič neposiela → nemajú kompatibilného volajúceho (F-15).

## 2. Inventár integrácií

| Systém | Súbory | Autentifikácia | Env (mená) | Odolnosť |
|---|---|---|---|---|
| Supabase | `S/lib/supabase/{server,admin,fetch-timeout}.ts`; 71+ importérov | anon, service role | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_SECRET_KEY`, `SUPABASE_URL` | fetch timeout 8 s, bez retry |
| Stripe | `S/lib/billing-store.ts:132-143` | secret key + podpis webhooku | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_*`, `STARTER_PACK_DOWNLOAD_SECRET` (+ v3: `STRIPE_PRICE_V3_SEAT_MONTHLY/YEARLY`, `STRIPE_COUPON_V3_ANNUAL_PROMO`, `PRICING_V2_*`) | timeout 5 s, `maxNetworkRetries` 1 |
| Resend | 12+ súborov; `S/lib/notify-new-lead.ts:56`, `S/lib/starter-pack/fulfillment.ts:100`, `S/lib/outreach-store.ts:414-420` | API kľúč; Svix webhook | `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `RESEND_WEBHOOK_SECRET` | surový `fetch`: try/catch, **bez timeoutu** (F-17) |
| Brevo | `S/lib/inbound-routing.ts:84` | API kľúč | `BREVO_API_KEY` | bez timeoutu |
| SMTP | nodemailer | user/pass | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_PROVIDER` | UNKNOWN |
| OpenAI | `S/lib/ai/openai.ts:17`, `S/lib/embeddings.ts:44` | API kľúč | `OPENAI_API_KEY` | defaulty SDK; surový `fetch` bez timeoutu |
| Anthropic | `S/lib/ai/claude.ts:11` | API kľúč | `ANTHROPIC_API_KEY` | defaulty SDK |
| Google OAuth / Gmail / Calendar | `S/lib/inbound/gmail-pull.ts`, `gmail-connect.ts:159`, `integrations/google/callback` | OAuth, HMAC state | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_OAUTH_STATE_SECRET`, `GMAIL_INBOUND_TOKEN_KEY`, `GMAIL_INBOUND_STATE_SECRET`, `GMAIL_INBOUND_PULL_ENABLED` | UNKNOWN |
| Google Ads | `S/lib/acquisition/google-ads-client.ts` (~212-274) | developer token / OAuth; webhook kľúč | `GOOGLE_ADS_WEBHOOK_KEY`, `GOOGLE_ADS_RATE_LIMIT_PER_TENANT` | backoff, opakovateľné kódy, max pokusov |
| HubSpot | `S/lib/hubspot/client.ts`, `sync.ts:94`, webhook | API kľúč; HMAC | `HUBSPOT_API_KEY`, `HUBSPOT_WEBHOOK_SECRET` | timeout nenájdený |
| Realvia | `S/lib/realvia/*`, `/api/webhooks/realvia`, `/api/realvia/import`, `cron/realvia-process` | identifikátor + IP allowlist | `REALVIA_IDENTIFIER`, `REALVIA_IDENTIFIER_2`, `REALVIA_SHARED_SECRET`, `REALVIA_ALLOWED_IP`, `REALVIA_DEFAULT_AGENCY_ID` | len prichádzajúce |
| Realsoft / UC | `S/lib/uc/import-handler.ts`, `S/lib/realsoft/auth.ts` | user/pass cez RPC | `REALSOFT_EXTERNAL_ID_PATH_ACTION_1`, `_2` | len prichádzajúce |
| Twilio | `S/lib/multi-channel-sender.ts:67-105`, `S/lib/l99/alert-dispatch.ts:34` | SID + token | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_SMS_FROM`, `TWILIO_WHATSAPP_FROM` | iba try/catch |
| Telegram | `S/lib/alerts/telegram.ts:12-44` | bot token | `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` | `AbortSignal.timeout` |
| Slack, ops/legal/support webhooky | `S/lib/alerts/router.ts:21`, `S/lib/inbound-routing.ts:25` | tajná URL | `SLACK_WEBHOOK_URL`, `OPERATIONS_WEBHOOK_URL`, `LEGAL_WEBHOOK_URL`, `SUPPORT_WEBHOOK_URL` | UNKNOWN |
| Meta Ads | `S/app/api/meta/lookalike/route.ts:6` | token | `META_ACCESS_TOKEN`, `META_AD_ACCOUNT_ID` | UNKNOWN |
| Web push | `S/lib/morning-brief/generators/web-push.ts:24` | VAPID | `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_EMAIL` | UNKNOWN |
| Calendly | `/api/webhooks/calendly` | HMAC | `CALENDLY_WEBHOOK_SECRET` | len prichádzajúce |
| Katastrálne WMS (skgeodesy, svp) | `S/lib/cadastre/WmsParcelSource.ts:10-13` | žiadna | žiadne | timeout UNKNOWN |
| RPO (slovensko.digital) | `S/lib/enrichment/providers.ts:44` | žiadna | `RPO_V2_BASE_URL` | UNKNOWN |
| Vercel Cron | `crm/vercel.json` (19 záznamov) | Bearer | `CRON_SECRET` | n/a |

- **CONFIRMED:** Bazos a nehnutelnosti.sk sa objavujú len ako odkazy v dátovom modeli (žiadny scraper v CRM kóde nájdený). Žiadne ÚGKK API okrem WMS zdrojov vyššie, žiadna telefónia mimo Twilio. Rozdiel voči `docs/architecture/master-data-sourcing-map.md` nebol porovnávaný (OPEN_QUESTIONS).
- Stripe: integrácia z kódu; **Live objekty (produkt, ceny, kupón, endpoint) UNKNOWN** — k Stripe nemá táto session prístup. Podľa predchádzajúcich founderových screenshotov je nakonfigurovaných 6 udalostí webhooku; 7. udalosť nebola identifikovaná.
- Packages `mcp-*` a `apps/realvia-ingestion`, `apps/revenue-intelligence` CRM-ka nevolá (viď `ARCHITECTURE.md §1`).

## 3. Tajomstvá a konfigurácia

- **CONFIRMED:** `S/config/env.ts` má zod schému (208 riadkov), ale `getEnv()` je lazy s veľmi málo importérmi — pri štarte sa nevynucuje (komentáre: zapojenie by zhodilo PROD). `S/lib/app-env.ts` poskytuje `validateEnv` a `DEGRADED_WITHOUT`. → chýbajúce tajomstvo sa prejaví až za behu.
- **CONFIRMED:** všetky `NEXT_PUBLIC_*` mená sú nesekrétne (APP_URL, Supabase URL a kľúč, GA ID, token mapy, VAPID public, realtime socket…). Server-secret s týmto prefixom nenájdený; žiadny klientsky komponent neimportuje service-role env.
- **CONFIRMED:** service-role sa používa v ~70 route súboroch + `lib/realvia`, credits, inbound, agents, universal-import a 3 verejné stránky.
- **CONFIRMED:** `createAdminClient` potichu padá späť na anon kľúč alebo `"placeholder-key"` + placeholder URL (`S/lib/supabase/server.ts:18-25`); `createServiceRoleClient` (`S/lib/supabase/admin.ts`) vracia `null` pri nenakonfigurovaní (F-12).
- **CONFIRMED:** ~30 zo ~70 service-role route súborov nespomína `agency_id`/tenant; filter je buď chýbajúci, alebo žije v `lib` (nezmerané; F-12).
- **UNKNOWN:** skutočné hodnoty a prítomnosť premenných vo Vercel PROD (Vercel MCP sme volali s `filter_project_envs`; výsledky tu neuvádzame a nie sú predmetom tohto dokumentu — vyžaduje samostatné overenie, OPEN_QUESTIONS).

## 4. CI/CD pracovné postupy (`.github/workflows`, 11 súborov)

| Workflow | Spúšťač | Oprávnenia / tajomstvá | Poznámka |
|---|---|---|---|
| `saas-grade-pipeline.yml` („CI - Revolis.AI") | push + PR na main | `contents: read`; `OPENAI_API_KEY`, `ANTHROPIC_API_KEY` do build a smoke (~296, 353-354); `CRON_SECRET` je tam doslovná CI hodnota | lint, typecheck (baseline-diff), testy proti efemérnemu lokálnemu Supabase (guard, že `TEST_SUPABASE_*` je lokálny), build, Playwright smoke |
| `nightly-playwright.yml` | cron 03:00 | OPENAI/ANTHROPIC, `TEST_USER_EMAIL/PASSWORD` (107, 145-148) | |
| `preview-playwright-smoke.yml` | `deployment_status` | žiadne tajomstvá | |
| `gmail-inbound-pull.yml` | cron každých 10 min | `permissions: {}`; **produkčný** `CRON_SECRET` + `CRM_BASE_URL` → POST `/api/inbound/gmail-pull` (31-49) | `vercel.json` plánuje ten istý endpoint aj denne → dvojité plánovanie (F-19) |
| `schema-governance-guard.yml` | **iba manuálne** | `SCHEMA_GUARD_SUPABASE_URL`, `SCHEMA_GUARD_SUPABASE_SERVICE_ROLE_KEY` (37-45) | service-role kľúč v CI; guard neblokuje PR (F-14, F-19) |
| `auto-merge-policy.yml`, `brain-weekly-audit.yml` | — | zápis `contents` + `pull-requests` cez `GITHUB_TOKEN`; `inputs.pr_number` interpolovaný do shell riadku (`auto-merge-policy.yml:38`, typ number → nízke riziko) | |
| `security-review.yml`, `code-contract-guard.yml`, `memory-guard.yml`, `memory-engine-report.yml` | PR | read / PR-komentár | |

- **UNKNOWN:** ktoré kontroly sú povinné (branch protection nie je v repozitári); obsah `scripts/check-security.mjs` a `.github/scripts/automerge-policy.mjs` nečítaný.
- **CONFIRMED (iný zdroj):** CRM `next.config` má `ignoreBuildErrors: true`; kompenzuje to baseline-diff typecheck v CI (viď `ARCHITECTURE.md`).

## 5. Rate limiting a PII

- **CONFIRMED:** `S/lib/rate-limit.ts` volá RPC `rate_limit_increment` (okno). **Fail-open** pri nenakonfigurovanom Supabase (`:41-45`) aj pri DB chybe (`:57-61`); kľúč = prvý záznam `x-forwarded-for`. `S/lib/ai/rate-guard.ts` (`checkAiRateLimit`) má 24 volajúcich súborov (F-11). Či Vercel prepisuje klientsky `x-forwarded-for`: UNKNOWN.
- **CONFIRMED:** PII pomôcky:
  - `S/lib/pii-mask.ts` — používa ho len `app/api/matching/export/route.ts`, kde `redactPii=0` maskovanie vypína;
  - `S/lib/log-safe.ts` `describeError` maskuje e-maily a čísla podobné telefónom (limit 300 znakov), ~7 použití;
  - `S/lib/logger.ts` **nerediguje**;
  - `S/lib/realvia/validate.ts:56-72` rediguje citlivé názvy hlavičiek v logoch.

## 6. Čo sa nepodarilo overiť
GitHub required checks a branch protection · hodnoty Vercel env a to, ktoré cron routes reálne bežia · webhook URL v dashboardoch Resend/Stripe/Realvia · `scripts/check-security.mjs`, `automerge-policy.mjs` · RLS na `leads` a tabuľkách dotknutých service-role routes · timeouty WMS/HubSpot klientov a defaulty OpenAI/Anthropic SDK · správanie `x-forwarded-for` na Verceli · či `/api/realvia/import` v PROD nesie osobné údaje.
