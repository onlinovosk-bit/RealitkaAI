## Session 2026-09-06
### Dokončené
- Interný Smolko CRM chatbot MVP pridaný do `/revolis-ai`: tenant-scoped otázky
  "komu volať", "čo zachrániť", "čo vybaviť" bez externého LLM.
- API: `POST /api/ai/smolko-chat` používa existujúce `listLeads` + `listTasks`.
- Overené: chatbot unit + verification testy 6/6, `npm run lint`, `npm run build`.
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
