# N01 — Cleanup misplaced CRM chatbot

## S2 TASK

Odstráň interný Smolko chatbot z dashboardu `/revolis-ai` a súvisiace API/testy/registry,
pretože požiadavka p. Smolka je **verejný** bot, nie CRM panel.
Vychádzaj z diffu / zámeru [PR #544](https://github.com/onlinovosk-bit/RealitkaAI/pull/544).
Ak #544 je už merged → DONE s dôkazom, nerob duplicitu.

## S3 TERRITORY

**Write (max):**

- `apps/crm/src/components/revolis/SmolkoChatbotPanel.tsx` (delete)
- `apps/crm/src/lib/smolko-chatbot.ts` (delete)
- `apps/crm/src/lib/__tests__/smolko-chatbot.test.ts` (delete)
- `apps/crm/src/app/api/ai/smolko-chat/**` (delete)
- `apps/crm/tests/verification/smolko-chatbot.verification.test.ts` (delete)
- odkazy v `RevolisAIClient.tsx`, `revolis-ai-features.test.ts`, contract baseline **len ak** treba kvôli delete
- `docs/reports/YYYY-MM-DD-smolko-crm-chat-cleanup.md`

**Forbidden:** Voiceflow packaging mimo CRM (ak nie je už v #544 scope a v tvojom write-sete), proxy PUBLIC_PATHS, migrácie

## S4 ACCEPTANCE

- Žiadne application referencie na odstránený chatbot (`rg SmolkoChatbotPanel|smolko-chatbot|/api/ai/smolko-chat`)
- `revolis-ai-features` / relevantné testy PASS
- Report: čo zmizlo + že Concierge ostáva na bránach B04+

## S5 VALIDATION

```bash
gh pr view 544 --json state,mergedAt,url
rg -n "SmolkoChatbotPanel|smolko-chatbot|/api/ai/smolko-chat" apps/crm/src apps/crm/tests || true
npm --prefix apps/crm test -- --run src/lib/__tests__/revolis-ai-features.test.ts
npm --prefix apps/crm run lint
```

## S6 FAILURE

- #544 conflict / iný scope → HUMAN, neforce-push
- Test padá mimo územia → BLOCKED s pathom

## S7 HANDOFF

```text
NODE: N01
RESULT: DONE|BLOCKED|HUMAN
REMOVED: list
TESTS: ...
PR: url or "local only"
```
