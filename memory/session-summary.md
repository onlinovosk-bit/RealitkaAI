## Session 2026-09-14 (ADR Soft Factory V1 Minimum)
### Dokončené
- Ingest founder ADR z Downloads → `docs/architecture/adr-2026-09-11b-software-factory-v1-minimum.md`
- Kontrolór check vs `origin/main` @ `97655763b`: TASK-0008 schema gap overený; expectedFileHash/BUS-004 hash dôkaz na tip main neoverený
- Report: `docs/reports/2026-09-14-adr-software-factory-v1-minimum.md`
### Rozpracované / Pending
- Founder GO na rozhodnutia #1 (V1 Minimum) a #4 (Judge = spúšťač kontrol); potom schema `acceptance`+`budget` + runner + ledger
- Dohľadať artefakt BUS-004 / expectedFileHash hardening (nie na tip main)
### Kľúčové súbory zmenené
- `docs/architecture/adr-2026-09-11b-software-factory-v1-minimum.md`: NÁVRH V1 Minimum
- `docs/reports/2026-09-14-adr-software-factory-v1-minimum.md`: ingest + verification
### Ďalší krok
Founder: rozhodni #1 a #4 (V1 Minimum + Judge-as-runner). Bez GO neimplementovať.
## Session 2026-08-18

### Dokončené
- Kontrolor review PR #439: found remaining unknown-commit retry duplicate risk.
- Follow-up branch `cursor/acquire-email-idempotency-dabc`: deterministic `leads.id` from acquire dedup key.
- Report: `docs/reports/2026-08-18-acquire-email-idempotency-followup.md`

### Rozpracované / Pending
- Verify/push/open PR for `cursor/acquire-email-idempotency-dabc`.
- Open critical-bug PRs awaiting review: #369, #370, #371, #374, #392, #401, #427, #438, #439
- Stage 1 acquisition — only on explicit founder GO

### Kľúčové súbory zmenené
- `apps/crm/src/app/api/acquire/email/route.ts`: deterministic lead id + existing-lead response on primary-key retry.
- `apps/crm/src/app/api/acquire/email/__tests__/route.test.ts`: unknown commit retry test.
- `apps/crm/tests/verification/acquire-email-gateway.verification.test.ts`: live-spec for deterministic idempotency.

### Ďalší krok
Run targeted tests, push branch, open draft PR. Do not merge #439 without idempotency follow-up.
## Session 2026-09-15 (critical bug hunt — match status scoped)
### Dokončené
- #510 / #511 merged (roadmap overlay + Launch Pack V0 docs)
- Mapper-depth amendment: `mapTransaction` P0, zlé 13/14, PREDANÉ v title, governance riadky≠správnosť
### Rozpracované / Pending
- Founder: vyžiadať Realvia číselník (category + transaction)
- Mapper P0 + backfill — samostatné GO (nie teraz)
- Launch Pack implement — až po mapper P0 + `GO IMPLEMENT…`
### Kľúčové súbory zmenené
- `docs/reports/2026-09-03-realvia-mapper-depth-amendment.md`
- `docs/reports/2026-09-03-property-launch-pack-integration.md` (doplnené)
### Ďalší krok
Oficiálny číselník od Realvie; žiadny GO IMPLEMENT Launch Pack.
- HIGH: match status PATCH cookie-less write drop → fix + tests + PR
- Report: `docs/reports/2026-09-15-match-status-scoped-client.md`
### Rozpracované / Pending
- Founder merge fix/match-status-scoped-client
- Noted (not fixed): team/users INSERT RLS hole; /management SSR unscoped lists
- Tracked open bug PRs still awaiting review (#369 #370 #443 #444 #447 #462 #486 #490 #495 #537 #545 #548)
### Kľúčové súbory
- `apps/crm/src/lib/matching-store.ts`: scoped arg on updateLeadPropertyMatchStatus
- `apps/crm/src/app/api/leads/[id]/matches/[matchId]/route.ts`: thread client + fail-closed agency
- `apps/crm/src/lib/leads-store.ts`: addLeadActivity scoped forward
### Ďalší krok
Founder: review/merge match-status PR; next candidate team/users INSERT path (GO).

﻿## Session 2026-09-15 (north-star W2 measurement amendments)
### Dokončené
- Founder GO `north-star-backfill-nalezy.md` → `docs/reports/2026-09-15-north-star-backfill-nalezy.md`
- SQL: `leads_new_real` / `leads_new_seed` v `scripts/sql/north-star-day.sql` + founder_batch `queries-to-run.sql`
- `docs/ops/config-changelog.md` (FOUNDER_EMAILS ~2026-09-10); schéma + atribúcia v START-HERE
- Metrics jsonl: `config_changes_that_day` na 2026-09-10; `lead_split=pending_founder_batch_re_run` (bez vymyslených per-day real/seed)
- Push na otvorené PR #558
### Rozpracované / Pending
- Founder re-batch `queries-to-run.sql` → nový `results.json` → jsonl s `lead.new_real` / `new_seed`
- Founder merge #558 (NEMERGE agentom)
### Kľúčové súbory
- `docs/reports/2026-09-15-north-star-backfill-nalezy.md`
- `docs/ops/config-changelog.md`
- `scripts/sql/north-star-day.sql`
- `.ai/bus/metrics/north-star-2026-0{8,9}.jsonl`
### Ďalší krok
Founder: spustiť aktualizovaný founder_batch SQL (SELECT) a uložiť results; potom GO na rebuild jsonl.
## Session 2026-09-15 (north-star W2 COMPLETE)
### Dokončené
- LOOP+W2: 31 dní metrics (2026-08-17..09-16), founder_batch results
- Judge ACCEPT TASK-NS-001 `RUN-20260915185203-TASK-NS-001`
- PR #558 docs/metrics north-star backfill (NEMERGE bez founder GO)
- QUALIFICATION/INTENT/OUTREACH/VIEWINGS/CLOSED_WON = nula každý deň (dôkaz v report)
### Rozpracované / Pending
- Founder merge #558
- Typecheck paydown loop stále NOT_LAUNCHED (oddelený balík)
### Kľúčové súbory
- `.ai/bus/metrics/north-star-2026-0{8,9}.jsonl`
- `docs/reports/2026-09-15-north-star-backfill.md`
### Ďalší krok
Founder: merge #558; potom rozhodnúť o typecheck paydown launch.
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



## Session 2026-09-17 (operating mode B — prvy task, A3 onboarding 401)
### Dokoncene
- Setup rezimu B: push overeny (dry-run OK), patch uz bol na `origin/audit/2026-09-16` (`56e2359`, `git am --3way` -> "already applied"), vetva `docs/operating-mode-b` pushnuta
- PR audit/2026-09-16 -> main uz existoval: #565 — founder ho mergol 2026-09-17 (main -> 1291ae5); protokol 00-06 a DEC-* su teraz na main
- Prvy task v rezime B: handoff (01) + 2 nezavisli reviewri v izolovanych worktrees z origin/main, kluc dokazy re-overene executorom
- FINDING + PROPOSAL k A3 -> PR #566 (draft)
- Founder GO na V1 -> DEC-20260917-003; implementovane: novy proxy-level test drzi 401 ako zamer (mutacne overeny), opravene nepravdive tvrdenia v reporte 2026-09-04 a v rollback runbooku, A3 vyhodnotene fail + deviation accepted_by_founder (desc/verdict nedotknute)
### Rozpracovane / Pending
- Founder: read-only SELECT stavu RLS `onboarding_sessions` v prode (runbook :38-41) — A1/A2 zostavaju unknown
- Founder: Supabase Auth "Confirm email" v prod projekte — rozhoduje, ci 401 zasiahne aj registracnu cestu
### Kluc subory zmenene
- `.ai/bus/handoffs/HANDOFF-20260917-001-a3-onboarding-401.md`: novy handoff packet
- `docs/reports/2026-09-17-a3-onboarding-session-401-finding.md`: FINDING F1-F8 + PROPOSAL V1-V5 + vysledok V1
- `.ai/bus/decisions/DEC-20260917-003-a3-onboarding-401-intended.md`: founderov GO na V1
- `apps/crm/src/proxy-onboarding-session-gate.test.ts`: novy test, 401 = zamer
- `docs/reports/2026-09-04-rls-onboarding-session-api.md`, `docs/runbooks/rollback-onboarding-sessions-anon.md`: korekcie
- `.ai/bus/tasks/TASK-RLS-ONBOARDING-SESSION.md`: A3 vyhodnotene
### Dalsi krok
Founder: merge #566, potom SAMOSTATNE rozhodnutie o migracii 20260904220000 (stale PREPARED ONLY) — najprv read-only SELECT stavu RLS v prode podla runbooku :38-41.

## Session 2026-09-18 (GTM playbook — predaj RK, 80/20 majiteľa, akvizícia)
### Dokončené
- Syntéza GTM stratégie z dôkazov v repe → `docs/sales/gtm-playbook-2026-09-18.md`
- Nájdený rozpor: VETO na valuačný widget (2026-07-19, „chýba licencovaný zdroj cien") je
  prekonaný písomným povolením NBS (2026-08-10); zostáva len nespárovaná jednotka realizačná/ponuková
- Zdokumentované: 3× nezávislé odmietnutie AI/CRM trhom + kotva 300 €/tip + loop 31 dní na nule
- `memory/decisions.md` doplnený o decision record 2026-09-18
### Rozpracované / Pending
- **Founder GO S2** — rozsah tvrdenia widgetu na NBS dátach (3 otázky v §9 playbooku)
- GDPR gate pre A1 (RPO outreach zoznam) a S4 (audit cudzieho exportu) — `gdpr-advisor` nespustený
- Úlohy s 0 € engineeringom (S1 packaging, S3 segmentácia A/B/C, S8 procesná daň, A4 Únia, A8 sezónnosť) — GO nepotrebujú
### Kľúčové súbory zmenené
- `docs/sales/gtm-playbook-2026-09-18.md`: nový GTM playbook (stratégie, 80/20, akvizícia, 30/60/90)
- `memory/decisions.md`: decision record 2026-09-18 + revízia predpokladu VETO
### Ďalší krok
Founder: rozhodnúť S2 (ponuková úroveň NBS v UI? koeficient ostáva null? znenie atribúcie?).
Bez `GO S2` žiadny kód.
