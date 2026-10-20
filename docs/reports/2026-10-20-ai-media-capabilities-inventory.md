# Inventár: AI listing texty, médiá, kredity, flagy (2026-10-20)

Scope: `apps/crm`, `apps/marketing`, `apps/realvia-ingestion`, `packages/`, `docs/`.  
Metóda: ripgrep + čítanie route/lib/migrácií (žiadne PROD volania).

## Executive summary

| Oblasť | Stav v repe |
|--------|-------------|
| AI text inzerátu (KF1) | **LIVE kód** — Claude Sonnet, UI + API + perzistencia |
| AI foto / staging / enhance | **MISSING** — 0 implementácií (potvrdené aj v `docs/architecture/2026-10-05-mega-poplach-airamax-roadmap.md` A9) |
| Remotion / reels / TikTok video gen | **MISSING** — len sales playbook, marketing mock |
| Pôdorysy 2D/3D AI | **MISSING** v CRM; **schema only** v `apps/realvia-ingestion` (`media_type: floorplan`) |
| Kreditový ledger + Stripe | **LIVE kód**; **strhovanie pri AI default OFF** (`CREDITS_ENFORCEMENT`) |
| Feature flags | Viac vrstiev: env kill-switches, pricing flags, plan gating (dev override) |
| Fotky nehnuteľností | **URL v JSONB** z importu; **žiadny** Supabase Storage upload flow v CRM |
| Import → listings | **LIVE**: Realvia webhook + UC/Realsoft; test XML; universal-import |

---

## 1. AI listing text generation

### 1.1 Core (Claude, text-only — **nepoužíva fotky**)

| Súbor | Úloha | Stav |
|-------|--------|------|
| `/workspace/apps/crm/src/lib/ai/listing-content.ts` | `generateListingContent`, `buildListingUserPrompt`, `sanitizePropertyInput`, typy `PropertyInput` / `ListingContent` | **Production** |
| `/workspace/apps/crm/src/lib/ai/listing-content-system-prompt.ts` | `SYSTEM_PROMPT` (FINAL/KF1) | **Production** |
| `/workspace/apps/crm/src/lib/ai/claude.ts` | `callClaude`, `CLAUDE_SONNET`, `CLAUDE_HAIKU`, PII `sanitize` | **Production** |
| `/workspace/apps/crm/src/lib/ai/prompt-cache.ts` | Anthropic prompt cache pre system prompt | **Production** |

**Provider / env:** `ANTHROPIC_API_KEY` (povinné pre generovanie). Modely: `claude-sonnet-4-6`, `claude-haiku-4-5-20251001`.

**Vstup:** štruktúrované polia (`type`, `location`, `price`, `size_m2`, `features`, voliteľné `charakterLokality`, `agent_notes`). **Žiadne image parts v prompte.**

### 1.2 API routes & auth

| Route | Auth | Rate limit | Kredity | Audit / DB |
|-------|------|------------|---------|------------|
| `POST /api/ai/listing-content` | Supabase session `getUser()` → 401 | `checkAiRateLimit(user.id, "listing-content", 10)` | `spendForAction({ action: "listingDescription" })` → 402 ak enforce + nedostatok | `logAiAction({ action: "listing_description" })`, `saveGeneration` → `ai_generations` |
| `POST /api/ai/listing-content/stream` | session | **žiadny** rate limit v súbore | **žiadne** `spendForAction` | **žiadny** audit / save — priamy `getClaudeClient().messages.stream` |
| `GET /api/ai/listing-content/generations` | session + `agency_id` | — | — | `listGenerations` |
| `PATCH /api/ai/listing-content/generations/[id]` | session + tenant | — | — | `updateGenerationEdit` |

Súbory:
- `/workspace/apps/crm/src/app/api/ai/listing-content/route.ts`
- `/workspace/apps/crm/src/app/api/ai/listing-content/stream/route.ts`
- `/workspace/apps/crm/src/app/api/ai/listing-content/generations/route.ts`
- `/workspace/apps/crm/src/app/api/ai/listing-content/generations/[id]/route.ts`

### 1.3 UI

| Súbor | Stav |
|-------|------|
| `/workspace/apps/crm/src/app/(dashboard)/inzerat-generator/page.tsx` | Dashboard page |
| `/workspace/apps/crm/src/components/listing-generator/ListingGeneratorClient.tsx` | Volá **non-stream** `POST /api/ai/listing-content`, PATCH na generations |

Marketing mock (nie CRM engine): `/workspace/apps/marketing/components/landing/LandingInteractive.tsx` („Návrh inzerátu“).

### 1.4 Property Launch Pack V0 (AI + balík artefaktov)

| Súbor | Úloha |
|-------|--------|
| `/workspace/apps/crm/src/lib/capabilities/property-launch-pack/build.ts` | `buildPropertyLaunchPack` — volá `generateListingContent` + Guardian + voliteľne `buildVerticalPackDemo` |
| `/workspace/apps/crm/src/lib/capabilities/property-launch-pack/facts.ts` | `isPropertyLaunchPackEnabled()` |
| `/workspace/apps/crm/src/app/api/ai/property-launch-pack/route.ts` | POST API |

**Flag:** `PROPERTY_LAUNCH_PACK_V0 === "1"` (default **OFF** — inak 404).

**Fotky:** načítava `properties.images` pre Realvia row, používa ich v **listing-score / microsite URL list**, nie ako LLM vision input.

**Kredity:** rovnaká akcia `listingDescription` cez `spendForAction` (pred generovaním; pri taxonomy FLAG sa kredity nestrhávajú).

### 1.5 Non-AI „listing generator“ (Wave 1 K2)

| Súbor | Úloha |
|-------|--------|
| `/workspace/apps/crm/src/lib/capabilities/listing-generator/generate.ts` | `generateListingDraft` — skladá text z UC/Realvia polí, **bez LLM** |
| `/workspace/apps/crm/src/lib/capabilities/quality-guardian/` | Rule-based `reviewGeneratedListing` — **bez** `callClaude` |

Použitie: `presentation-builder`, `property-microsite`, `vertical-pack-demo`, `property-launch-pack` meta.

### 1.6 Vertical pack demo (deterministic + Guardian)

| Súbor | Úloha |
|-------|--------|
| `/workspace/apps/crm/src/lib/capabilities/vertical-pack-demo/build.ts` | `buildVerticalPackDemo` — banners, deck, microsite, completeness |
| `/workspace/apps/crm/src/app/(dashboard)/vertical-pack/[sourceId]/page.tsx` | UI demo pre Realvia `sourceId` |

**Fotky:** `imageUrls` z importovaných URL v microsite; banner specs sú text + farba, nie generované obrázky.

### 1.7 Tests & verification

- Unit: `/workspace/apps/crm/src/lib/ai/__tests__/listing-content-cache.test.ts`, `listing-golden.test.ts`
- Verification: `listing-content-{c4-schema,charakter-lokality,edit-schema,prompt-wire}.verification.test.ts`
- Registry: `/workspace/apps/crm/src/lib/__tests__/revolis-ai-features.test.ts` (`REVOLIS_AI_FEATURE_REGISTRY`)
- Launch pack: `/workspace/apps/crm/tests/verification/property-launch-pack-v0.verification.test.ts`

---

## 2. Photo / image AI (enhance, staging, vision)

**Výsledok grep naprieč `apps/`:** žiadne `virtual staging`, `declutter`, `replicate`, `fal.ai`, `gemini`, multimodal `image_url` v AI pipeline.

Jediné „image“ v AI kontexte:
- OpenAI **Whisper** audio → text: `/workspace/apps/crm/src/app/api/ai/call/transcribe/route.ts` (`OPENAI_API_KEY`, `toFile`)
- Embeddings text: `/workspace/apps/crm/src/lib/embeddings.ts` (`OPENAI_API_KEY`)

**Záver:** foto AI / staging / enhancement **neexistuje** (stub = 0 súborov).

---

## 3. Remotion, reels, video

| Nález | Stav |
|-------|------|
| `remotion` v `package.json` / TS | **0** |
| Listing Reel modul | Explicitne **vypustený** v `/workspace/apps/crm/src/lib/auth-preview-features.ts` |
| `/workspace/docs/sales/listing-video-playbook.md` | Procesný playbook (15 s Reel), **Track B nestavať** |
| `/workspace/apps/crm/tests/verification/auth-pages-brand-copy.verification.test.ts` | Assert: žiadny „reel“ v auth preview tiles |

**Záver:** žiadna Remotion integrácia; video = completeness check v `listing-score` (hľadá youtube/vimeo v `payload_raw`).

---

## 4. Floor plans (podorys)

| Lokácia | Stav |
|---------|------|
| CRM AI/generovanie | **MISSING** |
| `/workspace/apps/realvia-ingestion/migrations/001_initial.sql` | `media_type IN ('photo','floorplan','video')` |
| `/workspace/apps/realvia-ingestion/src/vendors/realvia/adapter.ts` | Heuristika `.pdf`/`.dwg` → `floorplan` |
| CRM `listing-score` | Pole `virtual_tour` / video z payload — nie generovanie pôdorysov |

---

## 5. AI credits system

### 5.1 SSOT sadzobník

`/workspace/apps/crm/src/lib/credits/credit-rates.ts`:
- `CREDIT_RATES.LEAD_UNLOCK = 20`
- `CREDIT_RATES.AI_ANALYSIS = 1`
- `CREDIT_RATES.AI_EMAIL = 1`
- `CREDIT_RATES.LISTING_DESCRIPTION = 1`

Mirror pre UI/audit: `CREDIT_ACTION_COSTS` v `/workspace/apps/crm/src/lib/program-tier-pricing.ts`.

### 5.2 Strhovanie (runtime)

| Funkcia | Súbor | Správanie |
|---------|-------|-----------|
| `creditsEnforcementEnabled()` | `spend-for-action.ts` | `true` len ak `CREDITS_ENFORCEMENT === "enforce"` |
| `spendForAction()` | `spend-for-action.ts` | Mapuje `CreditActionKey` → suma; default **allowed, charged: false** |
| `spendCredits()` | `spend-credits.ts` | RPC `spend_credits` (grant pred purchase) |
| `computeSpendSplit()` | `spend-credits.ts` | Unit-testovaná logika |

**Call sites `spendForAction` (celý CRM):** len
- `/workspace/apps/crm/src/app/api/ai/listing-content/route.ts`
- `/workspace/apps/crm/src/app/api/ai/property-launch-pack/route.ts`

Ostatné AI akcie logujú `creditsSpent` do `logAiAction` **bez** ledger strhnutia.

### 5.3 DB

| Objekt | Migrácia |
|--------|----------|
| `spend_credits()` | `/workspace/apps/crm/supabase/migrations/20260611000003_spend_credits.sql` |
| `agencies.grant_credits_balance`, `purchased_credits_balance` | (súčasť billing migrácií — viď `20260602_agency_billing_and_credits.sql` v docs) |
| `credit_ledger` | RLS + atomic mutations `20260804230000_atomic_credit_mutations.sql` |
| `ai_generations` | `/workspace/apps/crm/supabase/migrations/20260803120000_ai_generations.sql` |

### 5.4 Billing / nákup kreditov

| Route | Úloha |
|-------|--------|
| `POST /api/billing/credits/checkout` | Seat, top-up, pricing v2/v3 checkout |
| `POST /api/billing/webhook` | Stripe → `credits-billing-webhook.ts` / v2 handler |
| UI | `/workspace/apps/crm/src/components/billing/CreditsTopupPanel.tsx`, `/upgrade` |

Grant engine: `/workspace/apps/crm/src/lib/credits/grant-engine.ts` (mesačné granty podľa seat tier / pricing v2 pásma).

**Tests:** `billing-credits.verification.test.ts`, `spend-for-action.test.ts`, `spend-credits.test.ts`, `pricing-v2-e2e.test.ts`.

### 5.5 Audit (nie vždy = strhnutie)

`/workspace/apps/crm/src/lib/ai-action-audit.ts` — `AiCreditAction` enum (12 akcií), insert do `ai_action_audit`.  
Poznámka z `/workspace/docs/audit/2026-09-04-ai-cost-telemetry.md`: cost columns / `ai_generations` na PROD môžu zaostávať za kódom.

---

## 6. Feature flags

### 6.1 Env kill-switches (explicit true/on/1)

| Env | Default | Kód |
|-----|---------|-----|
| `DECISION_ENGINE_ENABLED` | OFF | `/workspace/apps/crm/src/lib/ai/decision-flags.ts` → `getDecisionFeatureFlags()` |
| `CLOSING_WINDOW_ENABLED` | OFF | same |
| `RESCUE_AUTOMATION_ENABLED` | OFF | same |
| `PROPERTY_LAUNCH_PACK_V0` | OFF (musí byť `"1"`) | `isPropertyLaunchPackEnabled()` |
| `CREDITS_ENFORCEMENT` | OFF (musí byť `"enforce"`) | `creditsEnforcementEnabled()` |
| `PRICING_V2_ENABLED` | OFF | `/workspace/apps/crm/src/lib/pricing-v2.ts` → `isPricingV2Enabled()` — true pre `true`, `1`, `on` |
| `PRICING_V2_PLANS_ONLY` | safe default blokuje balíky | checkout tests |
| `PRICING_PUBLIC_ENABLED` | OFF | verejné sumy vo VOP |
| `DEMAND_EXTRACTION_ENABLED` | OFF + needs `ANTHROPIC_API_KEY` | `/workspace/apps/crm/src/lib/demand/store.ts` |
| `DEMAND_MATCHING_ENABLED` | OFF (`=== "true"`) | `/workspace/apps/crm/src/lib/demand/match-store.ts` |
| `GMAIL_INBOUND_PULL_ENABLED` | OFF (`=== "true"`) | gmail-pull |
| `GUARDIAN_DIGEST_ENABLED` / `GUARDIAN_RUNNER_ENABLED` | OFF | guardian config |

Zod defaults v `/workspace/apps/crm/src/config/env.ts` pre decision flags: `default(false)`.

### 6.2 Plan / SaaS gating (override)

`/workspace/apps/crm/src/lib/saas-ops.ts` — `getFeatureFlagsForPlan()` vracia **všetko true** (DEV OVERRIDE).  
`/workspace/apps/crm/src/lib/feature-gating.ts` — `requireFeature`, `requireActiveAppAccess`.

UI: `/workspace/apps/crm/src/components/settings/feature-flags-card.tsx` (display only).

Docs checklist: `/workspace/apps/crm/docs/PROD-FLAGS-CHECKLIST.md`.

### 6.3 Verification

`/workspace/apps/crm/tests/verification/decision-flags.verification.test.ts`

---

## 7. AI providers & env vars (v kóde, nie secrets)

| Provider | Použitie | Env / konštanty |
|----------|----------|-----------------|
| **Anthropic** | Listing content, triage, rescue, call coach, dashboard insights, … | `ANTHROPIC_API_KEY`, `callClaude`, modely v `claude.ts` |
| **OpenAI** | Whisper transcribe, embeddings, outreach (`ai-outreach.ts`), call-script route `gpt-4o-mini` | `OPENAI_API_KEY`, `OUTREACH_*` v `env.ts` |
| **Gemini / Replicate / Fal** | — | **not referenced** |
| Stripe | Credits/seats | `STRIPE_*` v `env.ts` + `program-tier-pricing` |

Central env schema: `/workspace/apps/crm/src/config/env.ts`, degraded keys: `DEGRADED_WITHOUT`.

---

## 8. Property photos — upload & storage

| Mechanizmus | Stav |
|-------------|------|
| `properties.images` JSONB | Realvia worker ukladá `advert.images` | `/workspace/apps/crm/src/lib/realvia/processQueue.ts` |
| Parse URL | `parseImages()` v `realvia-property-row.ts` |
| Supabase Storage upload v CRM | **Neimplementované** (schema-gap test explicitne hovorí storage API ≠ tabuľka) |
| AI vision na fotkách | **Ne** |

Media sync: komentár v `processQueue.ts` header; **žiadna `syncMedia` implementácia** v `lib/realvia/`.

---

## 9. Import flows that create listings / properties

| Flow | Entry | Výstup |
|------|-------|--------|
| **Realvia webhook** | `POST /api/webhooks/realvia` | Queue → cron `GET /api/cron/realvia-process` → `processRealviaQueue` → upsert `properties` |
| **UC / Realsoft** | `POST /api/uc/import` → `handleUcImportPost` | `persistUcListing` / agents |
| **Realsoft XML test** | `POST /api/import/test-xml` | Service role + `IMPORT_TEST_API_KEY` header |
| **Universal import** | `POST /api/universal-import/realvia-json` | Dry-run / migration cases |
| **Lead CSV** | `POST /api/import` | **Leads only**, nie listings |
| **Contacts** | `contacts-import-core.ts` | Realvia contacts, nie listings |

Súvisiace: `/workspace/apps/crm/src/lib/importers/realsoft-parser.ts`, `/workspace/apps/crm/src/lib/uc/persist.ts`.

Separate app: `/workspace/apps/realvia-ingestion/` (canonical listing + floorplan media types).

---

## 10. Ďalšie AI features (mimo scope, ale v registry)

Kanón: `/workspace/apps/crm/src/lib/__tests__/revolis-ai-features.test.ts` — scoring, matching, ghostwriter, call AI, decision ops, morning brief, atď. **Žiadna z nich nie je foto/staging/reel.**

---

## Riziká / medzery

1. **Stream route** obchádza kredity, audit a `saveGeneration`.
2. **`CREDITS_ENFORCEMENT` default** = všetky AI listing akcie fakticky zadarmo z ledger pohľadu.
3. **`getFeatureFlagsForPlan` override** = plan gating neodráža produkciu.
4. **PROD schema drift** pre `ai_action_audit` / `ai_generations` (dokumentované v cost telemetry audite).

---

*Overené v repozitári 2026-10-20 (Cloud Agent inventory turn).*
