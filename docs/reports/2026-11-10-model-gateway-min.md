# Model Gateway — minimálna implementácia (Fáza B)

**Branch:** `feat/model-gateway-min`  
**Base:** `c5a23644` (main)

## Audit vs repo (zastavené rozpory — implementácia na skutočných cestách)

| Očakávanie GO/auditu | Stav v repe |
| --- | --- |
| `scripts/overnight-runner.mjs` | **Chýba** → izolovaný vstup `scripts/model-gateway/run-synthetic.mjs` |
| `tools/langfuse` v gite | **Nie je** → voliteľný HTTP mirror pri `LANGFUSE_*` env, JSONL ledger ako audit |
| Langfuse už integrovaný v kóde | **Žiadne** `LANGFUSE_*` pred touto zmenou |

`OUTREACH_DAILY_LIMIT` (`apps/crm/src/config/env.ts`) ostáva outreach queue; gateway budget je `MODEL_GATEWAY_*`.

## Rozhranie

`complete(task) → { text, provider, model, tokensIn, tokensOut, costEur, ms, attempts }`

Balík: `packages/model-gateway/`

## Politika

- OpenAI primárne, model musí byť explicitný (`MODEL_GATEWAY_OPENAI_MODEL` alebo `OPENAI_MODEL`).
- Anthropic fallback len ak `MODEL_GATEWAY_ANTHROPIC_FALLBACK_ENABLED=true` a preflight EUR sedí.
- xAI vypnuté (`xaiEnabled: false`).
- Gemini / DeepSeek: governor `provider_not_configured`.
- Kľúče len z env, nikdy v logoch.
- Tvrdé limity: per-task, daily, monthly (EUR).
- Neznáma cena modelu → `unknown_price`, bez volania.
- Fallback len pri rate limit / unavailable; auth a budget bez slučky.
- Ledger append-only JSONL (`MODEL_GATEWAY_LEDGER_PATH`).

## Testy (mock, bez platených API)

```bash
npm run model-gateway:test
```

Pokrytie: OpenAI OK, Anthropic fallback, task budget, unknown price, auth bez fallbacku, 10 syntetických úloh.

## Syntetický beh

```bash
npm run model-gateway:synthetic
```

## Grok Bot (OpenAI, nie xAI)

Postup: `scripts/model-gateway/README.md` + `grok-bot-openai-smoke.mjs` (vyžaduje `MODEL_GATEWAY_ALLOW_LIVE=1`).

## Integrácia

Žiadne napojenie na `scripts/bus/consume.ts` ani CRM workflow v tomto PR.
