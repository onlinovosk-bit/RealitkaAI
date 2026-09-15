## Session 2026-09-15 (typecheck paydown package PREPARED)
### Dokončené
- Balík `docs/overnight/2026-09-16-typecheck-paydown-loop/` nainštalovaný; PR #556
- Hard gate: #554+#555 merged on main; launch-record NOT_LAUNCHED
### Rozpracované / Pending
- Founder podpis launch-record → LAUNCH_AUTHORIZED → W0
### Ďalší krok
Founder: vyplň start_at/deadline_at/runner + podpis; potom GO na W0.
## Session 2026-09-14 (CI billing local evidence)
### DokonÄŤenĂ©
- LokĂˇlny nĂˇhradnĂ˝ dĂ´kaz za zablokovanĂ© GitHub Actions (billing lock) pre #548/#549/#550
- Report: `docs/reports/2026-09-14-ci-billing-local-evidence.md`
- Code Contract + Memory Engine PASS lokĂˇlne; Lint/test/build ÄŤiastoÄŤne (RLS/build neoverenĂ© v sandboxe)
### RozpracovanĂ© / Pending
- Org owner: odomknĂşĹĄ GitHub billing, potom re-run CI
- Merge #548/#549/#550 aĹľ po zelenom CI alebo explicitnom GO s tĂ˝mto dĂ´kazom
### KÄľĂşÄŤovĂ© sĂşbory zmenenĂ©
- `docs/reports/2026-09-14-ci-billing-local-evidence.md`: nĂˇhradnĂ˝ dĂ´kaz
### ÄŽalĹˇĂ­ krok
Founder: fix GitHub billing â†’ re-run CI â†’ merge HIGH fix PR.

---

## Session 2026-09-05 (Ruflo overnight â€” branch docs/ruflo-overnight-prepared)
### DokonÄŤenĂ©
- Overnight package + research run on this branch: PREPARED â†’ run 20260905T2304 â†’ **VALIDATE_FIRST / NO_GO_IMPLEMENTATION**
- Package: docs/overnight/2026-09-05-ruflo-swarm/
- Reports under docs/reports/ and output/overnight/ artifacts on this branch
### RozpracovanĂ© / Pending
- Founder review of overnight handoff / PR #536 after rebase onto current main
- No implementation from overnight recommendations without separate GO
### KÄľĂşÄŤovĂ© sĂşbory zmenenĂ©
- docs/overnight/2026-09-05-ruflo-swarm/*
- overnight reports / amendments on this docs branch
### ÄŽalĹˇĂ­ krok
Founder review PR #536; do not treat research as implementation authorization.

---

## Session 2026-09-06 (Inter-Agent Bus v1.0)
### DokonÄŤenĂ©
- REVOLIS Inter-Agent Bus v1.0 vytvorenĂ˝ ako Phase 1 copy-paste protocol pre GPT/SOL â†” Claude Code.
- Scope zĂˇmerne docs-only: STACK 0/2/3/4/7 + Execution Result + Decision Artifact; bez message store/MCP/orchestratora.
- Founder review GO 9/10 zapracovanĂ˝: role boundary Founder â†’ SOL/GPT â†’ Bus â†’ Claude Code â†’ Result/Evidence â†’ SOL â†’ Founder, Evolution Rule a friction log.
- Report: `docs/reports/2026-09-06-revolis-inter-agent-bus-v1.md`
### RozpracovanĂ© / Pending
- Real Handoff #1 ÄŤakĂˇ na konkrĂ©tnu engineering Ăşlohu; Phase 2 automatizĂˇcia ostĂˇva blokovanĂˇ pred 3 reĂˇlnymi pouĹľitiami.
### KÄľĂşÄŤovĂ© sĂşbory zmenenĂ©
- `docs/prompts/revolis-inter-agent-bus-v1.md`: copy-paste-ready master prompt pre SOL/GPT a Claude Code + ĹˇablĂłny.
- `docs/reports/2026-09-06-revolis-inter-agent-bus-v1.md`: rozhodnutie, scope, overenie, rizikĂˇ.
- `memory/decisions.md`: decision memory + Engineering justification pre novĂ˝ governance prompt.
### ÄŽalĹˇĂ­ krok
PouĹľiĹĄ `docs/prompts/revolis-inter-agent-bus-v1.md` ako povinnĂ˝ formĂˇt pri najbliĹľĹˇom konkrĂ©tnom engineering handoffe a vyplniĹĄ friction log; neautomatizovaĹĄ Phase 2 pred 3 reĂˇlnymi pouĹľitiami.

---

## Session 2026-09-06 (PR #473 CI)
### DokonÄŤenĂ©
- #471 MERGED. RovnakĂ˝ 42501 fail na #473 (docs operator audit, stale main)
- Merge `origin/main` (`a8929c9a`) do `cursor/operator-dashboard-audit-db1f`
- Report: `docs/reports/2026-09-06-pr473-ci-fix.md`
### RozpracovanĂ© / Pending
- Founder merge #473 â€” agent nemerguje
### KÄľĂşÄŤovĂ© sĂşbory zmenenĂ©
- `docs/reports/2026-09-06-pr473-ci-fix.md`: 42501 + merge main + CI PASS
### ÄŽalĹˇĂ­ krok
Founder merge #473.

---

## Session 2026-09-06 (PR #471 CI)
### DokonÄŤenĂ©
- CI `Lint, test, build` na #471: FAIL v `valuation-tenants-rls.test.ts` (42501 vs null) â€” docs PR, oprava uĹľ na main `#489`/`a4f58ff1`
- Merge `origin/main` do vetvy; neskĂ´r **MERGED** ako #471
- Report: `docs/reports/2026-09-06-pr471-ci-fix.md`
### RozpracovanĂ© / Pending
- niÄŤ
### KÄľĂşÄŤovĂ© sĂşbory zmenenĂ©
- `docs/reports/2026-09-06-pr471-ci-fix.md`: koreĹ 42501 + merge main + CI PASS
### ÄŽalĹˇĂ­ krok
#473 CI.

---

## Session 2026-09-06
### DokonÄŤenĂ©
- InternĂ˝ Smolko CRM chatbot MVP pridanĂ˝ do `/revolis-ai`: tenant-scoped otĂˇzky
  "komu volaĹĄ", "ÄŤo zachrĂˇniĹĄ", "ÄŤo vybaviĹĄ" bez externĂ©ho LLM.
- API: `POST /api/ai/smolko-chat` pouĹľĂ­va existujĂşce `listLeads` + `listTasks`,
  `validateBody` a telemetry `ai_chatbot_queries`.
- CI fix: API contract ratchet NOVĂ‰=0; `/api/ai/smolko-chat` doplnenĂ˝ do
  `REVOLIS_AI_FEATURE_REGISTRY`.
- OverenĂ©: targeted chatbot/registry tests 18/18, chatbot unit + verification
  6/6, `npm run lint`, `npm run build`.
- Report: `docs/reports/2026-09-06-smolko-crm-chatbot-mvp.md`
- ZodpovedanĂ˝ stav poĹľiadavky p. Smolka na chatbota: verejnĂ˝ chatbot / Website Concierge je zachytenĂ˝, ale blokovanĂ˝ cez SMO-B04 aĹľ SMO-B09.
- OverenĂ© `npx vitest run tests/verification/property-launch-pack-v0.verification.test.ts` â€” 5/5 PASS pre najbliĹľĹˇĂ­ Smolko Launch Pack povrch.
- Report: `docs/reports/2026-09-06-smolko-chatbot-status.md`
### RozpracovanĂ© / Pending
- VerejnĂ˝ Website Concierge stĂˇle nie je povolenĂ˝: SMO-B04â€“B09 ostĂˇvajĂş brĂˇny.
- `SMO-B04`: PROD cross-tenant negative test + active/freshness contract pred Concierge preview.
- `SMO-B05`: AI disclosure, privacy/retention text, schvĂˇlenĂ© FAQ a human fallback.
- `SMO-B06`: routing matrix + 10 E2E callbackov.
- `SMO-B07`â€“`SMO-B09`: booking storage drift RCA, Google Calendar OAuth/free-busy, idempotency/notifikĂˇcie.
### KÄľĂşÄŤovĂ© sĂşbory zmenenĂ©
- `apps/crm/src/lib/smolko-chatbot.ts`: deterministic CRM assistant engine.
- `apps/crm/src/app/api/ai/smolko-chat/route.ts`: authenticated tenant-scoped chat endpoint.
- `apps/crm/src/components/revolis/SmolkoChatbotPanel.tsx`: dashboard chat UI.
- `apps/crm/src/app/(dashboard)/revolis-ai/RevolisAIClient.tsx`: embeds chat panel.
- `apps/crm/src/lib/usage-metrics.ts`: adds `ai_chatbot_queries` usage metric type.
- `apps/crm/src/lib/__tests__/revolis-ai-features.test.ts`: registers `/api/ai/smolko-chat`.
- `apps/crm/src/lib/__tests__/smolko-chatbot.test.ts`: unit coverage.
- `apps/crm/tests/verification/smolko-chatbot.verification.test.ts`: live spec guard.
- `docs/reports/2026-09-06-smolko-crm-chatbot-mvp.md`: implementation report.
- `docs/reports/2026-09-06-smolko-chatbot-status.md`: stav chatbot poĹľiadavky a blokĂˇtorov.
- `memory/session-summary.md`: aktuĂˇlny handoff.
### ÄŽalĹˇĂ­ krok
Founder/Product GO na `SMO-B04` PROD negative test pre verejnĂ˝ Website Concierge;
bez DB/OAuth/booking mutĂˇciĂ­.

---

## Session 2026-09-05 (PR #535 fix-merge-conflicts â€” CI CLEAN)
### DokonÄŤenĂ©
- origin/main merge (clean; 0 textual conflicts)
- onboarding/session api-validate + usage-metrics imports â†’ ratchet NOVĂ‰=0
- CI green + mergeStateStatus CLEAN on tip `f74ada73` (agent did not merge)
- Report: `docs/reports/2026-09-05-pr535-fix-merge-conflicts.md`
### RozpracovanĂ© / Pending
- Founder merge #535
- PROD smoke notification-digest
### KÄľĂşÄŤovĂ© sĂşbory zmenenĂ©
- `apps/crm/src/app/api/onboarding/session/route.ts`: contract imports only
- `docs/reports/2026-09-05-pr535-fix-merge-conflicts.md`
### ÄŽalĹˇĂ­ krok
Founder GO: merge #535; then PROD digest smoke.

---

## Session 2026-09-13 (critical-bug automation)
### DokonÄŤenĂ©
- Found + fixed silent demo CRM task drop (`createDemoBookingTask` / sales-funnel demo-request)
- PR: https://github.com/onlinovosk-bit/RealitkaAI/pull/546
- Report: `docs/reports/2026-09-13-demo-booking-task-service-role.md`
### RozpracovanĂ© / Pending
- Prior open critical fixes still awaiting review: #369 #370 #443 #444 #447 #462 #486 #490 #495 #537 #545 #546
### KÄľĂşÄŤovĂ© sĂşbory zmenenĂ©
- `apps/crm/src/lib/demo-booking-store.ts`: service-role for orphan task insert
- `apps/crm/src/app/api/sales-funnel/demo-request/route.ts`: pass service + fail if task fails
- `apps/crm/src/lib/sales-funnel-store.ts`: throw on saas_leads insert error
### ÄŽalĹˇĂ­ krok
Founder review/merge #546 (and backlog of open critical fix PRs).

