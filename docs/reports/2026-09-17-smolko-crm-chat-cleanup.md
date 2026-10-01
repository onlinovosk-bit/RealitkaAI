# Smolko CRM chatbot cleanup (N01)

**Dátum:** 2026-09-17  
**Uzol:** N01  
**Vetva:** `exec/smolko-concierge-w1-w3`  
**Zámer:** [PR #544](https://github.com/onlinovosk-bit/RealitkaAI/pull/544) (stav pri práci: **OPEN**, ešte unmerged)  
**Verdikt:** interný dashboard chatbot odstránený z CODE; verejný Website Concierge ostáva na bránach B04+.

## 1. Prečo

Požiadavka p. Smolka je **verejný** asistent nad ponukami (Website Concierge), nie interný panel na `/revolis-ai`. Misplaced CRM chat (`SmolkoChatbotPanel` + `POST /api/ai/smolko-chat`) nie je zákaznícka požiadavka a mýlil stav „máme chatbota“.

## 2. Čo zmizlo

| Položka | Akcia |
|---|---|
| `apps/crm/src/components/revolis/SmolkoChatbotPanel.tsx` | delete |
| `apps/crm/src/lib/smolko-chatbot.ts` | delete |
| `apps/crm/src/lib/__tests__/smolko-chatbot.test.ts` | delete |
| `apps/crm/src/app/api/ai/smolko-chat/route.ts` | delete |
| `apps/crm/src/app/api/ai/smolko-chat/__tests__/route.test.ts` | delete |
| `apps/crm/tests/verification/smolko-chatbot.verification.test.ts` | delete |
| Import + mount v `RevolisAIClient.tsx` | removed |
| Registry entry `smolko-crm-chatbot` v `revolis-ai-features.test.ts` | removed |
| Metric `ai_chatbot_queries` v `usage-metrics.ts` | removed (jediný konzument bol smolko-chat route) |

**Mimo write-setu N01 (zámerne nedotknuté):** Voiceflow packaging, `memory/**`, proxy `PUBLIC_PATHS`, docs/briefs Voiceflow z #544.

## 3. Overenie (S5)

```text
gh pr view 544 → state=OPEN, mergedAt=null
rg SmolkoChatbotPanel|smolko-chatbot|/api/ai/smolko-chat → 0 hits v apps/crm/src + apps/crm/tests
npm --prefix apps/crm test -- --run src/lib/__tests__/revolis-ai-features.test.ts
npm --prefix apps/crm run lint
```

**Výsledky (2026-09-17, worker N01):**

| Kontrola | Výsledok |
|---|---|
| `gh pr view 544` | `state=OPEN`, `mergedAt=null` |
| `rg` application refs | 0 hits |
| `revolis-ai-features.test.ts` | 1 file, 12 tests PASS |
| `npm run lint` | PASS (exit 0) |

## 4. Concierge brány (nezmenené týmto uzlom)

Cleanup **neznamená** verejný bot PASS. Ostáva:

| Brána | Význam |
|---|---|
| B04 | PROD inventory / freshness / cross-tenant dôkaz |
| B05 | AI disclosure / privacy / FAQ GO |
| B06 | callback routing matrix |
| B07+ | scheduled_events + calendar + idempotent confirm |

Verejný Concierge UI/API na webe Reality Smolko je mimo N01 (N07+).

## 5. Vzťah k PR #544

Lokálna N01 práca sleduje CRM cleanup diff #544. #544 ešte obsahuje Voiceflow packaging + `memory/**` — to N01 **neopakuje** (write-set + zákaz memory). Orchestrátor môže #544 uzavrieť alebo nahradiť týmto CRM-only diffom.
