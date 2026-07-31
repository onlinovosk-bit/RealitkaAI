# Generátor inzerátov — Workflow Capability (v2.3)

**Cieľová cesta:** `docs/prompts/inzerat-generator-tab.md`  
**Branch:** `feat/inzerat-generator`  
**Klasifikácia:** Workflow Capability — shipuje sa priebežne  
**Limit PR:** ≤400 riadkov logiky

## Prehľad

Maklér vyplní parametre nehnuteľnosti → AI vygeneruje 4 výstupné bloky (portál, sociálne siete, chýbajúce info, SEO) → 2 kredity sa strhnú až po úspešnom generovaní.

## Architektúra

| Vrstva | Súbor |
|--------|--------|
| SSOT schéma | `src/lib/ai/schemas/listing-output.ts` |
| Vstup formulára | `src/lib/ai/schemas/listing-input.ts` |
| Prompt (verzovaný) | `src/lib/ai/prompts/listing-prompt.ts` — `listing_prompt_v2026_07` |
| Generovanie | `src/lib/ai/generate-listing.ts` |
| Workflow (kredity, idempotency, rate limit) | `src/lib/ai/workflow/listing-workflow.ts` |
| Persistencia | `ai_generations` (generická AI história) |
| API | `POST /api/ai/generate-listing`, `PATCH /api/ai/generate-listing/[id]` |
| UI | `/listings/generator` |

## Kredity a idempotency

- Cena: **2 kredity** (`CREDIT_ACTION_COSTS.listingDescription`)
- `spendCredits` cez RPC `spend_credits` — až po úspešnom LLM výstupe
- Klientsky `idempotencyKey`: `crypto.randomUUID()` — jeden na generovanie
- Duplikát: vráti cached výstup, kredity sa nestrhnu (`spend_credits` skipped)
- Rate limit: **10 generácií/hodinu/maklér**

## DB — `ai_generations`

Generickejší model pre budúce workflow (email, followup, rescore…). Ukladá `input_json`, `model_output`, `prompt_version`, `prompt_hash`, `schema_version`, `generation_status`, `rating`.

## Rollback

1. Revert PR / branch
2. Tabuľka `ai_generations` je forward-only — rollback migrácie len ak neobsahuje produkčné dáta
3. Starý endpoint `/api/ai/listing-content` zostáva nedotknutý

## Nové závislosti

**Žiadne**

## PR 2 (mimo rozsahu)

- Prompt Registry
- Learning Loop z ratingov
- A/B testy promptov

## Testy

```bash
cd apps/crm
npx vitest run src/lib/ai/schemas/__tests__/listing-output.test.ts
npx vitest run src/lib/ai/workflow/__tests__/listing-workflow.test.ts
npx vitest run tests/verification/listing-generator.verification.test.ts
```
