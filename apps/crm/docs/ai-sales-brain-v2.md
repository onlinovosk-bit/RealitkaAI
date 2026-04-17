# REVOLIS AI Sales Brain v2

**Produkt:** AI Sales Brain (nie CRM) — kombinuje CRM heuristiku, multi-model skóre, confidence, time-to-close, explainability a self-learning váhy.

## Moduly

| Súbor | Účel |
|-------|------|
| `src/lib/ai/signals.ts` | `SalesBrainSignals`, `buildSalesBrainSignals`, mapovanie na váhy |
| `src/lib/ai/email-engagement-store.ts` | Agregované open/click z Resend webhookov (`.data/email-engagement.json`) |
| `src/lib/ai/confidence.ts` | AI Confidence 0–100 |
| `src/lib/ai/multi-model.ts` | Engagement / intent / timing / behavioral |
| `src/lib/ai/time-to-close.ts` | Heuristický počet dní |
| `src/lib/ai/sales-brain.ts` | `generateAISalesBrainProfile` — master kombinácia |
| `src/lib/ai/brain-rescore.ts` | `computeBrainRescorePayload` pre `rescore-lead` |
| `src/lib/ai/ai-engine-types.ts` | Typ `AiEngineSnapshot` (JSON stĺpec) |
| `src/lib/ai/scoring-engine.ts` | Váhované signály (self-learning váhy) |
| `src/lib/ai/learning-store.ts` + `auto-tune.ts` | Ukladanie outcomes a úprava váh |

## API

- `GET /api/leads/[id]/sales-brain` — JSON `{ profile }` (vyžaduje session pri zapnutom Supabase).

## Resend: reálne open / click

- Pri odoslaní AI emailu (`outreach-store`) sa posielajú **tagy** `lead_id` = UUID leadu.
- Webhook `POST /api/resend-webhook` spracuje `email.opened` a `email.clicked` (Resend formát: `type`, `data.tags.lead_id`).
- V Resend dashboarde musí byť webhook nasmerovaný na túto URL a zapnuté udalosti **Opened** / **Clicked**.

## DB: `ai_engine` (jsonb)

Migrácia: `supabase/migrations/20260416_leads_ai_engine.sql`

Snapshot: `version`, `combinedScore`, `legacyScore`, `confidence`, `timeToCloseDays`, `updatedAt`.

## `rescore-lead` a stĺpec `score`

| Env | Správanie |
|-----|-----------|
| `LEAD_SCORE_SOURCE=crm` (predvolené) | `leads.score` = čistý CRM výstup (`calculateLeadAiScore`) |
| `LEAD_SCORE_SOURCE=combined` | `leads.score` = kombinovaný Brain skóre (rovnaká logika ako v `generateAISalesBrainProfile`) |

`ai_engine` sa zapisuje vždy (ak stĺpec existuje); pri chýbajúcom stĺpci sa zápis preskočí.

## Agregácia skóre (Brain panel)

`score = round(0.45 × legacy CRM + 0.35 × multi-model + 0.20 × weighted signal score)`.

## Env (zhrnutie)

| Premenná | Účel |
|----------|------|
| `LEAD_SCORE_SOURCE` | `crm` \| `combined` — čo sa ukladá do `leads.score` |
| (existujúce) | Resend, Supabase, OpenAI pre insight |

Self-learning: `.data/signal-weights.json`, `.data/outcomes.jsonl`.  
Email engagement: `.data/email-engagement.json` (gitignored cez `.data/`).

## Test a overenie PROD

| Príkaz | Účel |
|--------|------|
| `npm run test:unit` | Vitest |
| `npm run lint` | ESLint |
| `npm run build` | Next build |
| `BASE_URL=https://app.revolis.ai LEAD_ID=<uuid> COOKIE="..." npm run verify:sales-brain` | Overenie endpointu po deployi (cookie z prihlásenej session; bez cookie očakávaj 401) |

## Rollback

- Git revert.
- Migráciu `ai_engine` stĺpca nechajte (nullable), alebo `alter table ... drop column` len ak ste si istí.

## Performance / bezpečnosť

- **Backward compatibility:** predvolený `LEAD_SCORE_SOURCE=crm` zachováva význam `score` ako doteraz; Brain snapshot je v `ai_engine`.
- **Auth:** `/api/leads/.../sales-brain` — pri Supabase bez profilu 401.
