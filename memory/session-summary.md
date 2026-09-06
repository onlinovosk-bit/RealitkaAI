## Session 2026-09-06 (Inter-Agent Bus v1.0)
### Dokončené
- REVOLIS Inter-Agent Bus v1.0 vytvorený ako Phase 1 copy-paste protocol pre GPT/SOL ↔ Claude Code.
- Scope zámerne docs-only: STACK 0/2/3/4/7 + Execution Result + Decision Artifact; bez message store/MCP/orchestratora.
- Founder review GO 9/10 zapracovaný: role boundary Founder → SOL/GPT → Bus → Claude Code → Result/Evidence → SOL → Founder, Evolution Rule a friction log.
- Report: `docs/reports/2026-09-06-revolis-inter-agent-bus-v1.md`
### Rozpracované / Pending
- Real Handoff #1 čaká na konkrétnu engineering úlohu; Phase 2 automatizácia ostáva blokovaná pred 3 reálnymi použitiami.
### Kľúčové súbory zmenené
- `docs/prompts/revolis-inter-agent-bus-v1.md`: copy-paste-ready master prompt pre SOL/GPT a Claude Code + šablóny.
- `docs/reports/2026-09-06-revolis-inter-agent-bus-v1.md`: rozhodnutie, scope, overenie, riziká.
- `memory/decisions.md`: decision memory + Engineering justification pre nový governance prompt.
### Ďalší krok
Použiť `docs/prompts/revolis-inter-agent-bus-v1.md` ako povinný formát pri najbližšom konkrétnom engineering handoffe a vyplniť friction log; neautomatizovať Phase 2 pred 3 reálnymi použitiami.

---

## Session 2026-09-06 (PR #473 CI)
### Dokončené
- #471 MERGED. Rovnaký 42501 fail na #473 (docs operator audit, stale main)
- Merge `origin/main` (`a8929c9a`) do `cursor/operator-dashboard-audit-db1f`
- Report: `docs/reports/2026-09-06-pr473-ci-fix.md`
### Rozpracované / Pending
- Founder merge #473 — agent nemerguje
### Kľúčové súbory zmenené
- `docs/reports/2026-09-06-pr473-ci-fix.md`: 42501 + merge main + CI PASS
### Ďalší krok
Founder merge #473.

---

## Session 2026-09-06 (PR #471 CI)
### Dokončené
- CI `Lint, test, build` na #471: FAIL v `valuation-tenants-rls.test.ts` (42501 vs null) — docs PR, oprava už na main `#489`/`a4f58ff1`
- Merge `origin/main` do vetvy; neskôr **MERGED** ako #471
- Report: `docs/reports/2026-09-06-pr471-ci-fix.md`
### Rozpracované / Pending
- nič
### Kľúčové súbory zmenené
- `docs/reports/2026-09-06-pr471-ci-fix.md`: koreň 42501 + merge main + CI PASS
### Ďalší krok
#473 CI.

---

## Session 2026-09-06
### Dokončené
- Interný Smolko CRM chatbot MVP pridaný do `/revolis-ai`: tenant-scoped otázky
  "komu volať", "čo zachrániť", "čo vybaviť" bez externého LLM.
- API: `POST /api/ai/smolko-chat` používa existujúce `listLeads` + `listTasks`,
  `validateBody` a telemetry `ai_chatbot_queries`.
- CI fix: API contract ratchet NOVÉ=0; `/api/ai/smolko-chat` doplnený do
  `REVOLIS_AI_FEATURE_REGISTRY`.
- Overené: targeted chatbot/registry tests 18/18, chatbot unit + verification
  6/6, `npm run lint`, `npm run build`.
- Report: `docs/reports/2026-09-06-smolko-crm-chatbot-mvp.md`
- Zodpovedaný stav požiadavky p. Smolka na chatbota: verejný chatbot / Website Concierge je zachytený, ale blokovaný cez SMO-B04 až SMO-B09.
- Overené `npx vitest run tests/verification/property-launch-pack-v0.verification.test.ts` — 5/5 PASS pre najbližší Smolko Launch Pack povrch.
- Report: `docs/reports/2026-09-06-smolko-chatbot-status.md`
### Rozpracované / Pending
- Verejný Website Concierge stále nie je povolený: SMO-B04–B09 ostávajú brány.
- `SMO-B04`: PROD cross-tenant negative test + active/freshness contract pred Concierge preview.
- `SMO-B05`: AI disclosure, privacy/retention text, schválené FAQ a human fallback.
- `SMO-B06`: routing matrix + 10 E2E callbackov.
- `SMO-B07`–`SMO-B09`: booking storage drift RCA, Google Calendar OAuth/free-busy, idempotency/notifikácie.
### Kľúčové súbory zmenené
- `apps/crm/src/lib/smolko-chatbot.ts`: deterministic CRM assistant engine.
- `apps/crm/src/app/api/ai/smolko-chat/route.ts`: authenticated tenant-scoped chat endpoint.
- `apps/crm/src/components/revolis/SmolkoChatbotPanel.tsx`: dashboard chat UI.
- `apps/crm/src/app/(dashboard)/revolis-ai/RevolisAIClient.tsx`: embeds chat panel.
- `apps/crm/src/lib/usage-metrics.ts`: adds `ai_chatbot_queries` usage metric type.
- `apps/crm/src/lib/__tests__/revolis-ai-features.test.ts`: registers `/api/ai/smolko-chat`.
- `apps/crm/src/lib/__tests__/smolko-chatbot.test.ts`: unit coverage.
- `apps/crm/tests/verification/smolko-chatbot.verification.test.ts`: live spec guard.
- `docs/reports/2026-09-06-smolko-crm-chatbot-mvp.md`: implementation report.
- `docs/reports/2026-09-06-smolko-chatbot-status.md`: stav chatbot požiadavky a blokátorov.
- `memory/session-summary.md`: aktuálny handoff.
### Ďalší krok
Founder/Product GO na `SMO-B04` PROD negative test pre verejný Website Concierge;
bez DB/OAuth/booking mutácií.

---

## Session 2026-09-05 (PR #535 fix-merge-conflicts — CI CLEAN)
### Dokončené
- origin/main merge (clean; 0 textual conflicts)
- onboarding/session api-validate + usage-metrics imports → ratchet NOVÉ=0
- CI green + mergeStateStatus CLEAN on tip `f74ada73` (agent did not merge)
- Report: `docs/reports/2026-09-05-pr535-fix-merge-conflicts.md`
### Rozpracované / Pending
- Founder merge #535
- PROD smoke notification-digest
### Kľúčové súbory zmenené
- `apps/crm/src/app/api/onboarding/session/route.ts`: contract imports only
- `docs/reports/2026-09-05-pr535-fix-merge-conflicts.md`
### Ďalší krok
Founder GO: merge #535; then PROD digest smoke.
