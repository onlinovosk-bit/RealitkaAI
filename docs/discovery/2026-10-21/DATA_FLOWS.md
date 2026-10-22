# DATA_FLOWS — overené cesty vykonania a perzistencie

> Reverse engineering & system discovery v1.0 · 2026-10-21 · HEAD `a04bc5e` (main, #908) · **iba čítanie**.
> Značky: **CONFIRMED** = prečítané v kóde/migrácii/súbore, **INFERRED** = odvodené z kódu, bez priameho dôkazu,
> **UNKNOWN** = nedá sa overiť z repozitára. „Kód existuje" ≠ „kód beží v PROD" — beh v PROD je všade UNKNOWN,
> pokiaľ nie je uvedené inak. Skratky ciest: `crm/` = `apps/crm/`, `S/` = `apps/crm/src/`.
> Čísla riadkov pri súboroch čítaných dávnejšie sú približné (označené „~").

Každý tok: vstup → validácia → biznis logika → perzistencia → externé efekty → odpoveď.

---

## 1. Príjem leadov (intake)

### 1.1 Gmail pull (najlepšie podložená cesta)
`GitHub Actions */10 min` → `POST /api/inbound/gmail-pull` → Bearer `CRON_SECRET` → `runGmailInboundPullAll` → seen-store → acquire pipeline → `cron_runs`.

| Krok | Dôkaz | Stav |
|---|---|---|
| Plánovač: workflow `*/10 * * * *`, volá endpoint s `Bearer ${CRON_SECRET}`; ak chýba `CRM_BASE_URL`/`CRON_SECRET`, skončí s 0 bez volania | `.github/workflows/gmail-inbound-pull.yml:14-17,33-39` | CONFIRMED |
| Záložný denný Vercel cron (`20 8 * * *`) na ten istý endpoint (dvojité plánovanie) | `crm/vercel.json`, komentár `route.ts:36-38` | CONFIRMED |
| Gate: proxy púšťa bez session; handler fail-closed pri chýbajúcom `CRON_SECRET`; porovnanie obyčajné `!==` | `S/proxy.ts:42-48,138`; `S/app/api/inbound/gmail-pull/route.ts:17-20` | CONFIRMED |
| Vypínač `GMAIL_INBOUND_PULL_ENABLED=true` vo Verceli | workflow + lib | CONFIRMED (kód), hodnota UNKNOWN |
| Dedupe: PK `(agency_id, gmail_message_id)` v `agency_gmail_inbound_seen`, RLS zapnuté | `crm/supabase/migrations/20261002090000_gmail_inbound_seen.sql:12-23` | CONFIRMED |
| `cron_runs` sa píše len pri aktivite/chybe; preskočený beh max 1× / 12 h; zlyhanie → 500/503 | `route.ts:40-73` | CONFIRMED |
| Testy: `S/lib/inbound/__tests__/gmail-pull.test.ts`, `S/app/api/inbound/gmail-pull/__tests__` | — | CONFIRMED (existencia), výsledok UNKNOWN |
| Či workflow v PROD reálne bežal a či sú secrets nastavené | žiadny artefakt v repo | **UNKNOWN** |

### 1.2 `POST /api/acquire/email` (najbohatšia cesta)
Vstup → shared-secret hlavička (`timingSafeEqual`, `route.ts:240-246`, **bez rate limitu**) → `email-adapter` klasifikuje inquiry/reply/unsubscribe/spam (`S/lib/acquire/email-adapter.ts:327-339,395-402`) → claim v `acquire_dedup_keys` (text PK, RLS on; `20260629120000_acquire_dedup_keys.sql:1-9`) → insert do `leads` → `after()`: triage, auto-odpoveď (opt-in `agencies.auto_response_enabled`, fail-closed; kill switch `INBOUND_REPLY_DRAFT_DISABLED`), AI draft, extrakcia dopytu.
- Logika route: `route.ts:238-538` (rozsah z predchádzajúceho čítania, ~). CONFIRMED.
- Email typu „unsubscribe" sa klasifikuje mimo leadov, **ale nezapíše sa do žiadneho zoznamu potlačení** (viď F-01).
- Testy adaptéra/triage existujú; **test samotnej route nenájdený** (UNKNOWN pokrytie).

### 1.3 Ostatné vstupy
| Vstup | Auth v handleri | Perzistencia | Poznámka |
|---|---|---|---|
| `/api/leads/inbound` | `rateLimit` 10/min/IP + slug+token → agentúra fixovaná v konfigurácii (~76) | `leads` | testy: route, after-response, no-invented-criteria |
| `/api/valuation/submit`, `/estimate` | `rateLimit` | service role → `sandbox_submissions`, `leads`… | testy pre submit |
| `/api/demo/request` | `checkAiRateLimit` 3/okno | `leads_demo`, service role | test nenájdený (INFERRED) |
| `/api/demo/capture-lead` | API kľúč `timingSafeEqual` | `leads_demo` | **bez rate limitu** |
| `/api/webhooks/inbound-lead` | Bearer secret (sha256 + `timingSafeEqual`) | `leads` | test existuje |
| `/api/webhooks/realvia` | identifikátor + IP allowlist | surové importy → cron `realvia-process` | viď §4 |
| `/api/webhooks/hubspot` | HMAC v3 `timingSafeEqual` | **log-only** (žiadny zápis leadu) | bez testu |
| `/api/acquisition/google/lead-webhook` | `rateLimit` 60/min + kľúč `safeCompare` (kľúč smie byť v URL query) | `acquisition_events`; **nikdy nevytvára `leads`** (Stage-0) | CONFIRMED |
| `/api/concierge/*` | `conciergeSecretOk` (fail-closed, `===`) + `rateLimit` | `client_onboarding_*`, `demo_prefill_links` | agentúra zamknutá na referenčného klienta |
| `/api/uc/import`, `/api/realsoft/import` | user/pass cez RPC `resolve_agency_id_for_realsoft_credentials` (`S/lib/realsoft/auth.ts:24`) | import nehnuteľností | **bez rate limitu** (F-05) |
| `/api/realvia/import` | `validateRequest` (`S/lib/realvia/validate.ts`) | import | loguje prvých 1000 znakov XML (F-06) |

### 1.4 Resend webhook (spätná väzba z e-mailov)
`POST /api/resend-webhook` → **proxy** → handler: `RESEND_WEBHOOK_SECRET` chýba → 503 (`route.ts:39-49`) → Svix podpis `verifyStandardWebhook`, zlý podpis → 401 (`:51-63`) → `JSON.parse(rawBody)` bez try/catch (`:65`) → `opened`/`clicked` → `recordEmailEngagement` (kľúč = tag `lead_id`, bez tagu `recorded:false`, `:71-93`) → legacy tvar (`to/text/date`, `lead+<id>@`) → `storeReply` (`:95-103`) → 200.
- **CONFIRMED (statika):** `/api/resend-webhook` nie je v `PUBLIC_PATHS` ani pod `/api/webhooks` (`S/proxy.ts:6-40,54,132-138`; grep `resend-webhook` v `proxy.ts`/`vercel.json` = 0 zásahov, overené v tomto turne) → neprihlásené volanie dostane **401 z proxy skôr, než sa spustí handler**. Rovnako `/api/morning-brief/track/{open,click}` (adresári existujú).
- **UNKNOWN:** na akú URL smeruje webhook v Resend dashboarde a či tam reálne chodia 401 (verifikácia: `curl -i` bez cookie + dashboard → Webhooks → delivery log).
- **CONFIRMED:** handler nespracúva `email.bounced`, `email.complained`, unsubscribe (F-01).

---

## 2. Scoring, triage, AI draft

`cron/lead-ai-triage` (05:00 denne, `vercel.json`) → batch triage otvorených leadov (Anthropic Claude Haiku) → zápis score/priority (`S/app/api/cron/lead-ai-triage/route.ts:1-95`, ~). Paralelne v `acquire/email` `after()`: `inbound-lead-triage` → `reply-draft` → `insert-agent-draft` → riadok `activities` (draft, `requires_approval`) + `ai_action_audit`.
- `cron/follow-up-sweep` (22:00): **zapisuje len drafty**. `mode` je natvrdo `"draft"`, `FOLLOWUP_MODE=send` sa ignoruje (len sa vráti ako `requested_mode`) — `route.ts:1-8,56-58`. Oprávnenosť: ≥ 5 dní stale (`FOLLOWUP_STALE_DAYS`), < 12 AI follow-upov za život, ≥ 7 dní od posledného (`:49-77`). Skenuje všetky agentúry service-role klientom bez filtra; draft sa pripisuje `agency_id` leadu (`:68-77,125-131`). Zlyhaný draft nemení počítadlá; beh sa zapisuje do `cron_runs` (`:156-176`). CONFIRMED.
- `/api/scoring/recalculate`: proxy preskakuje session, jediný gate je `getUser` v handleri (riadok 12). CONFIRMED.
- **UNKNOWN:** prompty a matching/scoring knižnice (`S/lib/ai-*.ts`, `S/lib/ai/*`, `S/ai/prompts`) nečítané v celom rozsahu; kvalita skóre nemeraná.

---

## 3. Odchádzajúca komunikácia

### 3.1 Jediná živá cesta odoslania — human-approved
Broker UI → `POST /api/outreach/send` (alebo `/approve`, duplicitný súbor) → profil/session → `requireFeature("outreach")` (no-op, F-03) → rate limit 10/min/user → validácia (`activityId` povinné, inak 400, `send/route.ts:84-88`) → `approveAndSendInboundDraft` → Control Contract `authorizeSend` + `AGENT_KILL_SWITCH` + send-once claim → `sendApprovedOutreach` → **Resend** (`resend.emails.send`, `S/lib/outreach-store.ts:414-420`) → audit riadky (`activities`, `messages`, `ai_action_audit`).
- Denný strop `OUTREACH_DAILY_LIMIT` (default 20), cooldown na lead `OUTREACH_LEAD_COOLDOWN_HOURS` (default 20 h); kontrolované pri odoslaní znova; počítajú `sent` audit riadky a `messages` (`direction=outbound`, `channel=email`, `ai_generated=true`) — `outreach-store.ts:71-72,239-276`, `S/lib/outbound-orchestrator.ts:11-37`. CONFIRMED.
- Chyby Resendu → slovenská hláška + riadok `activities` typu error; **žiadny automatický retry** (`outreach-store.ts:381-389,414-434`). CONFIRMED.
- Odoslaná správa nesie tag `lead_id` → neskoršie `opened/clicked` sa vrátia k leadu **iba ak webhook reálne prejde proxy** (§1.4). Slučka nemá end-to-end test (INFERRED).
- **CONFIRMED (overené v tomto turne):** odosielané pole sú len `from, to, subject, text, tags` — **žiadna pätička s odhlásením, žiadna `List-Unsubscribe` hlavička, žiadna kontrola potlačenia/do-not-contact pred odoslaním** (F-01).

### 3.2 Nezapojené / latentné
| Komponent | Stav | Dôkaz |
|---|---|---|
| `/api/scheduled-outreach` | POST-only, gate `SCHEDULED_OUTREACH_ENABLED` (default off), **nie je** vo `vercel.json` ani vo workflow; po zapnutí volá `runOutreachSequence` na každý lead s e-mailom **bez schválenia** (F-04) | `route.ts:16-90` |
| `scripts/outreach-automation-2.0.ts` | follow-upy cez in-memory `setTimeout` — stratia sa pri recyklovaní instancie; `lib/scheduler.ts` je „demo/dev only" | `:34-44`; `scheduler.ts:1-17` |
| `jobs/run-outbound-send.ts` | `ConsoleEmailSender` len loguje, nič neodosiela | `S/infra/email/ConsoleEmailSender.ts:6-18` |
| `/api/followup` | nie je plánovaný; POST prejde pri Bearer **alebo** `NODE_ENV==="test"` | `route.ts:20-26` |
| `S/lib/email.ts` | 3 odosielače, fallback odosielateľ `noreply@revolis.ai`, fallback API kľúča `"missing"` | `:3-6` |
| Twilio SMS/WhatsApp | `lib/multi-channel-sender.ts` — interné detaily nečítané | UNKNOWN |

### 3.3 Odhlásenie a súhlas
- Jediný endpoint: `/api/notifications/unsubscribe` — vypína `morning_brief_settings` pre UUID profilu z query stringu, **bez podpísaného tokenu**, cez cookie-bound klienta (`route.ts:9-22`). CONFIRMED.
- Súhlasy existujú len pre demo/sandbox: `lead_consents` (`crm/supabase/migrations/20260722120000_sandbox_gdpr_consent.sql`). CONFIRMED.
- Stav DNS Resendu a „odoslanie ❌" v `docs/STATUS.md:29` je tvrdenie repozitára, nie moje meranie (UNKNOWN).

---

## 4. Billing, kredity, entitlementy

### 4.1 Checkout
| Vetva | Reťazec | Dôkaz |
|---|---|---|
| Legacy `planKey` | chýba `planKey` → 400; `STRIPE_SECRET_KEY` chýba → 503; cena z `STRIPE_PRICE_*` (čítané pri načítaní modulu); `discounts:[{coupon: promoCode}]` zo surového vstupu alebo `allow_promotion_codes`; bez URL → 502; iná chyba → 400 so surovou správou | `crm/src/app/api/billing/checkout/route.ts:14-51`; `S/lib/billing-store.ts:132-144,164-283,325-327` |
| Moderná v3 | `parsePricingV3CheckoutBody` → v2 vypnuté → 404 `pricing_v2_disabled`; zlé telo → 400; kredity pri `PRICING_V2_PLANS_ONLY` (default on) → 403; chýbajúce ceny → 503 `prices_not_configured` (len mená env); `createPricingV2CheckoutSession` → 409 (`legacy_subscription`/`subscription_exists`), 503 (`unavailable`), inak URL. Množstvo = počet maklérov (max 500). Ročný plán dostane kupón 9/12 len počas promo; s balíkom kreditov sa nekombinuje | `S/app/api/billing/credits/checkout/route.ts:34-118`; `S/lib/credits-billing-v2.ts:104,111-129,302-374`; `S/lib/pricing-v2-contract.ts:63-72,117-119` |
| `GET /api/billing/checkout-config` | verejný, bez auth; vracia **mená** chýbajúcich env a boolean `webhookSecretConfigured`, nikdy hodnoty | `route.ts:60` |

Cenník v kóde (centy bez DPH, mesačný základ): 1→2500, 2→5000 (#908), ≤5→6500, ≤10→6500+900·(n−5), ≤20→11000+600·(n−10), inak 17000+500·(n−20); ročne 12×základ; mesačne základ×1,2; promo 9×základ (kupón 25 %, `once`, `redeem_by` 1798757999 = 2026-12-31T22:59:59Z) — `S/lib/pricing-v2.ts:19,66-67,92-130,151-171`. Tiery v kóde = `scripts/ops/stripe-expected-prices.json:14-37` = `scripts/ops/stripe-v2/revolis-stripe-v2-catalog.json:17-51` (ručne prepočítané pre n = 1, 2, 5, 6, 10, 11, 20, 21). CONFIRMED. *Pozor: prepočet je z predchádzajúceho čítania; po #908 (n=2→5000) nebol znova spustený celý test-suite — výsledok testov UNKNOWN.*

### 4.2 Webhook `POST /api/billing/webhook`
Reťazec (`crm/src/app/api/billing/webhook/route.ts`):
1. chýba `stripe-signature` → 400 (35-39);
2. `verifyStripeWebhook` = `constructEvent` nad surovým telom (`billing-store.ts:788-799`); chýbajúci secret → throw → 400;
3. `handlePricingCheckoutWebhook` (`S/lib/credits-billing-webhook.ts`): `checkout.session.completed` / `async_payment_succeeded` pre v2 plán a kredity; legacy seat/`credit_topup`/`starter_pack` len pri `completed`; neúspech pri pricing session → **500** (48-54);
4. `syncAgencyBillingLifecycle` (`S/lib/billing-lifecycle.ts`): `customer.subscription.updated|deleted`, `invoice.paid`, `invoice.payment_failed`, znova číta subscription zo Stripe; throw → **500** (58-67);
5. `handleStripeWebhookEvent` (`billing-store.ts:541-705`) → `{received:true}`.

- Vonkajší `catch` mapuje **každú** chybu (aj DB) na **400** (`:72-75`); Stripe aj tak opakuje každé non-2xx. CONFIRMED.
- **Chyby legacy vetvy sa prehĺtajú → 200**, nikdy sa neopakujú (`billing-store.ts:700-702`). CONFIRMED.
- **Žiadny dedupe podľa `event.id`**; idempotencia je len na úrovni operácie (`credit_ledger.idempotency_key` unikátny index `credit_ledger_idem_uq`, absolútne zápisy, unikátny index `agencies.stripe_subscription_id`). Replay znovu vloží „Billing" riadky do activity logu. CONFIRMED.
- v2 plnenie je bezpečné na retry: zlyhanie retrieve → false → 500 → retry; prvý grant kľúč `grant:{agency}:{YYYYMM}` (`credits-billing-v2.ts:454-577`). CONFIRMED.
- Zapisuje: `agencies` (stripe id, `subscription_status`, `account_tier`, seats, `licensed_users`, `pack_credits`, `pricing_band`, `pricing_model`, `billing_source`), `profiles` (`account_tier`, `ui_role`, `protocol_active`), `credit_ledger` (RPC), activity log.
- **PROD meranie (Supabase `ypgajkhqtbriqqmyawyv`, predchádzajúca časť session):** 7 agentúr, **0** s `stripe_subscription_id` → žiadny platiaci zákazník, tok nebol v PROD nikdy overený na reálnej platbe. Stripe Live objekty a 7. webhook udalosť: UNKNOWN (bez prístupu k Stripe z tejto session).

### 4.3 Entitlementy, trial, grace, seats
- Odoberajúce stavy `canceled|unpaid|incomplete_expired` → tier `free` + vypnuté cockpit flagy (`billing-lifecycle.ts:132`); `past_due` = grace bez odobratia. CONFIRMED.
- Pri `customer.subscription.deleted` v2 cesta navyše nuluje `pack_credits` a degraduje profily agentúry (`revokePricingV2Agency`, `credits-billing-v2.ts:689-701`); lifecycle cesta nie. Prekrytie dvoch ciest: UNKNOWN.
- Gate zápisu: `getSaasOpsSnapshot().accessLevel` — `trial|active|grace|unknown` = plný prístup, inak read-only (`S/lib/saas-ops.ts:75-95,557`); `requireActiveAppAccess` používa 8 API routes (`S/lib/feature-gating.ts:34-45`). Trial 14 dní (`APP_TRIAL_DAYS`), grace `APP_GRACE_DAYS` (7) po `current_period_end` (`saas-ops.ts:226-241,419-446`). CONFIRMED.
- Gate číta **živý Stripe podľa e-mailu** (`getCurrentBillingStatus`, memo 5 s), nie `agencies.subscription_status`; pri zlyhaní stav `unknown` → plný prístup (fail-open). Berie `customers.list[0]` a `subscriptions.data[0]` aj keď je zrušená (`billing-store.ts:477-539`) (F-08).
- Počet seatov = počet aktívnych profilov vs. limity plánu (starter 5, pro 20, scale 999, free 2; `saas-ops.ts:161-210,537`); `licensed_users` sa pri pozvánkach **nekontroluje** (F-09).
- `getFeatureFlagsForPlan` vracia všetky flagy `true` („DEV OVERRIDE", overené v tomto turne: `saas-ops.ts:145-159`) → `requireFeature` je no-op (F-03).
- Dunning: kód len zapíše activity riadok pri `invoice.payment_failed`; nastavenia Stripe retry/e-mailov UNKNOWN.

### 4.4 Kredity
- Nákup/grant/expirácia = SECURITY DEFINER RPC `apply_credit_purchase`, `apply_monthly_grant_credits`, `expire_grant_credits` (`FOR UPDATE`, re-check pod zámkom, `unique_violation` → skipped, grant len `service_role`) — `crm/supabase/migrations/20260804230000_atomic_credit_mutations.sql:198-204`. CONFIRMED.
- `spend_credits`: idempotency EXISTS pred zámkom, bez handlera `unique_violation` → súbežný duplicitný kľúč vyhodí chybu (nie dvojitý výdaj; unikátny index drží) — `20260611000003_spend_credits.sql`. Poradie: grant, potom nákup.
- `CREDITS_ENFORCEMENT` default `"off"` → nič sa nespoplatňuje; len **3** AI routes volajú `spendForAction`, pri chybe billingu fail-open (`S/lib/credits/spend-for-action.ts`) (F-03).
- Mesačný grant v2 agentúry = 0 ak `subscription_status != 'active'`; inak pásmo (25/60/120/175) + `pack_credits` (`S/lib/credits/grant-engine.ts:150-166`). Legacy agentúra: kontrola `subscription_status` chýba (INFERRED, F-10).

---

## 5. Zdieľané priečne mechanizmy

| Mechanizmus | Správanie | Dôkaz |
|---|---|---|
| Rate limit | RPC `rate_limit_increment` (okno); **fail-open** pri nenakonfigurovanom Supabase aj pri DB chybe; kľúč = prvý `x-forwarded-for` | `S/lib/rate-limit.ts:36-61` (overené v tomto turne) |
| `checkAiRateLimit` | 24 volajúcich súborov | `S/lib/ai/rate-guard.ts` |
| Logovanie PII | `lib/logger.ts` bez redakcie; `log-safe.ts` maskuje e-mail/tel. (~7 použití); `pii-mask.ts` len `matching/export` | — |
| Plánovanie | 19 vercel cronov (`dashboard-insights` 2×), 31 `/api/cron/*` súborov, 10 s neznámym spúšťačom | viď ARCHITECTURE §5 |

## 6. Čo tento dokument netvrdí
Žiadny PROD beh (cron/workflow/webhook/Resend DNS), hodnoty env, obsah Stripe Live, politiky RLS v PROD, interné detaily `multi-channel-sender`, `SupabaseOutboundRepositories`, `outreach/preview|campaigns|segments|templates`, edge functions a prompty. Viď `OPEN_QUESTIONS.md`.
