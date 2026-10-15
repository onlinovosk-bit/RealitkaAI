# Anthropic prompt cache — inventúra a zásah

**Dátum:** 2026-10-15  
**Vetva:** `cursor/anthropic-prompt-caching-9470`  
**Stav:** IMPLEMENTED / TESTED (lokálne). Nie PRODUCTION. Merge/deploy zakázané týmto zadaním.  
**RAU route:** ASK UNKNOWN → postup ako **revolis** (jediný repo s Claude volaniami); merge/deploy ostáva GO_REQUIRED.

Overený fakt zo zadania: cache na tomto účte funguje; 2. volanie `claude-sonnet-5-5` čítalo **18 031** tokenov z cache.

## Pravidlá (oficiálne min. dĺžky)

Zdroj: [Anthropic prompt caching](https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching) (2026-10).

| Model v repe | ID | Min. cacheovateľný prefix |
|---|---|---|
| Sonnet 4.6 | `claude-sonnet-4-6` | **1 024** tokenov |
| Haiku 4.5 | `claude-haiku-4-5-20251001` | **4 096** tokenov |
| Haiku 3.5 (iba prospecting fetch) | `claude-3-5-haiku-latest` | **2 048** tokenov |

Odhad na eligibilitu: `ceil(chars / 4)`. Billing ide z `usage` (nie z tohto odhadu). Kratší prefix s `cache_control` API ticho ignoruje.

Ceny cache (násobky base input, už v `estimateClaudeCostEur`): write **1,25×**, read **0,1×**.

Žiadny Vercel AI SDK `@ai-sdk/anthropic` v repe nie je. Twilio `messages.create` nie je Claude.

## Call sites

| # | Miesto | Cesta | Model | Prefix (odhad) | Cache | Prečo |
|---|---|---|---|---|---|---|
| 1 | Listing content | `apps/crm/src/lib/ai/listing-content.ts` | Sonnet 4.6 | SYSTEM_PROMPT 15 721 znakov ≈ **3 931** tok. | **ADDED** | Jediný prefix ≥ 1 024. Marker na system, user (nehnuteľnosť) až za breakpointom. |
| 2 | Listing stream | `apps/crm/src/app/api/ai/listing-content/stream/route.ts` | Sonnet 4.6 | ten istý SYSTEM_PROMPT | **ADDED** | Rovnaký prefix; stream obchádza `callClaude`, helper je priamo na `messages.stream`. |
| 3 | `callClaude` wrapper | `apps/crm/src/lib/ai/claude.ts` | — | — | safety net | `applyCachedSystem` + log `cache_write` / `cache_read`. Nemení model ani text. |
| 4 | Auto-reply | `apps/crm/src/lib/inbound/auto-reply.ts` | Haiku 4.5 | ~49 tok. | SKIPPED | ≪ 4 096 |
| 5 | Demand extract | `apps/crm/src/lib/demand/extract.ts` | Haiku 4.5 | ~370 tok. | SKIPPED | ≪ 4 096 |
| 6 | Open follow-up | `apps/crm/src/lib/ai/open-followup-generator.ts` | Haiku 4.5 | ~139 tok. | SKIPPED | ≪ 4 096 |
| 7 | Playbook brief | `apps/crm/src/lib/ai/playbook-brief.ts` | Haiku 4.5 | ~55 tok. | SKIPPED | ≪ 4 096 |
| 8 | Dashboard insights | `apps/crm/src/lib/ai/dashboard-insights.ts` | Haiku 4.5 | ~120 tok. | SKIPPED | ≪ 4 096 |
| 9 | Lead triage batch | `apps/crm/src/lib/ai/lead-triage-batch.ts` | Haiku 4.5 | ~314 tok. | SKIPPED | ≪ 4 096 |
| 10 | Rescue message | `apps/crm/src/lib/ai/rescue-message.ts` | Haiku 4.5 | ~58 tok. | SKIPPED | ≪ 4 096; priamy SDK, nie `callClaude` |
| 11 | Dead-lead campaign | `apps/crm/src/lib/ai/dead-lead-campaign.ts` | Haiku 4.5 | ~70 tok. | SKIPPED | ≪ 4 096 |
| 12 | Sales brain | `apps/crm/src/lib/ai/sales-brain.ts` | Haiku 4.5 | ~42 tok. | SKIPPED | ≪ 4 096 |
| 13 | Deal strategy | `apps/crm/src/lib/ai/deal-strategy.ts` | Haiku 4.5 | ~47 tok. | SKIPPED | ≪ 4 096 |
| 14 | Call coach | `apps/crm/src/lib/ai/call-coach.ts` | Haiku 4.5 | ~57 tok. | SKIPPED | ≪ 4 096 |
| 15 | Call analysis | `apps/crm/src/lib/ai/call-analysis.ts` | Haiku 4.5 | ~54 tok. | SKIPPED | ≪ 4 096 |
| 16 | Morning brief text | `apps/crm/src/lib/morning-brief/generators/ai-text.ts` | Haiku 4.5 | A ~192 / B ~116 / subject ~38 | SKIPPED | ≪ 4 096 |
| 17 | Multi-channel AI reply | `apps/crm/src/lib/multi-channel-sender.ts` `generateAiReply` | Haiku 4.5 | ~43 tok. + štýl kanála | SKIPPED | ≪ 4 096; kanál je premenná — cache by sa aj tak drobila |
| 18 | Call-coach stream | `apps/crm/src/app/api/ai/call-coach/stream/route.ts` | Haiku 4.5 | ~57 tok. | SKIPPED | ≪ 4 096 |
| 19 | Demo recap | `apps/crm/src/lib/demo-ops/recap-generator.ts` | Haiku 4.5 | ~5 viet | SKIPPED | ≪ 4 096 |
| 20 | Prospecting personalize | `scripts/prospecting/lib/personalize.ts` | Haiku 3.5 | 1 veta, bez system | SKIPPED | žiadny stabilný prefix; ≪ 2 048 |

Predtým mali Haiku sitami natvrdo `cache_control` na krátkom system — API to ignorovalo (žiadna úspora, žiadna chyba). Helper marker **nepridá**, kým prefix nedosiahne min.

## Usage / cost

Kde sa tokeny už logovali, pribudli `cache_creation_input_tokens` a `cache_read_input_tokens`:

- `callClaude` stderr: `in:… out:… cache_write:… cache_read:…`
- dashboard insights `audit.usage` + cron `ai_action_audit.meta`
- listing `ListingContentAudit` + `logAiAction.meta` na POST `/api/ai/listing-content`
- call-coach stream `logAiAction.meta` + cost s cache sadzbou

`estimateClaudeCostEur` berie voliteľný cache write/read (1,25× / 0,1×). Bez cache argumentu ostáva predošlý výpočet.

Listing stream usage **predtým nelogoval** — nič nové som tam nepridával (zadanie: len kde usage už je).

## Očakávaná úspora

**Jediný reálny cash:** listing Sonnet (sync + stream).

- Stabilný prefix ≈ 3 931 tok. (merané `SYSTEM_PROMPT.length = 15 721`).
- Base Sonnet input v kóde: 3 USD / MTok → prefix ≈ **0,0118 USD** na volanie bez cache.
- 1. volanie v 5-min okne: write 1,25× ≈ **0,0147 USD** (+25 %).
- Ďalšie volania v TTL: read 0,1× ≈ **0,0012 USD** (≈ **90 % dole** na system input).
- Break-even: **2. volanie** v okne. 3 listingy za sebou: ~0,017 USD vs 0,035 USD na prefix (−50 %). 10 listingov v okne: ~0,026 vs 0,118 (−78 % na prefix).
- Founderov dôkaz 18 031 read tokenov na sonnet-5-5 je **vyšší** než náš system-only odhad — v live requeste je v cache aj režijná časť requestu. Ak sa to zopakuje, úspora na hit je ~18k × 2,70 USD/MTok ≈ **0,049 USD** namiesto 0,005 USD. To neprehlasujem za merané na `claude-sonnet-4-6` v tomto PR.

**Haiku sitami: 0 USD.** Prefixy sú 10–30× pod 4 096. Marker by nič nezapísal.

Žiadny tool catalog ani few-shot blok v týchto volaniach nie je dosť dlhý na druhý breakpoint bez zmeny významu promptu — to som nerobil.

## Čo sa nemenilo

- Výber modelu (`CLAUDE_SONNET` / `CLAUDE_HAIKU`).
- Text a význam system/user promptov.
- Výstupný JSON kontrakt listing / insights / triage.
- Žiadny merge, žiadny deploy, žiadny secret.

## Testy

- `apps/crm/src/lib/ai/__tests__/prompt-cache.test.ts`
- `apps/crm/src/lib/ai/__tests__/listing-content-cache.test.ts`
- `apps/crm/tests/verification/anthropic-prompt-cache.verification.test.ts`
- úpravy `llm-usage-cost`, `dashboard-insights-usage`, `dashboard-insights-cron`, `demand/extract`

## Riziká

- TTL cache je 5 min (default ephemeral). Úspora je na burst listingov, nie na 1 listing / hodinu.
- Prvý hit v okne stojí +25 % na prefix. Pri jednom listingovom volaní za okno je to mierne drahšie, nie lacnejšie.
- `chars/4` je eligibilita, nie billing. Listing 3 931 < 4 096, preto Haiku by tento prefix aj tak necachoval — listing ide cez Sonnet.
- Stream listing stále neloguje usage (bolo tak).
