## Session 2026-09-06
### Dokončené
- Zodpovedaný stav požiadavky p. Smolka na chatbota: verejný chatbot / Website Concierge je zachytený, ale blokovaný cez SMO-B04 až SMO-B09.
- Overené `npx vitest run tests/verification/property-launch-pack-v0.verification.test.ts` — 5/5 PASS pre najbližší Smolko Launch Pack povrch.
- Report: `docs/reports/2026-09-06-smolko-chatbot-status.md`
### Rozpracované / Pending
- `SMO-B04`: PROD cross-tenant negative test + active/freshness contract pred Concierge preview.
- `SMO-B05`: AI disclosure, privacy/retention text, schválené FAQ a human fallback.
- `SMO-B06`: routing matrix + 10 E2E callbackov.
- `SMO-B07`–`SMO-B09`: booking storage drift RCA, Google Calendar OAuth/free-busy, idempotency/notifikácie.
### Kľúčové súbory zmenené
- `docs/reports/2026-09-06-smolko-chatbot-status.md`: stav chatbot požiadavky a blokátorov.
- `memory/session-summary.md`: aktuálny handoff.
### Ďalší krok
Founder/Product GO na `SMO-B04` PROD negative test; bez DB/OAuth/chat endpoint mutácií.

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
