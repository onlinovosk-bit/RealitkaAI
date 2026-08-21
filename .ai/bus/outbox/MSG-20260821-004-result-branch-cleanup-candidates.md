---
id: MSG-20260821-004-result-branch-cleanup-candidates
type: result
status: done
owner: cursor-agent
created_at: 2026-08-21T14:26:00Z
updated_at: 2026-08-21T14:26:00Z
scope:
  repo_paths:
    - .ai/bus/outbox
  external_systems:
    - github (read-only)
evidence:
  commands:
    - git fetch origin --prune
    - git rev-parse origin/main
    - git merge-base --is-ancestor <branch> origin/main
    - git cherry origin/main <branch>
    - gh pr list --state open
  files:
    - .ai/bus/outbox/MSG-20260821-003-result-branch-inventory.md
  urls: []
next_action:
  gate: GO REQUIRED
  description: Founder confirms delete list; agent deletes remote branches only after explicit GO.
---

# Branch cleanup candidates (content-verified)

## Summary

- `origin/main`: `d0d7496c74061ed07849614e8e7cbf2232304ab7`
- Remote branches scanned: **361**
- Content-redundant delete candidates: **208** (open-PR branches excluded)
- Blocked by open PR despite redundant tip: **0**
- Keep (unique commits vs main by `git cherry`): **153**

## Correction to MSG-003 READY list

Earlier READY-without-PR list mixed squash leftovers with real unfinished work.
Reclass uses `git cherry` + ancestry, not ahead/behind alone.

### `chore/decisions-dedup-variant-a`

- Tip deletes `brain/decisions/decisions.md`.
- On current `origin/main` that path **already does not exist**.
- Equivalent landed as `#421` (`be9c2362 chore(brain): drop decisions.md twin...`).
- `git cherry` marks tip as already applied → **DELETE candidate**, not missing work.

## Delete candidates (confirm before any delete)

| Branch | Reason | Ahead | Last |
|---|---|---:|---|
| `audit/seller-rescue-dedupe` | CHERRY_ALL_APPLIED | 1 | 2026-07-08T10:22:31+02:00 fix(cron): seller-rescue nesmie duplikovat open ulohy a notifikacie |
| `chore/api-hardening` | CHERRY_ALL_APPLIED | 1 | 2026-06-08T23:27:14+02:00 chore(api): response helpers + security headers + input validation |
| `chore/api-response-standard` | CHERRY_ALL_APPLIED | 1 | 2026-06-07T23:29:23+02:00 refactor(api): standardize response format |
| `chore/b1-auth-runbook-onboarding-unblock` | ANCESTOR_OR_ZERO_AHEAD | 0 | 2026-07-11T13:17:22+02:00 Merge branch 'main' into chore/b1-auth-runbook-onboarding-unblock |
| `chore/brain-registry-drift-2026-07-27` | ANCESTOR_OR_ZERO_AHEAD | 0 | 2026-07-26T22:34:43+02:00 chore(brain): refresh registry digests after Moat Capture #328 |
| `chore/brief10-wave-c-cleanup` | ANCESTOR_OR_ZERO_AHEAD | 0 | 2026-06-25T12:25:02+02:00 Merge branch 'main' into chore/brief10-wave-c-cleanup |
| `chore/brief4-pr-matrix` | CHERRY_ALL_APPLIED | 1 | 2026-06-09T12:22:49+02:00 docs: Brief 4.0 overnight report + PR final matrix |
| `chore/brief9-docs-sync` | CHERRY_ALL_APPLIED | 1 | 2026-06-11T23:04:27+02:00 chore(docs): Brief 9 Agent S3 overnight report and activation spec |
| `chore/brief9-lint-sweep` | CHERRY_ALL_APPLIED | 1 | 2026-06-11T23:23:34+02:00 chore(crm): Brief 9 S2 remove orphaned lib modules |
| `chore/brief9-test-coverage` | CHERRY_ALL_APPLIED | 1 | 2026-06-11T23:13:50+02:00 test(crm): Brief 9 S1 verification coverage for FEATURE-VERIFICATION gaps |
| `chore/ci-vlna2-c2` | CHERRY_ALL_APPLIED | 1 | 2026-08-11T22:54:44+02:00 ci(crm): restore test:smoke:preview for preview Playwright workflow |
| `chore/cursor-rules-bo-workflow` | CHERRY_ALL_APPLIED | 1 | 2026-07-13T09:49:10+02:00 chore(docs): scoped Cursor rules and BO verification workflow |
| `chore/decisions-dedup-variant-a` | CHERRY_ALL_APPLIED | 1 | 2026-08-15T23:59:54+02:00 chore(brain): drop decisions.md twin so ingest reads memory/decisions.md |
| `chore/deregister-stealth-recruiter-cron` | CHERRY_ALL_APPLIED | 1 | 2026-06-10T12:15:48+02:00 chore(legal): deregister stealth-recruiter cron + CI guard |
| `chore/error-boundaries` | CHERRY_ALL_APPLIED | 1 | 2026-06-07T23:29:11+02:00 feat(ux): add error + loading boundaries to all dashboard routes |
| `chore/genome-layer2-rename` | CHERRY_ALL_APPLIED | 1 | 2026-08-16T00:03:01+02:00 chore(crm): rename genome_layer2 migration to 14-digit stamp |
| `chore/governance-northstar-r4` | ANCESTOR_OR_ZERO_AHEAD | 0 | 2026-06-25T07:27:11+02:00 docs(governance): North Star r4 + parked concepts + AP-015–018 |
| `chore/lead-form-env-probe` | CHERRY_ALL_APPLIED | 1 | 2026-06-29T08:22:59+02:00 chore(crm): temp runtime probe for LEAD_FORM_TOKEN_SMOLKO length |
| `chore/preview-playwright-smoke` | ANCESTOR_OR_ZERO_AHEAD | 0 | 2026-07-13T10:29:37+02:00 ci(crm): Playwright smoke on Vercel Preview deploy |
| `chore/realvia-queue-triage` | ANCESTOR_OR_ZERO_AHEAD | 0 | 2026-06-25T11:58:25+02:00 fix(realvia): accept string source_id on delete webhooks |
| `chore/remove-lead-form-debug-logs` | CHERRY_ALL_APPLIED | 1 | 2026-06-29T13:32:42+02:00 chore(crm): remove lead-form debug logs from production |
| `chore/repo-hygiene-docs` | ANCESTOR_OR_ZERO_AHEAD | 0 | 2026-06-25T07:45:14+02:00 Merge branch 'main' into chore/repo-hygiene-docs |
| `chore/revenue-telemetry` | ANCESTOR_OR_ZERO_AHEAD | 0 | 2026-05-22T08:55:03+02:00 chore(analytics): add revenue telemetry events |
| `chore/rls-schema-parity-audit` | ANCESTOR_OR_ZERO_AHEAD | 0 | 2026-06-26T21:34:40+02:00 Merge branch 'main' into chore/rls-schema-parity-audit |
| `chore/seed-test-campaigns` | CHERRY_ALL_APPLIED | 1 | 2026-08-15T14:38:43+02:00 chore: add test-MCC-only Google Ads campaign seed script |
| `chore/smoke-tests` | CHERRY_ALL_APPLIED | 1 | 2026-06-07T23:29:22+02:00 test(smoke): add production smoke test suite |
| `chore/ts-strict-fixes` | CHERRY_ALL_APPLIED | 1 | 2026-06-07T23:29:23+02:00 fix(types): strict TypeScript fixes — top 5 critical |
| `cursor/critical-bug-management-2148` | CHERRY_ALL_APPLIED | 1 | 2026-08-15T23:09:24+00:00 fix(auth): stop ILIKE email wildcards hijacking profiles |
| `cursor/critical-bug-management-21a8` | CHERRY_ALL_APPLIED | 1 | 2026-08-12T23:07:52+00:00 fix(credits): claim starter-pack codes before granting credits |
| `cursor/critical-bug-management-21e6` | CHERRY_ALL_APPLIED | 1 | 2026-08-13T23:22:50+00:00 fix(crm): stop listing edit PATCH stripping C4 titles/meta |
| `cursor/critical-bug-management-c64c` | CHERRY_ALL_APPLIED | 1 | 2026-08-14T23:12:56+00:00 fix(billing): do not ACK Stripe when pricing fulfillment fails |
| `cursor/l99-lead-factory-brief-1782` | CHERRY_ALL_APPLIED | 1 | 2026-08-14T11:41:23+00:00 docs: L99 Lead Factory Initiative brief (VALIDATE, Fáza 1 first-party) |
| `cursor/pilot-ferovo-realtime-workspace-crm` | ANCESTOR_OR_ZERO_AHEAD | 0 | 2026-04-17T10:12:09+02:00 feat(crm): AI sales brain, call analyzer, landing/dashboard, autopilot API |
| `docs/bri-diagnostic-report` | ANCESTOR_OR_ZERO_AHEAD | 0 | 2026-06-19T14:32:59+02:00 docs(audit): BRI diagnostic report for Realvia leads (Brief 15 B2) |
| `docs/capabilities` | ANCESTOR_OR_ZERO_AHEAD | 0 | 2026-06-22T12:26:49+02:00 docs(audit): overnight report 2026-06-21 — #231 + tests + docs complete |
| `docs/comms-drafts-2026-08-15` | CHERRY_ALL_APPLIED | 1 | 2026-08-15T23:55:04+02:00 docs: draft unsent Smolko status and Unia barometer reminder |
| `docs/dead-code-audit` | CHERRY_ALL_APPLIED | 1 | 2026-06-07T23:29:24+02:00 docs: dead code audit |
| `docs/decision-framework-skills` | ANCESTOR_OR_ZERO_AHEAD | 0 | 2026-07-06T22:01:16+02:00 Merge branch 'main' into docs/decision-framework-skills |
| `docs/decisions-dedup-audit` | CHERRY_ALL_APPLIED | 1 | 2026-08-12T15:50:04+02:00 docs(architecture): audit dual decision logs (LANE 11) |
| `docs/doplnenie-2026-08-11` | CHERRY_ALL_APPLIED | 1 | 2026-08-11T21:57:13+02:00 docs: doplnenie promptov, legal povolení (rename), swarm plánov a Smolko podkladov |
| `docs/genome-audit` | CHERRY_ALL_APPLIED | 1 | 2026-08-11T18:02:35+02:00 docs: audit oddly named 2026_genome_layer2 migration |
| `docs/krajske-koeficienty-v0` | CHERRY_ALL_APPLIED | 1 | 2026-08-12T15:52:26+02:00 docs(data): krajské koeficienty v0 — blocked unpaired (LANE 10) |
| `docs/leads-score-audit` | CHERRY_ALL_APPLIED | 1 | 2026-06-07T23:29:01+02:00 docs: leads score audit — Smolko 439 contacts |
| `docs/ops-uc-smolko-handoff` | ANCESTOR_OR_ZERO_AHEAD | 0 | 2026-06-19T00:39:25+02:00 docs(ops): UC import PROD prereq SQL and smoke script (Brief 14) |
| `docs/overnight-report-4-update` | CHERRY_ALL_APPLIED | 1 | 2026-06-09T12:44:39+02:00 docs: update OVERNIGHT-REPORT-4 — merged PRs, SQL checklist, Smolko prod |
| `docs/ruflo-swarm-status-2026-08-20` | CHERRY_ALL_APPLIED | 1 | 2026-08-20T22:48:15+02:00 docs: Ruflo N1+N2 status as of 2026-08-20 |
| `docs/sales-tracker` | ANCESTOR_OR_ZERO_AHEAD | 0 | 2026-07-16T21:30:31+02:00 Merge branch 'main' into docs/sales-tracker |
| `docs/schema-drift-audit-2026-08-17` | CHERRY_ALL_APPLIED | 1 | 2026-08-16T22:51:54+02:00 docs: schema-drift audit 2026-08-17 (L38) |
| `docs/smolko-status` | CHERRY_ALL_APPLIED | 1 | 2026-08-11T22:43:30+02:00 docs(sales): Smolko status 2026-08-10 |
| `docs/stage0-pass-addendum` | ANCESTOR_OR_ZERO_AHEAD | 0 | 2026-08-15T21:09:44+02:00 docs: record T2 ~2 min perfgate FAIL — Stage 0 PASS stopped |
| `docs/stage1-plan-draft` | CHERRY_ALL_APPLIED | 1 | 2026-08-15T23:54:20+02:00 docs: draft Stage 1 plan for first real RK lead loop |
| `docs/stf-p0-legal-trust` | CHERRY_ALL_APPLIED | 1 | 2026-08-13T20:16:13+02:00 docs(legal): seller-trust legal trust contract (L15 STF-P0) |
| `docs/stf-p0-pilot-operating-contract` | CHERRY_ALL_APPLIED | 1 | 2026-08-13T20:43:26+02:00 docs(briefs): seller-trust pilot operating contract (L18 STF-P0) |
| `docs/v4-c-migration-history-audit` | CHERRY_ALL_APPLIED | 1 | 2026-08-15T14:40:53+02:00 docs: V4-C prod migration-history audit (read-only, no db push) |
| `feat/acquisition-s03-klient` | CHERRY_ALL_APPLIED | 1 | 2026-08-11T22:39:12+02:00 feat(acquisition): add Google Ads client wrapper with retry and rate limit |
| `feat/acquisition-s04-sync-campaigns` | CHERRY_ALL_APPLIED | 2 | 2026-08-15T15:09:57+02:00 Merge branch 'main' into feat/acquisition-s04-sync-campaigns |
| `feat/acquisition-s05-sync-keywords` | CHERRY_ALL_APPLIED | 2 | 2026-08-15T15:09:59+02:00 Merge branch 'main' into feat/acquisition-s05-sync-keywords |
| `feat/acquisition-sync-persistence-prep` | CHERRY_ALL_APPLIED | 1 | 2026-08-16T00:00:38+02:00 feat(acquisition): prep sync persist tables behind default-off flag. |
| `feat/agencies-manual-plan` | CHERRY_ALL_APPLIED | 1 | 2026-06-07T23:05:06+02:00 feat(db): agencies manual_plan column + document decision engine smoke 401 |
| `feat/agency-billing-credits-migration` | ANCESTOR_OR_ZERO_AHEAD | 0 | 2026-06-03T09:53:29+02:00 feat(crm): agency billing and credit ledger migration |
| `feat/ai-security-foundation` | CHERRY_ALL_APPLIED | 1 | 2026-07-20T22:16:13+02:00 docs(security): add AI security policy and gap map |
| `feat/automerge-policy` | CHERRY_ALL_APPLIED | 1 | 2026-06-11T22:11:00+02:00 feat(ci): Brief 9.0 Phase 0 — auto-merge policy and overnight orchestrator bootstrap |
| `feat/bo-a-triage-ui` | CHERRY_ALL_APPLIED | 1 | 2026-07-07T21:19:13+02:00 feat(ui): triage visibility for Smolko (BO-A items 1-4) |
| `feat/brief8-cadastre-wms-display` | ANCESTOR_OR_ZERO_AHEAD | 0 | 2026-06-15T13:37:26+02:00 Implement Brief 8 display-only cadastre map with tier-gated visibility and resilient WMS fallb |
| `feat/buyer-intent-repair-1-0` | CHERRY_ALL_APPLIED | 1 | 2026-07-13T19:26:48+02:00 feat: add buyer intent infrastructure and tenant RLS |
| `feat/call-analyzer-verify` | CHERRY_ALL_APPLIED | 1 | 2026-06-09T11:01:57+02:00 feat(calls): call analyzer verification — empty state + capabilities update |
| `feat/capabilities-strip-html-description` | CHERRY_ALL_APPLIED | 2 | 2026-06-22T12:07:34+02:00 Merge pull request #232 from onlinovosk-bit/test/capabilities-coverage |
| `feat/ceo-command-clean` | CHERRY_ALL_APPLIED | 1 | 2026-06-10T11:57:36+02:00 feat(routines): CEO Command Center — director briefing in morning-brief |
| `feat/crm-architect-leads-migration` | ANCESTOR_OR_ZERO_AHEAD | 0 | 2026-05-14T11:30:36+02:00 fix(crm): lazy VAPID setup for web-push (unblocks CI/next build) |
| `feat/crm-architect-workflows-w1-w4` | ANCESTOR_OR_ZERO_AHEAD | 0 | 2026-05-14T11:30:48+02:00 Merge migration branch (VAPID CI fix) |
| `feat/dashboard-insights-llm` | CHERRY_ALL_APPLIED | 1 | 2026-06-11T10:54:51+02:00 feat(crm): dashboard insights LLM cache path with TTL and audit logging |
| `feat/deal-trigger-live` | CHERRY_ALL_APPLIED | 1 | 2026-06-09T10:57:13+02:00 feat(agents): deal-trigger live — NULL safety + stale badge + POST smoke |
| `feat/demo-funnel-preview` | ANCESTOR_OR_ZERO_AHEAD | 0 | 2026-05-22T10:02:44+02:00 docs(preview): L99 conversion funnel mock for /demo approval |
| `feat/demo-ops` | CHERRY_ALL_APPLIED | 1 | 2026-06-11T09:05:45+02:00 feat(demo-ops): Calendly webhook, pre-demo brief and recap crons |
| `feat/follow-up-sweep-v2` | CHERRY_ALL_APPLIED | 1 | 2026-06-09T11:00:58+02:00 feat(cron): follow-up-sweep v2 — action scoring + urgency + workdesk card |
| `feat/followup-agent-loop1` | ANCESTOR_OR_ZERO_AHEAD | 0 | 2026-06-25T07:58:07+02:00 Merge branch 'main' into feat/followup-agent-loop1 |
| `feat/followup-drafts-ui` | ANCESTOR_OR_ZERO_AHEAD | 0 | 2026-06-25T12:14:59+02:00 Merge branch 'main' into feat/followup-drafts-ui |
| `feat/followup-guardian-gate` | ANCESTOR_OR_ZERO_AHEAD | 0 | 2026-06-25T12:35:16+02:00 feat(crm): Guardian gate for Loop 1 follow-up drafts |
| `feat/forecast-risk-nba` | ANCESTOR_OR_ZERO_AHEAD | 0 | 2026-05-21T14:13:08+02:00 feat(ui): Forecast risk NBA strip and light deal health panel |
| `feat/founder-metrics` | CHERRY_ALL_APPLIED | 1 | 2026-06-11T22:41:03+02:00 feat(crm): founder metrics dashboard (Brief 9 Agent M) |
| `feat/guardian-v1-blok-c` | ANCESTOR_OR_ZERO_AHEAD | 0 | 2026-07-27T09:02:11+02:00 chore(brain): refresh registry after rebase onto main |
| `feat/inbound-auto-response-1-0` | CHERRY_ALL_APPLIED | 1 | 2026-07-13T19:28:42+02:00 feat: add automatic response for inbound email leads |
| `feat/inbound-auto-response-variant-a` | ANCESTOR_OR_ZERO_AHEAD | 0 | 2026-07-16T13:05:38+02:00 Merge branch 'main' into feat/inbound-auto-response-variant-a |
| `feat/inbound-triage-signal` | CHERRY_ALL_APPLIED | 1 | 2026-07-07T12:54:36+02:00 feat(acquire): inline inbound triage + new_lead notification on insert |
| `feat/l99-strategy-rollout` | ANCESTOR_OR_ZERO_AHEAD | 0 | 2026-06-02T10:37:08+02:00 test(pricing): align L99 seat pricing assertions |
| `feat/landing-v2-release` | CHERRY_ALL_APPLIED | 1 | 2026-06-11T22:44:27+02:00 feat(marketing): landing v2 from demo v3 DNA (Brief 9 Agent L) |
| `feat/lead-form-public` | ANCESTOR_OR_ZERO_AHEAD | 0 | 2026-06-28T13:27:35+02:00 feat(crm): public lead form B1 — inbound route + /f/[slug] page |
| `feat/leads-pipeline-ux` | CHERRY_ALL_APPLIED | 1 | 2026-06-09T10:55:22+02:00 feat(leads): UX upgrade — bulk actions + quick contact + source badge + last contact |
| `feat/listing-gen-persistence` | CHERRY_ALL_APPLIED | 1 | 2026-08-03T16:16:12+02:00 feat(crm): persist listing generator drafts (ai_generations) |
| `feat/loop2-outcome-writer` | ANCESTOR_OR_ZERO_AHEAD | 0 | 2026-06-25T21:40:57+02:00 feat(crm): Loop 2 outcome writer for terminal lead status |
| `feat/manual-plan-billing` | CHERRY_ALL_APPLIED | 1 | 2026-06-09T12:21:31+02:00 feat(billing): agencies.manual_plan — non-Stripe plan override in saas-ops |
| `feat/maplibre-openfreemap` | CHERRY_ALL_APPLIED | 1 | 2026-05-21T23:18:00+02:00 feat(maps): replace Mapbox with MapLibre and OpenFreeMap tiles |
| `feat/marketing-zakulisie-token` | ANCESTOR_OR_ZERO_AHEAD | 0 | 2026-06-03T09:44:20+02:00 chore(marketing): point homepage demo CTAs to zakulisie path |
| `feat/migration-intelligence` | CHERRY_ALL_APPLIED | 1 | 2026-06-08T22:25:27+02:00 feat(import): sidebar Importovať kontakty + onboarding banner |
| `feat/morning-brief-v2` | CHERRY_ALL_APPLIED | 1 | 2026-06-08T23:26:24+02:00 feat(brief): Morning Brief v2 — richer content, retry, better prompt |
| `feat/n8n-workflow-exports-v1` | CHERRY_ALL_APPLIED | 1 | 2026-07-23T12:01:00+02:00 feat(n8n): export W1–W3 workflow JSONs for V1 foundation |
| `feat/nbs-atribucia` | CHERRY_ALL_APPLIED | 1 | 2026-08-11T18:07:19+02:00 feat(valuation): add NBS attribution to widget and estimate API |
| `feat/notifications-infra-fk-fix` | CHERRY_ALL_APPLIED | 3 | 2026-06-10T07:46:01+02:00 feat(routines): CEO Command Center — director briefing in morning-brief (#159) |
| `feat/onboard-agency-script` | CHERRY_ALL_APPLIED | 2 | 2026-07-10T21:48:00+02:00 Merge branch 'main' into feat/onboard-agency-script |
| `feat/outcome-first-workdesk` | CHERRY_ALL_APPLIED | 1 | 2026-07-17T10:01:05+02:00 feat(workdesk): outcome-first UX with 60s audit and single daily CTA |
| `feat/p4-platform-heartbeat` | CHERRY_ALL_APPLIED | 2 | 2026-07-08T23:10:56+02:00 feat(infra): P4 platform heartbeat cron + tenant-health signals |
| `feat/phase5-forecast-gating` | CHERRY_ALL_APPLIED | 1 | 2026-06-09T12:21:48+02:00 docs(license): TRACK-D forecast gating verification (Brief 4.0) |
| `feat/phase5-team-gating` | CHERRY_ALL_APPLIED | 1 | 2026-06-09T12:22:10+02:00 docs(license): TRACK-E team gating verification (Brief 4.0) |
| `feat/pipeline-action-nba` | ANCESTOR_OR_ZERO_AHEAD | 0 | 2026-05-21T14:15:45+02:00 feat(ui): Pipeline action NBA strip on /pipeline |
| `feat/premortem-workflow-v1` | CHERRY_ALL_APPLIED | 1 | 2026-07-23T21:42:26+02:00 Add premortem workflow template, Smolko Ads premortem, and brain registry. |
| `feat/pricing-pr2-grants` | CHERRY_ALL_APPLIED | 1 | 2026-06-11T10:40:22+02:00 feat(pricing): PR-2 grant engine gaps — spend_credits + tests |
| `feat/realsoft-import-adapter` | ANCESTOR_OR_ZERO_AHEAD | 0 | 2026-06-16T11:00:47+02:00 test: seed realsoft import logs in tenant isolation fixtures |
| `feat/realvia-importer` | CHERRY_ALL_APPLIED | 1 | 2026-06-11T09:19:41+02:00 feat(crm): Realvia JSON migration importer with dry-run |
| `feat/revenue-intelligence-wire-not-delete` | ANCESTOR_OR_ZERO_AHEAD | 0 | 2026-06-15T22:50:09+02:00 feat(crm): wire revenue intelligence tiles to honest live/pending/hidden states |
| `feat/routine-ceo-command` | CHERRY_ALL_APPLIED | 2 | 2026-06-09T23:46:31+02:00 feat(routines): CEO Command Center — director briefing in morning-brief |
| `feat/routine-seller-rescue` | CHERRY_ALL_APPLIED | 2 | 2026-06-09T23:45:21+02:00 feat(routines): Seller Rescue — churn scoring + notifications + cron |
| `feat/seller-rescue-clean` | CHERRY_ALL_APPLIED | 1 | 2026-06-10T11:57:25+02:00 feat(routines): Seller Rescue — churn scoring + notifications + cron |
| `feat/sk-ui-vertical-pack-sidebar` | ANCESTOR_OR_ZERO_AHEAD | 0 | 2026-06-25T08:52:07+02:00 Merge branch 'main' into feat/sk-ui-vertical-pack-sidebar |
| `feat/starter-pack-47` | ANCESTOR_OR_ZERO_AHEAD | 0 | 2026-06-15T13:03:36+02:00 feat(crm): enforce Brief 7 hide-only module visibility policy |
| `feat/stealth-recruiter-ingest-presov` | ANCESTOR_OR_ZERO_AHEAD | 0 | 2026-05-31T22:30:46+02:00 feat(crm): Stealth Recruiter Prešov cron ingest |
| `feat/susr-sp3801qr` | CHERRY_ALL_APPLIED | 1 | 2026-08-11T18:03:37+02:00 chore(data): ingest ŠÚ SR sp3801qr for PO+KE (not wired) |
| `feat/team-action-nba` | ANCESTOR_OR_ZERO_AHEAD | 0 | 2026-05-21T14:43:48+02:00 feat(ui): Team action NBA strip and light owner insights |
| `feat/universal-crm-import-ui` | CHERRY_ALL_APPLIED | 1 | 2026-06-08T13:16:16+02:00 feat(import): Universal CRM Import — UI + API + column detector + preview wizard |
| `feat/valuation-widget-contact-first` | CHERRY_ALL_APPLIED | 1 | 2026-07-20T21:56:20+02:00 fix(valuation): require contact before estimate and tighten price band |
| `feat/valuation-widget-wave1` | CHERRY_ALL_APPLIED | 1 | 2026-07-20T21:03:14+02:00 feat(valuation): add Wave 1 estimate flow, lead triage, and public widget |
| `feat/vertical-pack-banner-factory` | CHERRY_ALL_APPLIED | 1 | 2026-06-19T14:33:16+02:00 feat(crm): Banner Factory capability on real Realvia fixture (Brief 15 K3b) |
| `feat/vertical-pack-listing-generator` | ANCESTOR_OR_ZERO_AHEAD | 0 | 2026-06-19T12:29:05+02:00 feat(crm): Listing Generator from UC properties (Brief 15 K2) |
| `feat/vertical-pack-presentation-builder` | CHERRY_ALL_APPLIED | 1 | 2026-06-19T14:33:20+02:00 feat(crm): Presentation Builder capability on real Realvia fixture (Brief 15 K3c) |
| `feat/vertical-pack-quality-guardian` | ANCESTOR_OR_ZERO_AHEAD | 0 | 2026-06-19T00:40:21+02:00 feat(crm): Quality/Brand Guardian capability (Brief 15 K1) |
| `feat/vlna1-pr1-dashboard-insights` | ANCESTOR_OR_ZERO_AHEAD | 0 | 2026-06-03T10:58:05+02:00 feat(crm): replace hardcoded dashboard insights with LLM summary |
| `feat/vlna1-pr1-insights-cron-cache` | ANCESTOR_OR_ZERO_AHEAD | 0 | 2026-06-03T11:40:24+02:00 test(crm): align monopol anchor test with roadmap feature rows |
| `feat/vlna1-pr2-vercel-crons` | ANCESTOR_OR_ZERO_AHEAD | 0 | 2026-06-03T11:31:47+02:00 feat(crm): PR-2 — bundle all missing Vercel crons |
| `feat/vlna1-pr3-arbitrage-live` | ANCESTOR_OR_ZERO_AHEAD | 0 | 2026-06-03T22:14:19+02:00 chore(crm): document ARBITRAGE_DEMO_MODE in env example |
| `feat/w-leads-capture` | ANCESTOR_OR_ZERO_AHEAD | 0 | 2026-06-26T05:59:49+02:00 feat(crm): W-LEADS wave — lead capture verification + UX link |
| `feat/wave0-truthful-pricing-marketing` | ANCESTOR_OR_ZERO_AHEAD | 0 | 2026-06-03T10:54:01+02:00 fix(crm): Wave 0 remove production mock fallbacks |
| `feat/wave1-export-diagnostics` | ANCESTOR_OR_ZERO_AHEAD | 0 | 2026-06-19T23:09:10+02:00 feat(crm): add export diagnostics capability (Wave 1B) |
| `feat/wave1-listing-score` | ANCESTOR_OR_ZERO_AHEAD | 0 | 2026-06-19T23:08:50+02:00 feat(crm): add listing completeness score capability (Wave 1A) |
| `feat/wave2-k4-playbook-cleanup` | ANCESTOR_OR_ZERO_AHEAD | 0 | 2026-06-20T13:07:37+02:00 feat(crm): Wave 2 K4 UI, playbook smoke, webhook cleanup SQL |
| `feat/workdesk-enterprise-blue-pr2bc` | ANCESTOR_OR_ZERO_AHEAD | 0 | 2026-05-21T12:42:33+02:00 feat(ui): enterprise blue Workdesk PR2b+2c — light panels and cinematic polish |
| `feat/workdesk-full-light-migration` | ANCESTOR_OR_ZERO_AHEAD | 0 | 2026-05-21T12:57:57+02:00 feat(ui): full light Workdesk migration — leads, pipeline, PaywallLock |
| `feat/workdesk-intelligence-phase3` | ANCESTOR_OR_ZERO_AHEAD | 0 | 2026-05-21T14:09:27+02:00 feat(ui): Phase 3 AI intelligence layer on dashboard and leads |
| `feat/workdesk-page-shells-pr35` | ANCESTOR_OR_ZERO_AHEAD | 0 | 2026-05-21T13:16:50+02:00 feat(ui): light Workdesk page shells — eradicate dark legacy routes |
| `feature/color-update` | CHERRY_ALL_APPLIED | 1 | 2026-05-19T14:12:47+02:00 feat: Revolis.AI v2 color system — purple/violet design tokens |
| `feature/tailwind-colors` | CHERRY_ALL_APPLIED | 1 | 2026-05-19T14:50:33+02:00 feat: add purple/brand color tokens to Tailwind config |
| `fix/acquisition-render-path` | CHERRY_ALL_APPLIED | 1 | 2026-08-16T10:35:51+02:00 fix(crm): drop duplicate acquisition auth and parallelize selects |
| `fix/billing-light-cleanup` | ANCESTOR_OR_ZERO_AHEAD | 0 | 2026-05-21T14:05:21+02:00 fix(ui): migrate remaining billing surfaces to enterprise light theme |
| `fix/bri-dashboard-hardening` | CHERRY_ALL_APPLIED | 1 | 2026-06-09T10:59:06+02:00 fix(cron): BRI + dashboard hardening — timeout, NULL safety, idempotency note |
| `fix/ci-ephemeral-supabase-allowlist` | CHERRY_ALL_APPLIED | 1 | 2026-06-10T11:55:31+02:00 ci: ephemeral local Supabase + allowlist guard for test/build |
| `fix/ci-stealth-pattern-guard-ap011` | ANCESTOR_OR_ZERO_AHEAD | 0 | 2026-06-18T23:40:20+02:00 fix(ci): stealth lead-gen pattern guard (AP-011) |
| `fix/crm-layout-perf` | CHERRY_ALL_APPLIED | 1 | 2026-08-15T21:47:45+02:00 fix(crm): stop workdesk N+1 profile lookups and nav prefetch of 500-row lists |
| `fix/crm-lists-pagination` | CHERRY_ALL_APPLIED | 1 | 2026-08-16T00:03:59+02:00 fix(crm): paginate dashboard and leads lists instead of 500-row select * |
| `fix/crm-smolko-dotenv-init` | ANCESTOR_OR_ZERO_AHEAD | 0 | 2026-06-02T13:44:05+02:00 fix(crm): initialize dotenv in Smolko import runner |
| `fix/dashboard-client-parallel` | CHERRY_ALL_APPLIED | 1 | 2026-08-16T10:35:52+02:00 fix(crm): render dashboard after leads; load panels in parallel |
| `fix/dashboard-dark-leak` | ANCESTOR_OR_ZERO_AHEAD | 0 | 2026-05-22T08:55:03+02:00 fix(dashboard): eradicate dark layout leaks on workdesk shell |
| `fix/dashboard-insights-vercel-analytics` | ANCESTOR_OR_ZERO_AHEAD | 0 | 2026-06-03T13:51:25+02:00 fix(crm): do not fail dashboard insights read on Vercel FS analytics |
| `fix/decision-flags-test-optin` | CHERRY_ALL_APPLIED | 1 | 2026-06-11T11:17:59+02:00 fix(test): align decision-flags verification with opt-in semantics |
| `fix/demo-slate-horizon` | ANCESTOR_OR_ZERO_AHEAD | 0 | 2026-05-22T08:56:58+02:00 fix(demo): include revenue telemetry module for demo_start hooks |
| `fix/executive-ux-panels` | ANCESTOR_OR_ZERO_AHEAD | 0 | 2026-05-22T08:54:46+02:00 feat(dashboard): executive UX copy on priority and AI panels |
| `fix/followup-decisions-agent-column` | ANCESTOR_OR_ZERO_AHEAD | 0 | 2026-06-25T09:53:02+02:00 fix(crm): populate decisions.agent for follow-up predictions |
| `fix/followup-proxy-cron-bypass` | ANCESTOR_OR_ZERO_AHEAD | 0 | 2026-06-25T09:29:32+02:00 Merge branch 'main' into fix/followup-proxy-cron-bypass |
| `fix/forecasting-remove-demo-risk-strip` | ANCESTOR_OR_ZERO_AHEAD | 0 | 2026-06-05T10:15:22+02:00 fix(crm): forecasting risk strip bez demo mien |
| `fix/google-ads-api-v25` | CHERRY_ALL_APPLIED | 1 | 2026-08-15T16:18:57+02:00 fix(acquisition): bump Google Ads API v18 to v25 |
| `fix/google-ads-search-path` | CHERRY_ALL_APPLIED | 1 | 2026-08-15T18:38:35+02:00 fix(acquisition): post GAQL to googleAds:search and date-filter search terms |
| `fix/guardian-cta-deep-link-240` | ANCESTOR_OR_ZERO_AHEAD | 0 | 2026-06-23T12:45:01+02:00 fix(crm): deep-link Guardian CTA to property edit by source_id |
| `fix/heartbeat-realvia-received-at` | CHERRY_ALL_APPLIED | 1 | 2026-07-09T09:47:29+02:00 fix(heartbeat): use received_at for realvia_webhook_logs last-seen |
| `fix/inbound-public-proxy-bypass` | CHERRY_ALL_APPLIED | 1 | 2026-06-29T11:35:13+02:00 fix(crm): allow public /api/leads/inbound through proxy |
| `fix/landing-phase3-preview-html` | ANCESTOR_OR_ZERO_AHEAD | 0 | 2026-05-22T09:59:07+02:00 docs(preview): landing Phase 3 A/B HTML comparison pages |
| `fix/landing-slate-horizon` | CHERRY_ALL_APPLIED | 1 | 2026-05-22T08:27:59+02:00 fix(ui): migrate /landing hero shell to Slate Horizon light |
| `fix/landing-slate-horizon-phase2` | ANCESTOR_OR_ZERO_AHEAD | 0 | 2026-05-22T09:06:36+02:00 fix(ui): Slate Horizon phase 2 for landing mid-page sections |
| `fix/lead-ai-triage-imported-backfill` | ANCESTOR_OR_ZERO_AHEAD | 0 | 2026-06-04T14:32:18+02:00 fix(leads): show triage score and ai_reason in lead list |
| `fix/lead-form-public-prod` | ANCESTOR_OR_ZERO_AHEAD | 0 | 2026-06-28T21:30:29+02:00 fix(crm): public lead form — middleware bypass + clear missing-env page |
| `fix/lead-score-honesty` | CHERRY_ALL_APPLIED | 1 | 2026-06-08T23:24:57+02:00 fix(leads): honest score display — hide default 22, show — for unscored leads |
| `fix/lead-webhook-allowlist` | CHERRY_ALL_APPLIED | 1 | 2026-08-15T18:04:48+02:00 fix(acquisition): allowlist Google lead-webhook past the session gate |
| `fix/marketing-activate-modal-l99-pricing` | ANCESTOR_OR_ZERO_AHEAD | 0 | 2026-06-02T11:26:32+02:00 fix(marketing): align activate modal pricing with L99 seats |
| `fix/marketing-ga4-config-id` | CHERRY_ALL_APPLIED | 1 | 2026-07-10T22:12:08+02:00 fix(marketing): align gtag config with production GA4 property |
| `fix/marketing-hero-neviete-sk` | ANCESTOR_OR_ZERO_AHEAD | 0 | 2026-06-01T21:44:18+02:00 chore(crm): tier label tests, QA docs, and smoke script |
| `fix/morning-brief-llm-path` | CHERRY_ALL_APPLIED | 1 | 2026-06-11T10:47:28+02:00 fix(crm): morning brief LLM path instrumentation and cron admin client |
| `fix/onboard-agency-prod-schema` | ANCESTOR_OR_ZERO_AHEAD | 0 | 2026-07-11T13:59:41+02:00 fix(ops): onboard-agency without agencies.email on prod |
| `fix/onboarding-automat-auth` | CHERRY_ALL_APPLIED | 1 | 2026-06-08T23:23:20+02:00 fix(onboarding): resolve 401 — proxy bypass + client fetch + empty state |
| `fix/onboarding-client-tables-rls-b1` | CHERRY_ALL_APPLIED | 1 | 2026-07-01T12:10:03+02:00 fix(db): B1 RLS for onboarding client tables + remove orphan route |
| `fix/p0-sidebar-profile-select` | ANCESTOR_OR_ZERO_AHEAD | 0 | 2026-06-04T10:58:34+02:00 fix(crm): remove invalid agency_name from dashboard profile select |
| `fix/p0-workdesk-profile-select-hardening` | CHERRY_ALL_APPLIED | 1 | 2026-06-04T11:13:47+02:00 fix(crm): harden Workdesk profile select and sidebar role label |
| `fix/playbook-last-contact-column` | ANCESTOR_OR_ZERO_AHEAD | 0 | 2026-06-19T15:54:28+02:00 Merge branch 'main' into fix/playbook-last-contact-column |
| `fix/pr4-scrape-404-proxy-bypass` | ANCESTOR_OR_ZERO_AHEAD | 0 | 2026-06-04T11:47:35+02:00 fix(crm): allow unauthenticated 404 on removed GET /api/scrape |
| `fix/premium-overlay-a11y` | ANCESTOR_OR_ZERO_AHEAD | 0 | 2026-05-22T09:06:52+02:00 fix(a11y): premium locked overlay imports, focus rings, reduced-motion |
| `fix/prod-drift-profiles-leads` | CHERRY_ALL_APPLIED | 1 | 2026-08-16T22:47:36+02:00 chore(db): prod drift catch-up for profiles.tier_updated_at and leads.* (L37) |
| `fix/prod-smolko-tenant-hotfix` | ANCESTOR_OR_ZERO_AHEAD | 0 | 2026-05-29T08:18:13+02:00 fix(crm): tenant-scope leads/properties and Smolko profile resolution |
| `fix/proxy-auth-timeout` | CHERRY_ALL_APPLIED | 1 | 2026-08-16T10:35:51+02:00 fix(crm): fail-open proxy auth after 5s and drop dead middleware |
| `fix/proxy-cron-bypass` | ANCESTOR_OR_ZERO_AHEAD | 0 | 2026-05-20T22:46:01+02:00 fix(crm): bypass /api/cron/* in proxy before session auth |
| `fix/reality-monopol-test-detector-feature` | ANCESTOR_OR_ZERO_AHEAD | 0 | 2026-06-03T10:46:00+02:00 docs(qa): add Vlna 1 PR backlog from audit |
| `fix/resolveTenantSupabase-matching-funnel` | CHERRY_ALL_APPLIED | 2 | 2026-06-30T07:54:36+02:00 Merge branch 'main' into fix/resolveTenantSupabase-matching-funnel |
| `fix/resolveTenantSupabase-tasks-team` | ANCESTOR_OR_ZERO_AHEAD | 0 | 2026-06-27T15:03:36+02:00 fix(crm): scope tasks and team API writes to server session |
| `fix/schema-guard-allowlist-prod-sync` | ANCESTOR_OR_ZERO_AHEAD | 0 | 2026-06-24T13:14:30+02:00 fix(crm): sync public schema allowlist with PROD snapshot |
| `fix/segmentation-410-shim` | ANCESTOR_OR_ZERO_AHEAD | 0 | 2026-06-05T10:48:44+02:00 fix(crm): deprecate /api/segmentation with 410 shim |
| `fix/settings-auth-email-tests` | CHERRY_ALL_APPLIED | 2 | 2026-07-08T13:42:47+02:00 Merge branch 'main' into fix/settings-auth-email-tests |
| `fix/settings-push-notifications-light` | ANCESTOR_OR_ZERO_AHEAD | 0 | 2026-05-21T14:00:07+02:00 fix(ui): light PushNotificationsToggle on settings page |
| `fix/smolko-contacts-root-cause` | CHERRY_ALL_APPLIED | 2 | 2026-05-28T07:06:56+02:00 docs(crm): orchestrator 240min plan 2026-05-27 |
| `fix/smolko-contacts-zero` | CHERRY_ALL_APPLIED | 1 | 2026-05-27T22:39:44+02:00 fix(crm): Smolko contacts - filters, hot strip, profile initials |
| `fix/smolko-ultrathink-recovery` | CHERRY_ALL_APPLIED | 1 | 2026-05-28T19:39:53+02:00 fix(crm): Smolko contacts fallback + profile link + inventory fallback |
| `fix/stealth-recruiter-migration-index` | ANCESTOR_OR_ZERO_AHEAD | 0 | 2026-07-03T11:21:03+02:00 test(stealth-recruiter): align scan route tests with store-based API |
| `fix/stealth-recruiter-production-presov` | ANCESTOR_OR_ZERO_AHEAD | 0 | 2026-05-29T10:58:10+02:00 fix(dashboard): remove demo placeholders from AI Priority Strip |
| `fix/stealth-scan-commentitem-preflight` | ANCESTOR_OR_ZERO_AHEAD | 0 | 2026-07-03T11:42:16+02:00 fix(stealth-scan): rename duplicate CommentItem to GithubCommentItem |
| `fix/supabase-fetch-timeout` | CHERRY_ALL_APPLIED | 1 | 2026-08-16T10:35:50+02:00 fix(crm): abort hung Supabase fetches after 8s instead of 300s |
| `fix/team-gating-manual-plan` | CHERRY_ALL_APPLIED | 1 | 2026-06-09T23:43:07+02:00 fix(team): resolve manual_plan from agencies for team gating — Smolko fix |
| `fix/tenant-isolation-leads-defense` | ANCESTOR_OR_ZERO_AHEAD | 0 | 2026-06-18T23:40:30+02:00 fix(crm): defense-in-depth tenant filter on leads list/get (Brief 12 Wave A) |
| `fix/triage-availability-prompt-tuning` | ANCESTOR_OR_ZERO_AHEAD | 0 | 2026-07-14T11:54:58+02:00 fix(triage): treat listing availability questions as at least Stredna |
| `fix/valuation-widget-property-first-flow` | ANCESTOR_OR_ZERO_AHEAD | 0 | 2026-07-21T07:40:34+02:00 fix(valuation): property-first 3-step flow (property ? contact ? estimate) |
| `fix/w-leads-create-rls` | ANCESTOR_OR_ZERO_AHEAD | 0 | 2026-06-26T08:52:35+02:00 fix(crm): scope createLead to server session for RLS insert |
| `fix/w1-quick-wins-bundle` | CHERRY_ALL_APPLIED | 1 | 2026-06-11T09:17:31+02:00 fix(crm): W1 quick wins — forecast tier, decision opt-in, nav, capabilities |
| `fix/workdesk-program-comparison-light` | ANCESTOR_OR_ZERO_AHEAD | 0 | 2026-05-21T13:44:28+02:00 fix(ui): migrate Porovnanie programov to enterprise light Workdesk theme |
| `pr/vlna-0.1-cleanup-ui` | ANCESTOR_OR_ZERO_AHEAD | 0 | 2026-06-04T12:27:11+02:00 fix(crm): Vlna 0.1 cleanup — UI bez atráp a L99 žargónu |
| `test/capabilities-coverage` | CHERRY_ALL_APPLIED | 4 | 2026-06-22T12:07:48+02:00 Merge pull request #233 from onlinovosk-bit/docs/capabilities |
| `test/listing-golden-regres` | CHERRY_ALL_APPLIED | 1 | 2026-08-12T16:00:33+02:00 test(crm): add A3 listing golden regression fixtures (L12) |

## Blocked by open PR

None.

## Keep (do not delete in this batch)

153 branches still have unique commits per `git cherry`.
Not expanded here; triage separately after delete batch.

## Recommended repo setting

Enable GitHub **Settings → General → Automatically delete head branches** so squash leftovers stop accumulating.

## Next action

STOP. No remote branch deletes without founder GO on this exact list.
