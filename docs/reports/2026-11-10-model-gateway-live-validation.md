# Model Gateway — live validation (PR #947)

**Branch:** `feat/model-gateway-min` · **HEAD:** `47ea7f04` · **PR:** [#947](https://github.com/onlinovosk-bit/RealitkaAI/pull/947)  
**Čas auditu (Europe/Bratislava):** 2026-11-10

## 1. Diff a bezpečnostné limity (code review)

| Kontrola | Verdikt | Dôkaz |
| --- | --- | --- |
| API kľúče len z env | PASS | `loadConfigFromEnv` → `OPENAI_API_KEY` / `ANTHROPIC_API_KEY`; žiadny hardcode |
| Kľúče nie v stdout/stderr smoke | PASS | `grok-bot-openai-smoke.mjs` loguje len `out.*` polia; grep `packages/model-gateway` bez logovania key |
| xAI zakázané | PASS | `xaiEnabled: false` + `preflightCost` → `xai_disabled` |
| Anthropic fallback default OFF | PASS | `readBool(..., false)`; smoke `MODEL_GATEWAY_ANTHROPIC_FALLBACK_ENABLED ??= "false"` |
| Preflight pred HTTP | PASS | `preflightCost` pred `invokeProvider` v `gateway.ts` |
| Neznáma cena → stop | PASS | `unknown_price` v `governor.ts` |
| Auth chyba → bez fallbacku | PASS | `first.kind === "auth"` → throw, žiadny Anthropic path |
| Budget → bez fallbacku | PASS | budget bloká v preflight pred volaním |
| Prod napojenie | PASS (žiadne) | Diff neobsahuje `consume.ts`, CRM routes, deploy |
| Smoke nevolá OpenAI mimo gateway | PASS | `createModelGateway()` + `gw.complete()`; žiadny `fetch` v `scripts/model-gateway/` |

**Medzera (nezablokuje audit, dôležité pre GO live):** `MODEL_GATEWAY_MAX_ATTEMPTS` default **3**. Pri zapnutom Anthropic fallback a OpenAI rate-limit by mohlo nastať **druhé platené** volanie. Pri `ANTHROPIC_FALLBACK_ENABLED=false` (povinné pre tento test) je max **1** OpenAI HTTP pokus na `complete()`.

## 2. Výpočet cien a preflight (gpt-4o-mini, EUR)

Statický snapshot `pricing.ts` (USD→EUR 0.92). Preflight = horný odhad (max input + max output tokeny).

| maxInput | maxOutput | odhad max EUR | ≤ 0,02 task | ≤ 0,05 daily reserve |
| --- | --- | --- | --- | --- |
| 4096 | 1024 | 0.00113 | áno | áno |
| 512 | 128 | 0.000141 | áno | áno |
| 256 | 64 | 0.000071 | áno | áno |

Pri env `MODEL_GATEWAY_PER_TASK_LIMIT_EUR=0.02` a `MODEL_GATEWAY_DAILY_LIMIT_EUR=0.05` a modeli `gpt-4o-mini` gateway **vie zastaviť** request pred odoslaním (prázdny ledger).

Skutočná cena po odpovedi: `actualCostEur()` z reálnych tokenov (nie vendor invoice).

## 3. OPENAI_API_KEY v agent prostredí

```text
OPENAI_API_KEY=unset
ANTHROPIC_API_KEY=unset
```

(presence check v shelli — hodnota sa nevypisuje)

## 4. Živý smoke — NEVYKONANÝ (BLOCKED)

**Dôvod:** chýba `OPENAI_API_KEY` v tomto cloud agent VM. Bez kľúča smoke končí exit 2 (`Set OPENAI_API_KEY for live smoke.`).

Pripravený príkaz pre founder lokál / prostredie s kľúčom (1× platené volanie):

```bash
export OPENAI_API_KEY=...   # lokálne, nie do logu
export MODEL_GATEWAY_OPENAI_MODEL=gpt-4o-mini
export MODEL_GATEWAY_PER_TASK_LIMIT_EUR=0.02
export MODEL_GATEWAY_DAILY_LIMIT_EUR=0.05
export MODEL_GATEWAY_MONTHLY_LIMIT_EUR=25
export MODEL_GATEWAY_MAX_INPUT_TOKENS=256
export MODEL_GATEWAY_MAX_OUTPUT_TOKENS=64
export MODEL_GATEWAY_MAX_ATTEMPTS=1
export MODEL_GATEWAY_ANTHROPIC_FALLBACK_ENABLED=false
export MODEL_GATEWAY_ALLOW_LIVE=1
export MODEL_GATEWAY_LEDGER_PATH=var/model-gateway/live-validation.jsonl
export GROK_BOT_PROMPT='Reply with exactly: gateway smoke ok.'
node scripts/model-gateway/grok-bot-openai-smoke.mjs
```

Po behu overiť: `tail -1 var/model-gateway/live-validation.jsonl` — musí byť `"provider":"openai"`, žiadny `anthropic` / `xai`.

## 5. HTTP/API výsledok živého testu

**NOT_RUN** — pozri sekciu 4.

## 6. Ďalší krok (jeden)

Doplniť `OPENAI_API_KEY` do trusted prostredia (founder laptop alebo Cloud Agent secret), spustiť blok príkazov vyššie, pripojiť JSON výstup + posledný riadok JSONL do tohto reportu (alebo nového `…-live-validation-pass.md`) a až potom GO na úzke napojenie gateway na izolovaný BUS task (stále bez prod CRM).
