---
id: MSG-20260821-003-result-branch-inventory
type: result
status: done
owner: cursor-agent
created_at: 2026-08-21T10:34:00Z
updated_at: 2026-08-21T10:34:00Z
scope:
  repo_paths:
    - .ai/bus/outbox
  external_systems:
    - github (read-only)
evidence:
  commands:
    - git fetch origin --prune
    - git rev-parse origin/main
    - gh pr list --state open --limit 200 --json number,title,headRefName,url,updatedAt,isDraft
    - git rev-list --count origin/main..<branch>
    - git diff --shortstat origin/main...<branch>
    - git merge-base --is-ancestor <branch> origin/main
  files:
    - .ai/bus/tasks/TASK-0002.md
  urls: []
next_action:
  gate: GO REQUIRED
  description: Founder triages review order; no agent mutates branches or PRs from this report.
---

# Branch & PR inventory result

## Summary

- `origin/main`: `3c47370cdc20c9bcd4339814b4e10b9b304fb9fc`
- Remote branches inspected: **361**
- Open PRs from GitHub: **36**
- READY without open PR: **34**
- MERGED branch cleanup candidates: **91**
- Known branch names not present on origin: **feat/bridge-harness**

## Known branch check

| Branch | Status | PR | Ahead/behind | Last movement | Summary |
|---|---:|---:|---:|---:|---|
| `feat/inbound-gmail-pull` | READY | #422 | +3/-1 | 2026-08-20 | feat(crm): mock-first Gmail inbound pull (V4-B / L22); paths: apps/crm/src(6), apps/crm/.env.example(1), apps/crm/tests(1), docs/reports(1) |
| `cursor/setup-dev-environment-4850` | READY | #445 | +2/-1 | 2026-08-20 | chore(env): Cloud Agent dev environment (Docker + local Supabase); paths: .cursor/environment.json(1), .cursor/install.sh(1), .cursor/start.sh(1), docs/reports(1) |
| `feat/bridge-harness` | UNKNOWN | UNKNOWN | n/a | n/a | Branch not found on `origin`. |
| `cursor/inter-agent-bus-v01-db1f` | READY | NO | +1/-0 | 2026-08-21 | feat(bus): add inter-agent bus v0.1 skeleton; paths: .ai/bus(13) |

## Zabudnutá hotová práca

| Branch | Ahead/behind | Last movement | Scope | Why READY |
|---|---:|---:|---|---|
| `chore/decisions-dedup-variant-a` | +1/-19 | 2026-08-15 | 5 files changed, 76 insertions(+), 572 deletions(-) | recent complete-looking branch without open PR; includes tests/docs/runbook or known completed bus/DMARC scope |
| `chore/genome-layer2-rename` | +1/-19 | 2026-08-16 | 6 files changed, 227 insertions(+), 4 deletions(-) | recent complete-looking branch without open PR; includes tests/docs/runbook or known completed bus/DMARC scope |
| `chore/seed-test-campaigns` | +1/-38 | 2026-08-15 | 2 files changed, 402 insertions(+), 1 deletion(-) | recent complete-looking branch without open PR; includes tests/docs/runbook or known completed bus/DMARC scope |
| `cursor/critical-bug-management-2148` | +1/-19 | 2026-08-15 | 6 files changed, 229 insertions(+), 21 deletions(-) | recent complete-looking branch without open PR; includes tests/docs/runbook or known completed bus/DMARC scope |
| `cursor/critical-bug-management-21e6` | +1/-43 | 2026-08-13 | 2 files changed, 107 insertions(+), 8 deletions(-) | recent complete-looking branch without open PR; includes tests/docs/runbook or known completed bus/DMARC scope |
| `cursor/critical-bug-management-c64c` | +1/-38 | 2026-08-14 | 5 files changed, 206 insertions(+), 5 deletions(-) | recent complete-looking branch without open PR; includes tests/docs/runbook or known completed bus/DMARC scope |
| `cursor/inter-agent-bus-v01-db1f` | +1/-0 | 2026-08-21 | 13 files changed, 268 insertions(+) | recent complete-looking branch without open PR; includes tests/docs/runbook or known completed bus/DMARC scope |
| `cursor/l99-lead-factory-brief-1782` | +1/-43 | 2026-08-14 | 6 files changed, 435 insertions(+), 13 deletions(-) | recent complete-looking branch without open PR; includes tests/docs/runbook or known completed bus/DMARC scope |
| `docs/reports-2026-08-17` | +6/-38 | 2026-08-15 | 6 files changed, 228 insertions(+), 13 deletions(-) | recent complete-looking branch without open PR; includes tests/docs/runbook or known completed bus/DMARC scope |
| `docs/ruflo-swarm-status-2026-08-20` | +1/-1 | 2026-08-20 | 1 file changed, 80 insertions(+) | recent complete-looking branch without open PR; includes tests/docs/runbook or known completed bus/DMARC scope |
| `docs/schema-drift-audit-2026-08-17` | +1/-6 | 2026-08-16 | 1 file changed, 290 insertions(+) | recent complete-looking branch without open PR; includes tests/docs/runbook or known completed bus/DMARC scope |
| `docs/stage0-2026-08-15-evidence` | +2/-28 | 2026-08-15 | 4 files changed, 150 insertions(+) | recent complete-looking branch without open PR; includes tests/docs/runbook or known completed bus/DMARC scope |
| `docs/stage0-pass-confirmed` | +5/-1 | 2026-08-20 | 5 files changed, 311 insertions(+) | recent complete-looking branch without open PR; includes tests/docs/runbook or known completed bus/DMARC scope |
| `docs/v4-b-dmarc-oauth-pull` | +2/-38 | 2026-08-15 | 2 files changed, 568 insertions(+) | recent complete-looking branch without open PR; includes tests/docs/runbook or known completed bus/DMARC scope |
| `docs/v4-c-migration-history-audit` | +1/-38 | 2026-08-15 | 1 file changed, 520 insertions(+) | recent complete-looking branch without open PR; includes tests/docs/runbook or known completed bus/DMARC scope |
| `docs/v4-d-nbs-kraj-rady` | +2/-38 | 2026-08-15 | 2 files changed, 1603 insertions(+) | recent complete-looking branch without open PR; includes tests/docs/runbook or known completed bus/DMARC scope |
| `feat/acquisition-s04-sync-campaigns` | +2/-35 | 2026-08-15 | 4 files changed, 908 insertions(+) | recent complete-looking branch without open PR; includes tests/docs/runbook or known completed bus/DMARC scope |
| `feat/acquisition-s05-sync-keywords` | +2/-35 | 2026-08-15 | 6 files changed, 990 insertions(+) | recent complete-looking branch without open PR; includes tests/docs/runbook or known completed bus/DMARC scope |
| `feat/acquisition-s06-lead-webhook` | +2/-38 | 2026-08-15 | 5 files changed, 803 insertions(+) | recent complete-looking branch without open PR; includes tests/docs/runbook or known completed bus/DMARC scope |
| `feat/acquisition-s07-dashboard` | +2/-26 | 2026-08-15 | 10 files changed, 867 insertions(+) | recent complete-looking branch without open PR; includes tests/docs/runbook or known completed bus/DMARC scope |
| `feat/acquisition-sync-persistence-prep` | +1/-19 | 2026-08-16 | 7 files changed, 713 insertions(+) | recent complete-looking branch without open PR; includes tests/docs/runbook or known completed bus/DMARC scope |
| `fix/acquisition-render-path` | +1/-12 | 2026-08-16 | 3 files changed, 156 insertions(+), 37 deletions(-) | recent complete-looking branch without open PR; includes tests/docs/runbook or known completed bus/DMARC scope |
| `fix/crm-layout-perf` | +1/-21 | 2026-08-15 | 15 files changed, 293 insertions(+), 24 deletions(-) | recent complete-looking branch without open PR; includes tests/docs/runbook or known completed bus/DMARC scope |
| `fix/crm-lists-pagination` | +1/-19 | 2026-08-16 | 10 files changed, 297 insertions(+), 24 deletions(-) | recent complete-looking branch without open PR; includes tests/docs/runbook or known completed bus/DMARC scope |
| `fix/dashboard-client-parallel` | +1/-12 | 2026-08-16 | 2 files changed, 185 insertions(+), 69 deletions(-) | recent complete-looking branch without open PR; includes tests/docs/runbook or known completed bus/DMARC scope |
| `fix/google-ads-api-v25` | +1/-29 | 2026-08-15 | 5 files changed, 13 insertions(+), 7 deletions(-) | recent complete-looking branch without open PR; includes tests/docs/runbook or known completed bus/DMARC scope |
| `fix/google-ads-search-path` | +1/-26 | 2026-08-15 | 8 files changed, 43 insertions(+), 6 deletions(-) | recent complete-looking branch without open PR; includes tests/docs/runbook or known completed bus/DMARC scope |
| `fix/lead-webhook-allowlist` | +1/-27 | 2026-08-15 | 4 files changed, 55 insertions(+), 7 deletions(-) | recent complete-looking branch without open PR; includes tests/docs/runbook or known completed bus/DMARC scope |
| `fix/perf-hotfix-complement` | +4/-12 | 2026-08-16 | 8 files changed, 322 insertions(+), 48 deletions(-) | recent complete-looking branch without open PR; includes tests/docs/runbook or known completed bus/DMARC scope |
| `fix/prod-drift-profiles-leads` | +1/-6 | 2026-08-16 | 2 files changed, 125 insertions(+) | recent complete-looking branch without open PR; includes tests/docs/runbook or known completed bus/DMARC scope |
| `fix/profile-tier-update-throttle` | +4/-12 | 2026-08-16 | 4 files changed, 236 insertions(+), 11 deletions(-) | recent complete-looking branch without open PR; includes tests/docs/runbook or known completed bus/DMARC scope |
| `fix/proxy-auth-timeout` | +1/-12 | 2026-08-16 | 8 files changed, 129 insertions(+), 108 deletions(-) | recent complete-looking branch without open PR; includes tests/docs/runbook or known completed bus/DMARC scope |
| `fix/supabase-fetch-timeout` | +1/-12 | 2026-08-16 | 4 files changed, 94 insertions(+), 1 deletion(-) | recent complete-looking branch without open PR; includes tests/docs/runbook or known completed bus/DMARC scope |
| `test/acquisition-e2e-smoke` | +2/-19 | 2026-08-16 | 4 files changed, 545 insertions(+) | recent complete-looking branch without open PR; includes tests/docs/runbook or known completed bus/DMARC scope |

## Kandidáti na zmazanie

| Branch | Last movement | PR | Summary |
|---|---:|---:|---|
| `chore/b1-auth-runbook-onboarding-unblock` | 2026-07-11 | NO | No commits ahead of main |
| `chore/brain-registry-drift-2026-07-27` | 2026-07-26 | NO | No commits ahead of main |
| `chore/brief10-wave-c-cleanup` | 2026-06-25 | NO | No commits ahead of main |
| `chore/governance-northstar-r4` | 2026-06-25 | NO | No commits ahead of main |
| `chore/preview-playwright-smoke` | 2026-07-13 | NO | No commits ahead of main |
| `chore/realvia-queue-triage` | 2026-06-25 | NO | No commits ahead of main |
| `chore/repo-hygiene-docs` | 2026-06-25 | NO | No commits ahead of main |
| `chore/revenue-telemetry` | 2026-05-22 | NO | No commits ahead of main |
| `chore/rls-schema-parity-audit` | 2026-06-26 | NO | No commits ahead of main |
| `cursor/pilot-ferovo-realtime-workspace-crm` | 2026-04-17 | NO | No commits ahead of main |
| `docs/bri-diagnostic-report` | 2026-06-19 | NO | No commits ahead of main |
| `docs/capabilities` | 2026-06-22 | NO | No commits ahead of main |
| `docs/decision-framework-skills` | 2026-07-06 | NO | No commits ahead of main |
| `docs/ops-uc-smolko-handoff` | 2026-06-19 | NO | No commits ahead of main |
| `docs/sales-tracker` | 2026-07-16 | NO | No commits ahead of main |
| `docs/stage0-pass-addendum` | 2026-08-15 | NO | No commits ahead of main |
| `feat/agency-billing-credits-migration` | 2026-06-03 | NO | No commits ahead of main |
| `feat/brief8-cadastre-wms-display` | 2026-06-15 | NO | No commits ahead of main |
| `feat/crm-architect-leads-migration` | 2026-05-14 | NO | No commits ahead of main |
| `feat/crm-architect-workflows-w1-w4` | 2026-05-14 | NO | No commits ahead of main |
| `feat/demo-funnel-preview` | 2026-05-22 | NO | No commits ahead of main |
| `feat/followup-agent-loop1` | 2026-06-25 | NO | No commits ahead of main |
| `feat/followup-drafts-ui` | 2026-06-25 | NO | No commits ahead of main |
| `feat/followup-guardian-gate` | 2026-06-25 | NO | No commits ahead of main |
| `feat/forecast-risk-nba` | 2026-05-21 | NO | No commits ahead of main |
| `feat/guardian-v1-blok-c` | 2026-07-27 | NO | No commits ahead of main |
| `feat/inbound-auto-response-variant-a` | 2026-07-16 | NO | No commits ahead of main |
| `feat/l99-strategy-rollout` | 2026-06-02 | NO | No commits ahead of main |
| `feat/lead-form-public` | 2026-06-28 | NO | No commits ahead of main |
| `feat/loop2-outcome-writer` | 2026-06-25 | NO | No commits ahead of main |
| `feat/marketing-zakulisie-token` | 2026-06-03 | NO | No commits ahead of main |
| `feat/pipeline-action-nba` | 2026-05-21 | NO | No commits ahead of main |
| `feat/realsoft-import-adapter` | 2026-06-16 | NO | No commits ahead of main |
| `feat/revenue-intelligence-wire-not-delete` | 2026-06-15 | NO | No commits ahead of main |
| `feat/sk-ui-vertical-pack-sidebar` | 2026-06-25 | NO | No commits ahead of main |
| `feat/starter-pack-47` | 2026-06-15 | NO | No commits ahead of main |
| `feat/stealth-recruiter-ingest-presov` | 2026-05-31 | NO | No commits ahead of main |
| `feat/team-action-nba` | 2026-05-21 | NO | No commits ahead of main |
| `feat/vertical-pack-listing-generator` | 2026-06-19 | NO | No commits ahead of main |
| `feat/vertical-pack-quality-guardian` | 2026-06-19 | NO | No commits ahead of main |
| `feat/vlna1-pr1-dashboard-insights` | 2026-06-03 | NO | No commits ahead of main |
| `feat/vlna1-pr1-insights-cron-cache` | 2026-06-03 | NO | No commits ahead of main |
| `feat/vlna1-pr2-vercel-crons` | 2026-06-03 | NO | No commits ahead of main |
| `feat/vlna1-pr3-arbitrage-live` | 2026-06-03 | NO | No commits ahead of main |
| `feat/w-leads-capture` | 2026-06-26 | NO | No commits ahead of main |
| `feat/wave0-truthful-pricing-marketing` | 2026-06-03 | NO | No commits ahead of main |
| `feat/wave1-export-diagnostics` | 2026-06-19 | NO | No commits ahead of main |
| `feat/wave1-listing-score` | 2026-06-19 | NO | No commits ahead of main |
| `feat/wave2-k4-playbook-cleanup` | 2026-06-20 | NO | No commits ahead of main |
| `feat/workdesk-enterprise-blue-pr2bc` | 2026-05-21 | NO | No commits ahead of main |
| `feat/workdesk-full-light-migration` | 2026-05-21 | NO | No commits ahead of main |
| `feat/workdesk-intelligence-phase3` | 2026-05-21 | NO | No commits ahead of main |
| `feat/workdesk-page-shells-pr35` | 2026-05-21 | NO | No commits ahead of main |
| `fix/billing-light-cleanup` | 2026-05-21 | NO | No commits ahead of main |
| `fix/ci-stealth-pattern-guard-ap011` | 2026-06-18 | NO | No commits ahead of main |
| `fix/crm-smolko-dotenv-init` | 2026-06-02 | NO | No commits ahead of main |
| `fix/dashboard-dark-leak` | 2026-05-22 | NO | No commits ahead of main |
| `fix/dashboard-insights-vercel-analytics` | 2026-06-03 | NO | No commits ahead of main |
| `fix/demo-slate-horizon` | 2026-05-22 | NO | No commits ahead of main |
| `fix/executive-ux-panels` | 2026-05-22 | NO | No commits ahead of main |
| `fix/followup-decisions-agent-column` | 2026-06-25 | NO | No commits ahead of main |
| `fix/followup-proxy-cron-bypass` | 2026-06-25 | NO | No commits ahead of main |
| `fix/forecasting-remove-demo-risk-strip` | 2026-06-05 | NO | No commits ahead of main |
| `fix/guardian-cta-deep-link-240` | 2026-06-23 | NO | No commits ahead of main |
| `fix/landing-phase3-preview-html` | 2026-05-22 | NO | No commits ahead of main |
| `fix/landing-slate-horizon-phase2` | 2026-05-22 | NO | No commits ahead of main |
| `fix/lead-ai-triage-imported-backfill` | 2026-06-04 | NO | No commits ahead of main |
| `fix/lead-form-public-prod` | 2026-06-28 | NO | No commits ahead of main |
| `fix/marketing-activate-modal-l99-pricing` | 2026-06-02 | NO | No commits ahead of main |
| `fix/marketing-hero-neviete-sk` | 2026-06-01 | NO | No commits ahead of main |
| `fix/onboard-agency-prod-schema` | 2026-07-11 | NO | No commits ahead of main |
| `fix/p0-sidebar-profile-select` | 2026-06-04 | NO | No commits ahead of main |
| `fix/playbook-last-contact-column` | 2026-06-19 | NO | No commits ahead of main |
| `fix/pr4-scrape-404-proxy-bypass` | 2026-06-04 | NO | No commits ahead of main |
| `fix/premium-overlay-a11y` | 2026-05-22 | NO | No commits ahead of main |
| `fix/prod-smolko-tenant-hotfix` | 2026-05-29 | NO | No commits ahead of main |
| `fix/proxy-cron-bypass` | 2026-05-20 | NO | No commits ahead of main |
| `fix/reality-monopol-test-detector-feature` | 2026-06-03 | NO | No commits ahead of main |
| `fix/resolveTenantSupabase-tasks-team` | 2026-06-27 | NO | No commits ahead of main |
| `fix/schema-guard-allowlist-prod-sync` | 2026-06-24 | NO | No commits ahead of main |

_Truncated in this section: 11 additional MERGED branches remain in the full table._

## Odporúčané poradie review

1. `feat/inbound-gmail-pull` (#422, READY, +3/-1) — DMARC/Gmail inbound is the named customer-facing forgotten-work risk.
2. `cursor/setup-dev-environment-4850` (#445, READY, +2/-1) — Environment branch has an open PR and affects agent reliability.
3. `cursor/critical-bug-management-86cc` (#447 draft, EXPERIMENT, +1/-0) — customer/blocker relevance or explicitly requested known branch
4. `cursor/critical-bug-management-2187` (#439, READY, +3/-4) — customer/blocker relevance or explicitly requested known branch
5. `cursor/inter-agent-bus-v01-db1f` (NO, READY, +1/-0) — Bus branch is the current coordination substrate; no open PR by instruction.

## Full branch table

| Branch | Ahead/behind main | Rozsah | Last movement | PR | Class | Summary |
|---|---:|---|---:|---:|---:|---|
| `chore/decisions-dedup-variant-a` | +1/-19 | 5 files changed, 76 insertions(+), 572 deletions(-) | 2026-08-15 | NO | READY | chore(brain): drop decisions.md twin so ingest reads memory/decisions.md; paths: brain/decisions(2), .github/workflows(1), brain/src(1), brain/tests(1) |
| `chore/genome-layer2-rename` | +1/-19 | 6 files changed, 227 insertions(+), 4 deletions(-) | 2026-08-16 | NO | READY | chore(crm): rename genome_layer2 migration to 14-digit stamp; paths: apps/crm/src(2), apps/crm/supabase(1), apps/crm/tests(1), brain/src(1) |
| `chore/seed-test-campaigns` | +1/-38 | 2 files changed, 402 insertions(+), 1 deletion(-) | 2026-08-15 | NO | READY | chore: add test-MCC-only Google Ads campaign seed script; paths: package.json(1), scripts/seed-test-campaigns.ts(1) |
| `cursor/critical-bug-management-2148` | +1/-19 | 6 files changed, 229 insertions(+), 21 deletions(-) | 2026-08-15 | NO | READY | fix(auth): stop ILIKE email wildcards hijacking profiles; paths: apps/crm/src(2), apps/crm/tests(1), docs/reports(1), memory/decisions.md(1) |
| `cursor/critical-bug-management-2187` | +3/-4 | 5 files changed, 292 insertions(+), 14 deletions(-) | 2026-08-17 | #439 | READY | fix(acquire): release dedup claim when lead insert fails; paths: apps/crm/src(2), apps/crm/tests(1), docs/reports(1), memory/session-summary.md(1) |
| `cursor/critical-bug-management-21e6` | +1/-43 | 2 files changed, 107 insertions(+), 8 deletions(-) | 2026-08-13 | NO | READY | fix(crm): stop listing edit PATCH stripping C4 titles/meta; paths: apps/crm/src(1), apps/crm/tests(1) |
| `cursor/critical-bug-management-84af` | +1/-60 | 5 files changed, 311 insertions(+), 37 deletions(-) | 2026-08-06 | #374 | READY | fix(credits): stop credits-cycle retry wiping new monthly grant; paths: apps/crm/src(5) |
| `cursor/critical-bug-management-9f47` | +2/-6 | 5 files changed, 88 insertions(+), 15 deletions(-) | 2026-08-16 | #438 | READY | fix(crm): fail-closed proxy API auth on getUser timeout; paths: apps/crm/src(2), apps/crm/tests(1), docs/reports(1), memory/session-summary.md(1) |
| `cursor/critical-bug-management-c64c` | +1/-38 | 5 files changed, 206 insertions(+), 5 deletions(-) | 2026-08-14 | NO | READY | fix(billing): do not ACK Stripe when pricing fulfillment fails; paths: apps/crm/src(4), apps/crm/tests(1) |
| `cursor/inter-agent-bus-v01-db1f` | +1/-0 | 13 files changed, 268 insertions(+) | 2026-08-21 | NO | READY | feat(bus): add inter-agent bus v0.1 skeleton; paths: .ai/bus(13) |
| `cursor/l99-lead-factory-brief-1782` | +1/-43 | 6 files changed, 435 insertions(+), 13 deletions(-) | 2026-08-14 | NO | READY | docs: L99 Lead Factory Initiative brief (VALIDATE, Fáza 1 first-party); paths: docs/briefs(2), docs/premortems(1), memory/decisions.md(1), memory/open-tasks.md(1) |
| `cursor/setup-dev-environment-4850` | +2/-1 | 4 files changed, 175 insertions(+) | 2026-08-20 | #445 | READY | chore(env): Cloud Agent dev environment (Docker + local Supabase); paths: .cursor/environment.json(1), .cursor/install.sh(1), .cursor/start.sh(1), docs/reports(1) |
| `docs/nocny-report-2026-08-16` | +1/-19 | 2 files changed, 202 insertions(+) | 2026-08-16 | #426 | READY | docs: nocna vlna N1+N2 report (16.8.2026); paths: docs/prompts(1), docs/reports(1) |
| `docs/perf-hotfix-diagnostika` | +2/-12 | 2 files changed, 259 insertions(+) | 2026-08-16 | #433 | READY | docs: perf hotfix diagnostika 16.8.2026 (L35); paths: docs/prompts(1), docs/reports(1) |
| `docs/reports-2026-08-17` | +6/-38 | 6 files changed, 228 insertions(+), 13 deletions(-) | 2026-08-15 | NO | READY | docs(prompts): Vlna 4 V4-A..D swarm prompt (no STF collision); paths: docs/reports(3), .cursor/rules(1), docs/prompts(1), memory/session-summary.md(1) |
| `docs/ruflo-swarm-status-2026-08-20` | +1/-1 | 1 file changed, 80 insertions(+) | 2026-08-20 | NO | READY | docs: Ruflo N1+N2 status as of 2026-08-20; paths: docs/reports(1) |
| `docs/schema-drift-audit-2026-08-17` | +1/-6 | 1 file changed, 290 insertions(+) | 2026-08-16 | NO | READY | docs: schema-drift audit 2026-08-17 (L38); paths: docs/reports(1) |
| `docs/stage0-2026-08-15-evidence` | +2/-28 | 4 files changed, 150 insertions(+) | 2026-08-15 | NO | READY | docs: hosted Preview webhook smoke is PASS; paths: docs/reports(3), memory/decisions.md(1) |
| `docs/stage0-pass-confirmed` | +5/-1 | 5 files changed, 311 insertions(+) | 2026-08-20 | NO | READY | docs: add Ruflo swarm NOC prompt (2026-08-15).; paths: docs/reports(3), docs/prompts(1), memory/session-summary.md(1) |
| `docs/v4-b-dmarc-oauth-pull` | +2/-38 | 2 files changed, 568 insertions(+) | 2026-08-15 | NO | READY | docs: expand V4-B OAuth pull design against live acquire route; paths: docs/architecture(1), docs/reports(1) |
| `docs/v4-c-migration-history-audit` | +1/-38 | 1 file changed, 520 insertions(+) | 2026-08-15 | NO | READY | docs: V4-C prod migration-history audit (read-only, no db push); paths: docs/reports(1) |
| `docs/v4-d-nbs-kraj-rady` | +2/-38 | 2 files changed, 1603 insertions(+) | 2026-08-15 | NO | READY | docs: fix typo in NBS krajské rady v0.2 report; paths: data(1), docs/reports(1) |
| `feat/acquisition-s04-sync-campaigns` | +2/-35 | 4 files changed, 908 insertions(+) | 2026-08-15 | NO | READY | Merge branch 'main' into feat/acquisition-s04-sync-campaigns; paths: apps/crm/src(4) |
| `feat/acquisition-s05-sync-keywords` | +2/-35 | 6 files changed, 990 insertions(+) | 2026-08-15 | NO | READY | Merge branch 'main' into feat/acquisition-s05-sync-keywords; paths: apps/crm/src(6) |
| `feat/acquisition-s06-lead-webhook` | +2/-38 | 5 files changed, 803 insertions(+) | 2026-08-15 | NO | READY | fix(acquisition): satisfy API contract ratchet on lead-webhook; paths: apps/crm/src(5) |
| `feat/acquisition-s07-dashboard` | +2/-26 | 10 files changed, 867 insertions(+) | 2026-08-15 | NO | READY | fix(acquisition): add required usage-metrics call on dashboard GET; paths: apps/crm/src(8), apps/crm/tests(1), docs/architecture(1) |
| `feat/acquisition-sync-persistence-prep` | +1/-19 | 7 files changed, 713 insertions(+) | 2026-08-16 | NO | READY | feat(acquisition): prep sync persist tables behind default-off flag.; paths: apps/crm/src(6), apps/crm/supabase(1) |
| `feat/inbound-gmail-pull` | +3/-1 | 10 files changed, 681 insertions(+), 1 deletion(-) | 2026-08-20 | #422 | READY | feat(crm): mock-first Gmail inbound pull (V4-B / L22); paths: apps/crm/src(6), apps/crm/.env.example(1), apps/crm/tests(1), docs/reports(1) |
| `fix/acquisition-render-path` | +1/-12 | 3 files changed, 156 insertions(+), 37 deletions(-) | 2026-08-16 | NO | READY | fix(crm): drop duplicate acquisition auth and parallelize selects; paths: apps/crm/src(3) |
| `fix/crm-layout-perf` | +1/-21 | 15 files changed, 293 insertions(+), 24 deletions(-) | 2026-08-15 | NO | READY | fix(crm): stop workdesk N+1 profile lookups and nav prefetch of 500-row lists; paths: apps/crm/src(11), apps/crm/tests(1), docs/reports(1), memory/decisions.md(1) |
| `fix/crm-lists-pagination` | +1/-19 | 10 files changed, 297 insertions(+), 24 deletions(-) | 2026-08-16 | NO | READY | fix(crm): paginate dashboard and leads lists instead of 500-row select *; paths: apps/crm/src(9), apps/crm/tests(1) |
| `fix/dashboard-client-parallel` | +1/-12 | 2 files changed, 185 insertions(+), 69 deletions(-) | 2026-08-16 | NO | READY | fix(crm): render dashboard after leads; load panels in parallel; paths: apps/crm/src(2) |
| `fix/google-ads-api-v25` | +1/-29 | 5 files changed, 13 insertions(+), 7 deletions(-) | 2026-08-15 | NO | READY | fix(acquisition): bump Google Ads API v18 to v25; paths: apps/crm/src(4), scripts/seed-test-campaigns.ts(1) |
| `fix/google-ads-search-path` | +1/-26 | 8 files changed, 43 insertions(+), 6 deletions(-) | 2026-08-15 | NO | READY | fix(acquisition): post GAQL to googleAds:search and date-filter search terms; paths: apps/crm/src(7), apps/crm/tests(1) |
| `fix/lead-webhook-allowlist` | +1/-27 | 4 files changed, 55 insertions(+), 7 deletions(-) | 2026-08-15 | NO | READY | fix(acquisition): allowlist Google lead-webhook past the session gate; paths: apps/crm/src(2), apps/crm/middleware.ts(1), apps/crm/tests(1) |
| `fix/p0-schema-alters-leads-profiles` | +1/-6 | 2 files changed, 102 insertions(+) | 2026-08-16 | #437 | READY | chore(db): P0 schema ALTERs — leads.last_contact_at/bri_score/dossier + profiles.is_platform_admin; paths: apps/crm/supabase(1), docs/reports(1) |
| `fix/perf-hotfix-complement` | +4/-12 | 8 files changed, 322 insertions(+), 48 deletions(-) | 2026-08-16 | NO | READY | docs: record perf-hotfix complement test/build evidence; paths: apps/crm/src(7), docs/reports(1) |
| `fix/prod-drift-profiles-leads` | +1/-6 | 2 files changed, 125 insertions(+) | 2026-08-16 | NO | READY | chore(db): prod drift catch-up for profiles.tier_updated_at and leads.* (L37); paths: apps/crm/supabase(1), docs/reports(1) |
| `fix/profile-tier-update-throttle` | +4/-12 | 4 files changed, 236 insertions(+), 11 deletions(-) | 2026-08-16 | NO | READY | docs: record PR 432 profile memo CI root cause and fix evidence; paths: apps/crm/src(3), docs/reports(1) |
| `fix/proxy-auth-timeout` | +1/-12 | 8 files changed, 129 insertions(+), 108 deletions(-) | 2026-08-16 | NO | READY | fix(crm): fail-open proxy auth after 5s and drop dead middleware; paths: apps/crm/tests(5), apps/crm/src(2), apps/crm/middleware.ts(1) |
| `fix/supabase-fetch-timeout` | +1/-12 | 4 files changed, 94 insertions(+), 1 deletion(-) | 2026-08-16 | NO | READY | fix(crm): abort hung Supabase fetches after 8s instead of 300s; paths: apps/crm/src(4) |
| `test/acquisition-e2e-smoke` | +2/-19 | 4 files changed, 545 insertions(+) | 2026-08-16 | NO | READY | test(crm): seed two local tenants for acquisition e2e isolation; paths: apps/crm/e2e(4) |
| `test/write-probe-stf-p0-20260812` | +1/-43 | 1 file changed, 1 insertion(+) | 2026-08-13 | #393 | READY | docs(audit): STF-P0 write-probe (do not merge without GO); paths: docs/audit(1) |
| `cursor/acquire-email-idempotency-dabc` | +4/-4 | 7 files changed, 483 insertions(+), 19 deletions(-) | 2026-08-18 | #440 draft | EXPERIMENT | fix(acquire): make email lead retry idempotent; paths: apps/crm/src(2), docs/reports(2), apps/crm/tests(1), memory/decisions.md(1) |
| `cursor/critical-bug-management-6a80` | +5/-1 | 10 files changed, 336 insertions(+), 151 deletions(-) | 2026-08-19 | #444 draft | EXPERIMENT | docs: critical bug hunt — matching recalculate data loss (2 HIGH); paths: apps/crm/src(6), apps/crm/tests(1), docs/reports(1), memory/decisions.md(1) |
| `cursor/critical-bug-management-86cc` | +1/-0 | 6 files changed, 251 insertions(+), 21 deletions(-) | 2026-08-20 | #447 draft | EXPERIMENT | fix(crm): stamp agency_id on team invite profiles; paths: apps/crm/src(2), apps/crm/tests(1), docs/reports(1), memory/decisions.md(1) |
| `cursor/critical-bug-management-d0db` | +1/-4 | 10 files changed, 255 insertions(+), 26 deletions(-) | 2026-08-18 | #443 draft | EXPERIMENT | fix(crm): thread scoped Supabase into property mutations; paths: apps/crm/src(6), apps/crm/tests(1), docs/reports(1), memory/decisions.md(1) |
| `cursor/gpt-sol-opus5-comms-zisti-dabc` | +1/-4 | 2 files changed, 81 insertions(+), 13 deletions(-) | 2026-08-18 | #441 draft | EXPERIMENT | docs: record GPT Sol Opus 5 comms ZISTI; paths: docs/reports(1), memory/session-summary.md(1) |
| `cursor/gpt-sol-opus5-contract-dabc` | +1/-4 | 4 files changed, 408 insertions(+), 13 deletions(-) | 2026-08-18 | #442 draft | EXPERIMENT | docs: draft GPT Sol Opus 5 communication contract; paths: docs/architecture(1), docs/reports(1), memory/decisions.md(1), memory/session-summary.md(1) |
| `docs/comms-drafts-2026-08-15` | +1/-19 | 2 files changed, 38 insertions(+) | 2026-08-15 | NO | EXPERIMENT | docs: draft unsent Smolko status and Unia barometer reminder; paths: docs/sales(2) |
| `docs/stage1-plan-draft` | +1/-19 | 1 file changed, 191 insertions(+) | 2026-08-15 | NO | EXPERIMENT | docs: draft Stage 1 plan for first real RK lead loop; paths: docs/architecture(1) |
| `docs/stf-p0-event-reliability` | +2/-43 | 1 file changed, 859 insertions(+) | 2026-08-13 | NO | EXPERIMENT | docs(architecture): seller-trust event reliability contract (L17 STF-P0); paths: docs/architecture(1) |
| `docs/stf-p0-legal-trust` | +1/-43 | 1 file changed, 528 insertions(+) | 2026-08-13 | NO | EXPERIMENT | docs(legal): seller-trust legal trust contract (L15 STF-P0); paths: docs/legal(1) |
| `docs/stf-p0-pilot-operating-contract` | +1/-43 | 1 file changed, 171 insertions(+) | 2026-08-13 | NO | EXPERIMENT | docs(briefs): seller-trust pilot operating contract (L18 STF-P0); paths: docs/briefs(1) |
| `docs/stf-p0-schema-truth` | +2/-43 | 1 file changed, 841 insertions(+) | 2026-08-13 | NO | EXPERIMENT | docs(architecture): seller-trust schema migration truth (L16 STF-P0); paths: docs/architecture(1) |
| `ai-core-v2` | +9/-657 | 222 files changed, 10124 insertions(+), 203 deletions(-) | 2026-05-19 | NO | STALE | chore: sync pulse cron comment with hourly schedule; paths: apps/crm/src(56), agents(6), apps/crm/docs(4), apps/crm/scripts(3) |
| `audit/seller-rescue-dedupe` | +1/-191 | 3 files changed, 54 insertions(+), 5 deletions(-) | 2026-07-08 | NO | STALE | fix(cron): seller-rescue nesmie duplikovat open ulohy a notifikacie; paths: apps/crm/src(3) |
| `chore/api-contract-guard` | +2/-64 | 5 files changed, 711 insertions(+), 4 deletions(-) | 2026-08-03 | NO | STALE | fix(crm): align credits-cycle cron with api-response + usage metrics; paths: apps/crm/scripts(2), apps/crm/src(2), .github/workflows(1) |
| `chore/api-hardening` | +1/-456 | 6 files changed, 120 insertions(+), 9 deletions(-) | 2026-06-08 | NO | STALE | chore(api): response helpers + security headers + input validation; paths: apps/crm/src(5), apps/crm/next.config.js(1) |
| `chore/api-response-standard` | +1/-476 | 4 files changed, 13 insertions(+), 4 deletions(-) | 2026-06-07 | NO | STALE | refactor(api): standardize response format; paths: apps/crm/src(4) |
| `chore/brief4-pr-matrix` | +1/-441 | 3 files changed, 540 insertions(+) | 2026-06-09 | NO | STALE | docs: Brief 4.0 overnight report + PR final matrix; paths: apps/crm/docs(2), overnight-master-brief-4.md(1) |
| `chore/brief9-backlog-wave` | +4/-411 | 25 files changed, 1482 insertions(+) | 2026-06-13 | NO | STALE | Merge branch 'feat/nehnutelnosti-import' into chore/brief9-backlog-wave; paths: apps/crm/src(22), apps/crm/docs(2), apps/marketing/docs(1) |
| `chore/brief9-docs-sync` | +1/-411 | 7 files changed, 266 insertions(+), 22 deletions(-) | 2026-06-11 | NO | STALE | chore(docs): Brief 9 Agent S3 overnight report and activation spec; paths: apps/crm/docs(3), docs/briefs(2), docs/AGENT_STANDARD.md(1), docs/AUTOMERGE-POLICY.md(1) |
| `chore/brief9-housekeeping` | +2/-409 | 4 files changed, 84 insertions(+), 5 deletions(-) | 2026-06-14 | NO | STALE | Merge branch 'main' into chore/brief9-housekeeping; paths: docs/briefs(2), apps/crm/docs(1), docs/ARCHIVE-PROPOSAL.md(1) |
| `chore/brief9-lint-sweep` | +1/-411 | 20 files changed, 716 deletions(-) | 2026-06-11 | NO | STALE | chore(crm): Brief 9 S2 remove orphaned lib modules; paths: apps/crm/src(20) |
| `chore/brief9-test-coverage` | +1/-411 | 7 files changed, 294 insertions(+), 11 deletions(-) | 2026-06-11 | NO | STALE | test(crm): Brief 9 S1 verification coverage for FEATURE-VERIFICATION gaps; paths: apps/crm/tests(7) |
| `chore/ci-playwright-smoke` | +2/-173 | 5 files changed, 57 insertions(+), 4 deletions(-) | 2026-07-13 | NO | STALE | fix(crm): stabilize Playwright smoke CI for AI cron routes; paths: .cursor/rules(1), .github/workflows(1), apps/crm/package.json(1), apps/crm/playwright.config.ts(1) |
| `chore/ci-vlna2-c1-brain-check` | +4/-58 | 7 files changed, 2112 insertions(+), 121 deletions(-) | 2026-08-11 | NO | STALE | docs(legal): NBS a SUSR povolenia na pouzitie cenovych dat (2026-08-10); paths: docs/architecture(2), docs/legal(2), .github/workflows(1), docs/prompts(1) |
| `chore/ci-vlna2-c2` | +1/-52 | 1 file changed, 1 insertion(+) | 2026-08-11 | NO | STALE | ci(crm): restore test:smoke:preview for preview Playwright workflow; paths: apps/crm/package.json(1) |
| `chore/cleanup-smoke-guard` | +3/-435 | 13 files changed, 357 insertions(+), 4 deletions(-) | 2026-06-10 | NO | STALE | ci: ephemeral local Supabase + allowlist guard for test/build; paths: apps/crm/tests(7), apps/crm/supabase(2), .github/workflows(1), apps/crm/docs(1) |
| `chore/cursor-rules-bo-workflow` | +1/-173 | 14 files changed, 328 insertions(+), 57 deletions(-) | 2026-07-13 | NO | STALE | chore(docs): scoped Cursor rules and BO verification workflow; paths: .cursor/rules(6), docs/briefs(4), .cursorignore(1), apps/crm/AGENTS.md(1) |
| `chore/dead-export-check` | +3/-64 | 3 files changed, 281 insertions(+), 5 deletions(-) | 2026-08-03 | #358 | STALE | chore(crm): dead-export check with ratchet baseline; paths: apps/crm/scripts(2), apps/crm/src(1) |
| `chore/deregister-stealth-recruiter-cron` | +1/-429 | 3 files changed, 142 insertions(+), 4 deletions(-) | 2026-06-10 | NO | STALE | chore(legal): deregister stealth-recruiter cron + CI guard; paths: .github/workflows(1), apps/crm/docs(1), apps/crm/vercel.json(1) |
| `chore/error-boundaries` | +1/-476 | 104 files changed, 1092 insertions(+) | 2026-06-07 | NO | STALE | feat(ux): add error + loading boundaries to all dashboard routes; paths: apps/crm/src(80) |
| `chore/feature-verification-6` | +2/-424 | 19 files changed, 718 insertions(+), 1 deletion(-) | 2026-06-11 | NO | STALE | fix(crm): align decision-flags verification with main branch behavior; paths: apps/crm/tests(17), apps/crm/docs(1), apps/crm/vitest.config.js(1) |
| `chore/gitignore-local-noise-cleanup` | +2/-599 | 0 files changed | 2026-05-22 | NO | STALE | Merge branch 'main' of https://github.com/onlinovosk-bit/RealitkaAI into chore/gitignore-local-noise-cleanup |
| `chore/lead-form-env-probe` | +1/-222 | 1 file changed, 10 insertions(+) | 2026-06-29 | NO | STALE | chore(crm): temp runtime probe for LEAD_FORM_TOKEN_SMOLKO length; paths: apps/crm/src(1) |
| `chore/overnight-docs` | +4/-481 | 4 files changed, 458 insertions(+) | 2026-06-07 | NO | STALE | docs: overnight TRACK-C triage matrix + OVERNIGHT-REPORT; paths: apps/crm/docs(4) |
| `chore/overnight-report-6` | +1/-424 | 2 files changed, 101 insertions(+) | 2026-06-11 | NO | STALE | docs: OVERNIGHT-REPORT-6 swarm closeout (Brief 6.0); paths: .swarm(1), apps/crm/docs(1) |
| `chore/overnight-report-v2` | +6/-478 | 1 file changed, 22 insertions(+), 16 deletions(-) | 2026-06-07 | NO | STALE | docs: update OVERNIGHT-REPORT with execution batch results; paths: apps/crm/docs(1) |
| `chore/performance-audit` | +3/-456 | 3 files changed, 160 insertions(+), 3 deletions(-) | 2026-06-08 | NO | STALE | docs: fix merge order line in overnight report 2; paths: apps/crm/docs(2), apps/crm/src(1) |
| `chore/remove-lead-form-debug-logs` | +1/-219 | 2 files changed, 14 deletions(-) | 2026-06-29 | NO | STALE | chore(crm): remove lead-form debug logs from production; paths: apps/crm/src(2) |
| `chore/revolis-incidents-rule` | +1/-64 | 1 file changed, 119 insertions(+) | 2026-08-03 | #357 | STALE | docs(cursor): add revolis-incidents rule; paths: .cursor/rules(1) |
| `chore/revolis-loops-rule` | +8/-64 | 26 files changed, 2935 insertions(+), 15 deletions(-) | 2026-08-03 | #364 | STALE | docs(cursor): revolis loops rule + handover briefs; paths: apps/crm/src(14), apps/crm/scripts(4), apps/crm/supabase(2), .cursor/rules(1) |
| `chore/rls-tenant-isolation-suite` | +6/-412 | 10 files changed, 1539 insertions(+), 2 deletions(-) | 2026-06-11 | NO | STALE | Merge branch 'main' into chore/rls-tenant-isolation-suite; paths: apps/crm/tests(4), apps/crm/supabase(3), .github/workflows(1), apps/crm/docs(1) |
| `chore/ruflo-mcp-config` | +2/-629 | 2 files changed, 29 insertions(+) | 2026-05-21 | NO | STALE | chore(dev): add Ruflo MCP config for Cursor Agent; paths: .cursor/mcp.json(1), .mcp.json(1) |
| `chore/smoke-test-suite` | +3/-455 | 6 files changed, 377 insertions(+), 160 deletions(-) | 2026-06-09 | NO | STALE | Merge branch 'main' into chore/smoke-test-suite; paths: apps/crm/src(3), apps/crm/docs(1), apps/crm/playwright.config.ts(1), apps/crm/tests(1) |
| `chore/smoke-tests` | +1/-476 | 4 files changed, 173 insertions(+), 9 deletions(-) | 2026-06-07 | NO | STALE | test(smoke): add production smoke test suite; paths: apps/crm/docs(1), apps/crm/playwright.config.ts(1), apps/crm/src(1), apps/crm/tests(1) |
| `chore/stale-main-guardrails` | +3/-407 | 6 files changed, 46 insertions(+) | 2026-06-14 | NO | STALE | Merge branch 'main' into chore/stale-main-guardrails; paths: .cursor/rules(2), apps/crm/docs(2), apps/crm/tests(1), memory/decisions.md(1) |
| `chore/ts-strict-fixes` | +1/-476 | 5 files changed, 113 insertions(+), 21 deletions(-) | 2026-06-07 | NO | STALE | fix(types): strict TypeScript fixes — top 5 critical; paths: apps/crm/src(4), apps/crm/docs(1) |
| `chore/vercel-ignore-build` | +1/-436 | 1 file changed, 3 insertions(+) | 2026-06-09 | #155 | STALE | chore(vercel): skip Vercel build for docs-only commits; paths: apps/crm/vercel.json(1) |
| `cursor/critical-bug-management-21a8` | +1/-45 | 2 files changed, 241 insertions(+), 50 deletions(-) | 2026-08-12 | NO | STALE | fix(credits): claim starter-pack codes before granting credits; paths: apps/crm/src(2) |
| `cursor/critical-bug-management-7e01` | +1/-61 | 3 files changed, 174 insertions(+), 8 deletions(-) | 2026-08-05 | #371 | STALE | fix(billing): stop legacy webhook wiping paid tiers to free; paths: apps/crm/src(2), apps/crm/tests(1) |
| `cursor/critical-bug-management-94f0` | +1/-61 | 9 files changed, 525 insertions(+), 282 deletions(-) | 2026-08-04 | #370 draft | STALE | fix(credits): atomic purchase/grant/expire RPCs (lost-update race); paths: apps/crm/src(8), apps/crm/supabase(1) |
| `cursor/critical-bug-management-ff95` | +1/-64 | 2 files changed, 27 insertions(+), 3 deletions(-) | 2026-08-04 | #369 draft | STALE | fix(crm): restore /upgrade Stripe checkout (okResponse contract); paths: apps/crm/src(1), apps/crm/tests(1) |
| `cursor/integrations-realvia-route-2432` | +1/-665 | 5 files changed, 86 insertions(+), 5 deletions(-) | 2026-05-12 | NO | STALE | feat(crm): add /integrations/realvia page and admin redirect; paths: apps/crm/src(2), apps/crm/middleware.ts(1), apps/crm/next.config.js(1), apps/crm/tests(1) |
| `docs/architecture-layers` | +6/-586 | 6 files changed, 129 insertions(+), 1 deletion(-) | 2026-05-27 | NO | STALE | fix(vercel): remove invalid build settings from vercel.json; paths: apps/crm/src(3), apps/crm/docs(2), apps/crm/vercel.json(1) |
| `docs/brain-identity-lessons` | +3/-117 | 13 files changed, 637 insertions(+), 41 deletions(-) | 2026-07-24 | NO | STALE | chore(brain): regen registry after wave 1 docs merge; paths: brain/lessons(4), brain/audits(2), brain/identity(2), brain/src(2) |
| `docs/build-package-moat-guardian` | +2/-115 | 10 files changed, 716 insertions(+), 23 deletions(-) | 2026-07-26 | NO | STALE | chore(brain): sync registry index after rebase; paths: docs/briefs(2), docs/premortems(2), .cursor/rules(1), brain/decisions(1) |
| `docs/dead-code-audit` | +1/-476 | 1 file changed, 61 insertions(+) | 2026-06-07 | NO | STALE | docs: dead code audit; paths: apps/crm/docs(1) |
| `docs/decisions-dedup-audit` | +1/-48 | 2 files changed, 299 insertions(+) | 2026-08-12 | NO | STALE | docs(architecture): audit dual decision logs (LANE 11); paths: docs/architecture(1), docs/prompts(1) |
| `docs/doplnenie-2026-08-11` | +1/-53 | 14 files changed, 1921 insertions(+) | 2026-08-11 | NO | STALE | docs: doplnenie promptov, legal povolení (rename), swarm plánov a Smolko podkladov; paths: docs/prompts(7), brain/decisions(2), docs/legal(2), docs/sales(2) |
| `docs/email-gateway-payload-v1` | +4/-149 | 2 files changed, 273 insertions(+), 20 deletions(-) | 2026-07-17 | NO | STALE | Merge branch 'main' into docs/email-gateway-payload-v1; paths: apps/crm/src(1), docs/architecture(1) |
| `docs/engineering-constitution-decision-memory` | +2/-71 | 9 files changed, 459 insertions(+), 68 deletions(-) | 2026-08-02 | NO | STALE | chore(brain): sync registry and decisions indexes after ingest; paths: docs/architecture(2), .claude(1), .cursor/rules(1), brain/ENGINE.md(1) |
| `docs/genome-audit` | +1/-57 | 1 file changed, 164 insertions(+) | 2026-08-11 | NO | STALE | docs: audit oddly named 2026_genome_layer2 migration; paths: docs/architecture(1) |
| `docs/krajske-koeficienty-v0` | +1/-48 | 2 files changed, 362 insertions(+) | 2026-08-12 | NO | STALE | docs(data): krajské koeficienty v0 — blocked unpaired (LANE 10); paths: data(1), docs/architecture(1) |
| `docs/leads-score-audit` | +1/-476 | 1 file changed, 106 insertions(+) | 2026-06-07 | NO | STALE | docs: leads score audit — Smolko 439 contacts; paths: apps/crm/docs(1) |
| `docs/night-ops-2026-08-03` | +5/-63 | 13 files changed, 1017 insertions(+), 88 deletions(-) | 2026-08-04 | NO | STALE | fix(brain): regenerate registry index for deterministic ingest; paths: docs/automations(5), docs/architecture(2), docs/audit(2), brain/decisions(1) |
| `docs/overnight-pr-triage-2026-06-08` | +3/-456 | 2 files changed, 314 insertions(+), 91 deletions(-) | 2026-06-08 | NO | STALE | docs(crm): consolidate overnight swarm report (E->A->D->B->C); paths: apps/crm/docs(2) |
| `docs/overnight-report-4-update` | +1/-437 | 1 file changed, 183 insertions(+), 42 deletions(-) | 2026-06-09 | NO | STALE | docs: update OVERNIGHT-REPORT-4 — merged PRs, SQL checklist, Smolko prod; paths: apps/crm/docs(1) |
| `docs/smolko-status` | +1/-52 | 1 file changed, 97 insertions(+) | 2026-08-11 | NO | STALE | docs(sales): Smolko status 2026-08-10; paths: docs/sales(1) |
| `docs/stage0-zisti` | +3/-57 | 1 file changed, 307 insertions(+) | 2026-08-11 | NO | STALE | docs: clarify L3 ZISTI — leads UNIQUE deferred to Stage 2, SA path confirmed; paths: docs/architecture(1) |
| `docs/veos-premortem-voice-standards` | +2/-121 | 8 files changed, 316 insertions(+), 23 deletions(-) | 2026-07-24 | NO | STALE | chore(brain): sync registry and decisions index after ingest; paths: .cursor/rules(2), brain/decisions(1), brain/registry(1), brain/src(1) |
| `feat/acquire-email-gateway-wave1` | +4/-217 | 10 files changed, 484 insertions(+) | 2026-07-01 | NO | STALE | feat(acquire): email gateway per official package (adapter + route + dedup); paths: apps/crm/src(7), apps/crm/middleware.ts(1), apps/crm/supabase(1), apps/crm/tests(1) |
| `feat/acquire-email-worker-route` | +5/-214 | 5 files changed, 168 insertions(+), 141 deletions(-) | 2026-07-03 | NO | STALE | chore(ci): trigger PR synchronize after migration fix; paths: apps/crm/src(3), apps/crm/supabase(1), apps/crm/tests(1) |
| `feat/acquisition-s01-migracia` | +2/-52 | 4 files changed, 524 insertions(+), 2 deletions(-) | 2026-08-12 | NO | STALE | fix(crm): correct acquisition schema probe assertion in CI; paths: apps/crm/src(2), apps/crm/supabase(1), docs/architecture(1) |
| `feat/acquisition-s02-credentials` | +2/-48 | 7 files changed, 930 insertions(+) | 2026-08-12 | NO | STALE | fix(crm): satisfy API contract ratchet on acquisition Google routes; paths: apps/crm/src(6), apps/crm/.env.local.example(1) |
| `feat/acquisition-s03-klient` | +1/-52 | 2 files changed, 593 insertions(+) | 2026-08-11 | NO | STALE | feat(acquisition): add Google Ads client wrapper with retry and rate limit; paths: apps/crm/src(2) |
| `feat/agencies-manual-plan` | +1/-478 | 2 files changed, 22 insertions(+) | 2026-06-07 | NO | STALE | feat(db): agencies manual_plan column + document decision engine smoke 401; paths: apps/crm/docs(1), apps/crm/supabase(1) |
| `feat/ai-security-foundation` | +1/-141 | 2 files changed, 281 insertions(+) | 2026-07-20 | NO | STALE | docs(security): add AI security policy and gap map; paths: apps/crm/tests(1), docs/security(1) |
| `feat/automerge-policy` | +1/-413 | 9 files changed, 579 insertions(+), 25 deletions(-) | 2026-06-11 | NO | STALE | feat(ci): Brief 9.0 Phase 0 — auto-merge policy and overnight orchestrator bootstrap; paths: docs/briefs(2), .github/scripts(1), .github/workflows(1), .swarm(1) |
| `feat/billing-credits-panel` | +2/-100 | 13 files changed, 700 insertions(+), 175 deletions(-) | 2026-07-31 | NO | STALE | fix(ci): align starter-pack test fixture and refresh brain indexes; paths: apps/crm/src(9), apps/crm/tests(1), brain/decisions(1), brain/registry(1) |
| `feat/bo-a-triage-ui` | +1/-193 | 10 files changed, 229 insertions(+), 107 deletions(-) | 2026-07-07 | NO | STALE | feat(ui): triage visibility for Smolko (BO-A items 1-4); paths: apps/crm/src(10) |
| `feat/brief7-focus-product` | +1/-404 | 12 files changed, 385 insertions(+), 129 deletions(-) | 2026-06-15 | NO | STALE | feat(crm): enforce Brief 7 hide-only module visibility policy; paths: apps/crm/src(10), .github/scripts(1), docs/briefs(1) |
| `feat/buyer-intent-repair-1-0` | +1/-166 | 7 files changed, 638 insertions(+), 64 deletions(-) | 2026-07-13 | NO | STALE | feat: add buyer intent infrastructure and tenant RLS; paths: apps/crm/src(4), apps/crm/supabase(2), apps/crm/scripts(1) |
| `feat/call-analyzer-proof-ceo-ui` | +2/-420 | 14 files changed, 592 insertions(+), 1 deletion(-) | 2026-06-11 | NO | STALE | feat(crm): wire CEO Command store, nav, and analyzer mock tests; paths: apps/crm/src(8), apps/crm/tests(6) |
| `feat/call-analyzer-verify` | +1/-446 | 3 files changed, 94 insertions(+), 1 deletion(-) | 2026-06-09 | NO | STALE | feat(calls): call analyzer verification — empty state + capabilities update; paths: apps/crm/docs(2), apps/crm/src(1) |
| `feat/capabilities-strip-html-description` | +2/-304 | 6 files changed, 178 insertions(+), 1 deletion(-) | 2026-06-22 | NO | STALE | Merge pull request #232 from onlinovosk-bit/test/capabilities-coverage; paths: apps/crm/src(6) |
| `feat/ceo-command-clean` | +1/-432 | 2 files changed, 95 insertions(+), 1 deletion(-) | 2026-06-10 | NO | STALE | feat(routines): CEO Command Center — director briefing in morning-brief; paths: apps/crm/src(2) |
| `feat/checkout-order-bump-migration` | +1/-411 | 11 files changed, 393 insertions(+) | 2026-06-11 | #198 | STALE | feat(billing): DFY migration order bump at seat checkout (G1); paths: apps/crm/src(9), apps/crm/.env.local.example(1), apps/crm/supabase(1) |
| `feat/dashboard-insights-llm` | +1/-420 | 9 files changed, 355 insertions(+), 30 deletions(-) | 2026-06-11 | NO | STALE | feat(crm): dashboard insights LLM cache path with TTL and audit logging; paths: apps/crm/src(9) |
| `feat/deal-trigger-live` | +1/-446 | 3 files changed, 134 insertions(+), 34 deletions(-) | 2026-06-09 | NO | STALE | feat(agents): deal-trigger live — NULL safety + stale badge + POST smoke; paths: apps/crm/src(3) |
| `feat/demo-landing-page` | +4/-454 | 6 files changed, 815 insertions(+), 25 deletions(-) | 2026-06-09 | NO | STALE | Merge branch 'main' into feat/demo-landing-page; paths: apps/marketing/app(2), apps/marketing/components(2), apps/crm/docs(1), apps/marketing/next.config.ts(1) |
| `feat/demo-ops` | +1/-424 | 19 files changed, 1034 insertions(+), 1 deletion(-) | 2026-06-11 | NO | STALE | feat(demo-ops): Calendly webhook, pre-demo brief and recap crons; paths: apps/crm/src(14), apps/crm/.env.local.example(1), apps/crm/docs(1), apps/crm/package.json(1) |
| `feat/demo-page-v3` | +9/-428 | 11 files changed, 1227 insertions(+), 12 deletions(-) | 2026-06-10 | NO | STALE | fix(demo): FAQ pricing copy after cennik section removal; paths: apps/crm/supabase(8), apps/crm/docs(1), apps/marketing/public(1), scripts/build-demo-v3.py(1) |
| `feat/follow-up-sweep-v2` | +1/-446 | 4 files changed, 161 insertions(+), 1 deletion(-) | 2026-06-09 | NO | STALE | feat(cron): follow-up-sweep v2 — action scoring + urgency + workdesk card; paths: apps/crm/src(4) |
| `feat/founder-metrics` | +1/-411 | 10 files changed, 836 insertions(+) | 2026-06-11 | NO | STALE | feat(crm): founder metrics dashboard (Brief 9 Agent M); paths: apps/crm/src(10) |
| `feat/founder-metrics-m2` | +2/-411 | 17 files changed, 1395 insertions(+) | 2026-06-11 | #191 | STALE | feat(crm): founder metrics CSV export + 4-week trends (Brief 9 M2); paths: apps/crm/src(17) |
| `feat/guardian-v1.1-thresholds` | +6/-105 | 14 files changed, 535 insertions(+), 57 deletions(-) | 2026-07-27 | NO | STALE | fix(brain): git blob digests for cross-platform brain:check; paths: apps/crm/src(6), apps/crm/scripts(2), brain/src(2), apps/crm/.env.local.example(1) |
| `feat/inbound-auto-response-1-0` | +1/-166 | 6 files changed, 435 insertions(+) | 2026-07-13 | NO | STALE | feat: add automatic response for inbound email leads; paths: apps/crm/src(4), apps/crm/supabase(1), apps/crm/tests(1) |
| `feat/inbound-triage-signal` | +1/-194 | 5 files changed, 272 insertions(+), 5 deletions(-) | 2026-07-07 | NO | STALE | feat(acquire): inline inbound triage + new_lead notification on insert; paths: apps/crm/src(5) |
| `feat/inzerat-generator` | +1/-100 | 136 files changed, 30042 insertions(+), 115 deletions(-) | 2026-07-31 | NO | STALE | feat(crm): listing generator with Langfuse observability; paths: .cursor/skills(80) |
| `feat/landing-v2-release` | +1/-411 | 12 files changed, 1005 insertions(+), 770 deletions(-) | 2026-06-11 | NO | STALE | feat(marketing): landing v2 from demo v3 DNA (Brief 9 Agent L); paths: apps/marketing/components(4), apps/marketing/app(3), apps/marketing/lib(2), apps/marketing/docs(1) |
| `feat/leads-pipeline-ux` | +1/-446 | 4 files changed, 193 insertions(+), 7 deletions(-) | 2026-06-09 | NO | STALE | feat(leads): UX upgrade — bulk actions + quick contact + source badge + last contact; paths: apps/crm/src(4) |
| `feat/listing-gen-persistence` | +1/-64 | 5 files changed, 310 insertions(+), 3 deletions(-) | 2026-08-03 | NO | STALE | feat(crm): persist listing generator drafts (ai_generations); paths: apps/crm/src(4), apps/crm/supabase(1) |
| `feat/listing-gen-ui` | +3/-64 | 9 files changed, 693 insertions(+), 3 deletions(-) | 2026-08-03 | #361 | STALE | feat(crm): broker UI for listing generator; paths: apps/crm/src(8), apps/crm/supabase(1) |
| `feat/listing-gen-variants` | +5/-64 | 20 files changed, 2374 insertions(+), 6 deletions(-) | 2026-08-03 | #363 | STALE | feat(crm): four listing style variants; paths: apps/crm/src(11), apps/crm/scripts(4), apps/crm/supabase(2), .github/workflows(1) |
| `feat/listing-generator-pr-a-prompt-wire` | +2/-60 | 25 files changed, 2609 insertions(+), 95 deletions(-) | 2026-08-07 | NO | STALE | fix(brain): refresh indexes after memory edits for PR-A; paths: docs/prompts(11), apps/crm/tests(8), apps/crm/src(2), brain/decisions(1) |
| `feat/listing-generator-pr-b-charakter-lokality` | +2/-59 | 9 files changed, 689 insertions(+), 65 deletions(-) | 2026-08-10 | NO | STALE | fix(brain): refresh indexes for PR-B CI brain:check; paths: apps/crm/src(6), apps/crm/tests(1), brain/decisions(1), brain/registry(1) |
| `feat/manual-plan-billing` | +1/-441 | 2 files changed, 74 insertions(+), 2 deletions(-) | 2026-06-09 | NO | STALE | feat(billing): agencies.manual_plan — non-Stripe plan override in saas-ops; paths: apps/crm/src(1), apps/crm/supabase(1) |
| `feat/maplibre-openfreemap` | +1/-629 | 4 files changed, 258 insertions(+), 125 deletions(-) | 2026-05-21 | NO | STALE | feat(maps): replace Mapbox with MapLibre and OpenFreeMap tiles; paths: apps/crm/src(2), apps/crm/package.json(1), package-lock.json(1) |
| `feat/memory-engine-v1` | +2/-129 | 27 files changed, 4944 insertions(+) | 2026-07-22 | NO | STALE | chore(brain): sync registry and audit after ingest on main; paths: brain/src(8), brain/tests(3), docs/architecture(3), brain/audits(2) |
| `feat/migration-intelligence` | +1/-457 | 7 files changed, 187 insertions(+), 7 deletions(-) | 2026-06-08 | NO | STALE | feat(import): sidebar Importovať kontakty + onboarding banner; paths: apps/crm/src(6), apps/crm/tests(1) |
| `feat/migration-intelligence-wiring` | +3/-453 | 9 files changed, 406 insertions(+), 18 deletions(-) | 2026-06-09 | NO | STALE | Merge branch 'main' into feat/migration-intelligence-wiring; paths: apps/crm/src(8), apps/crm/docs(1) |
| `feat/moat-capture-blok-b` | +2/-114 | 23 files changed, 941 insertions(+), 43 deletions(-) | 2026-07-26 | NO | STALE | chore(brain): sync registry index after moat capture ingest; paths: apps/crm/src(13), apps/crm/supabase(2), apps/crm/tests(2), apps/crm/config(1) |
| `feat/moat-capture-pr-b2-modal` | +2/-111 | 15 files changed, 675 insertions(+), 18 deletions(-) | 2026-07-27 | NO | STALE | chore(brain): sync registry index after ingest; paths: apps/crm/src(13), apps/crm/tests(1), brain/registry(1) |
| `feat/morning-brief-v2` | +1/-456 | 3 files changed, 128 insertions(+), 37 deletions(-) | 2026-06-08 | NO | STALE | feat(brief): Morning Brief v2 — richer content, retry, better prompt; paths: apps/crm/src(3) |
| `feat/n8n-foundation-docs` | +2/-131 | 6 files changed, 235 insertions(+) | 2026-07-22 | NO | STALE | feat(automation): n8n export skeleton and CI secrets guard; paths: .cursor/rules(1), .github/workflows(1), automation(1), docs/architecture(1) |
| `feat/n8n-workflow-exports-v1` | +1/-127 | 4 files changed, 377 insertions(+), 5 deletions(-) | 2026-07-23 | NO | STALE | feat(n8n): export W1–W3 workflow JSONs for V1 foundation; paths: automation(4) |
| `feat/nbs-atribucia` | +1/-57 | 7 files changed, 85 insertions(+), 1 deletion(-) | 2026-08-11 | NO | STALE | feat(valuation): add NBS attribution to widget and estimate API; paths: apps/crm/src(6), data(1) |
| `feat/nehnutelnosti-import` | +2/-411 | 25 files changed, 1482 insertions(+) | 2026-06-13 | #186 | STALE | feat(crm): nehnutelnosti.sk universal import (Brief 9 Agent N); paths: apps/crm/src(22), apps/crm/docs(2), apps/marketing/docs(1) |
| `feat/notifications-inbox` | +1/-411 | 10 files changed, 790 insertions(+) | 2026-06-11 | #192 | STALE | feat(crm): notifications inbox UI (Brief 9 Agent I); paths: apps/crm/src(9), apps/crm/tests(1) |
| `feat/notifications-infra-fk-fix` | +3/-435 | 9 files changed, 425 insertions(+), 1 deletion(-) | 2026-06-10 | NO | STALE | feat(routines): CEO Command Center — director briefing in morning-brief (#159); paths: apps/crm/src(6), apps/crm/supabase(2), apps/crm/vercel.json(1) |
| `feat/onboard-agency-script` | +2/-184 | 3 files changed, 755 insertions(+) | 2026-07-10 | NO | STALE | Merge branch 'main' into feat/onboard-agency-script; paths: apps/crm/scripts(1), docs/briefs(1), docs/runbooks(1) |
| `feat/onboarding-activation-emails` | +1/-413 | 16 files changed, 1007 insertions(+) | 2026-06-11 | NO | STALE | feat(crm): activation onboarding emails D0-D7 (S0-S4, flag OFF); paths: apps/crm/src(10), apps/crm/docs(2), apps/crm/.env.local.example(1), apps/crm/supabase(1) |
| `feat/onboarding-wizard` | +2/-411 | 27 files changed, 2276 insertions(+), 1 deletion(-) | 2026-06-15 | #189 | STALE | feat(crm): onboarding wizard 3-step (Brief 9 Agent W); paths: apps/crm/src(23), apps/crm/docs(2), apps/crm/.env.example(1), apps/crm/.env.local.example(1) |
| `feat/onboarding-wizard-w2` | +2/-411 | 27 files changed, 2276 insertions(+), 1 deletion(-) | 2026-06-11 | NO | STALE | feat(crm): wire activation emails to wizard milestones (Brief 9 W2); paths: apps/crm/src(23), apps/crm/docs(2), apps/crm/.env.example(1), apps/crm/.env.local.example(1) |
| `feat/operator-dashboard-v1` | +3/-101 | 17 files changed, 1238 insertions(+), 59 deletions(-) | 2026-07-28 | NO | STALE | chore(brain): sync registry for operator PR; add founder MIGRATION copy; paths: apps/crm/src(9), apps/crm/supabase(2), apps/crm/.env.local.example(1), apps/crm/tests(1) |
| `feat/outcome-first-workdesk` | +1/-149 | 24 files changed, 1081 insertions(+), 181 deletions(-) | 2026-07-17 | NO | STALE | feat(workdesk): outcome-first UX with 60s audit and single daily CTA; paths: apps/crm/src(19), docs/briefs(2), apps/crm/tests(1), memory/decisions.md(1) |
| `feat/p4-platform-heartbeat` | +2/-191 | 10 files changed, 769 insertions(+) | 2026-07-08 | NO | STALE | feat(infra): P4 platform heartbeat cron + tenant-health signals; paths: apps/crm/src(7), apps/crm/tests(1), apps/crm/vercel.json(1), docs/runbooks(1) |
| `feat/phase-5-license-intelligence` | +2/-627 | 19 files changed, 1057 insertions(+), 177 deletions(-) | 2026-05-22 | NO | STALE | fix(ui): migrate /revolis-ai to Slate Horizon light workdesk (#43); paths: apps/crm/src(17), apps/crm/docs(2) |
| `feat/phase5-forecast-gating` | +1/-441 | 1 file changed, 14 insertions(+) | 2026-06-09 | NO | STALE | docs(license): TRACK-D forecast gating verification (Brief 4.0); paths: apps/crm/docs(1) |
| `feat/phase5-team-gating` | +1/-441 | 1 file changed, 14 insertions(+) | 2026-06-09 | NO | STALE | docs(license): TRACK-E team gating verification (Brief 4.0); paths: apps/crm/docs(1) |
| `feat/pr1-valuation-city-anchors` | +6/-61 | 17 files changed, 987 insertions(+), 215 deletions(-) | 2026-08-06 | NO | STALE | feat(valuation): priznané rozpätie v UI (PR-2) (#373); paths: apps/crm/src(12), .github/workflows(1), apps/crm/tests(1), brain/decisions(1) |
| `feat/pr2-valuation-band-ui` | +3/-61 | 13 files changed, 913 insertions(+), 189 deletions(-) | 2026-08-06 | NO | STALE | test(valuation): cover widget form insufficient_data contact path; paths: apps/crm/src(9), apps/crm/tests(1), brain/decisions(1), brain/registry(1) |
| `feat/premortem-workflow-v1` | +1/-125 | 6 files changed, 330 insertions(+) | 2026-07-23 | NO | STALE | Add premortem workflow template, Smolko Ads premortem, and brain registry.; paths: .cursor/rules(1), brain/decisions(1), brain/registry(1), brain/src(1) |
| `feat/pricing-pr2-grants` | +1/-420 | 7 files changed, 352 insertions(+), 5 deletions(-) | 2026-06-11 | NO | STALE | feat(pricing): PR-2 grant engine gaps — spend_credits + tests; paths: apps/crm/src(5), apps/crm/docs(1), apps/crm/supabase(1) |
| `feat/pricing-pr3-cost-log` | +5/-414 | 27 files changed, 1196 insertions(+), 150 deletions(-) | 2026-06-11 | NO | STALE | fix(crm): rebase collision — duplicate import and vi.hoisted mocks; paths: apps/crm/src(24), apps/crm/.env.local.example(1), apps/crm/docs(1), apps/crm/supabase(1) |
| `feat/pricing-pr4-checkout` | +3/-420 | 33 files changed, 1608 insertions(+), 81 deletions(-) | 2026-06-11 | NO | STALE | feat(pricing): PR-4 Stripe seat/top-up checkout and upgrade UI; paths: apps/crm/src(29), apps/crm/supabase(2), apps/crm/.env.local.example(1), apps/crm/docs(1) |
| `feat/pricing-v1-pr1-stack` | +11/-428 | 24 files changed, 1477 insertions(+), 17 deletions(-) | 2026-06-10 | NO | STALE | feat(pricing): PR-4 seat and top-up Stripe checkout routes; paths: apps/crm/supabase(10), apps/crm/src(9), apps/crm/docs(2), .swarm(1) |
| `feat/prospecting-pipeline` | +8/-428 | 35 files changed, 1733 insertions(+), 12 deletions(-) | 2026-06-10 | NO | STALE | feat(prospecting): FinStat enrichment ICP scoring CLI pipeline; paths: scripts/prospecting(24), apps/crm/supabase(8), data(2), package.json(1) |
| `feat/realvia-importer` | +1/-424 | 12 files changed, 1222 insertions(+) | 2026-06-11 | NO | STALE | feat(crm): Realvia JSON migration importer with dry-run; paths: apps/crm/src(10), apps/crm/scripts(1), apps/crm/supabase(1) |
| `feat/routine-ceo-command` | +2/-435 | 5 files changed, 199 insertions(+), 1 deletion(-) | 2026-06-09 | NO | STALE | feat(routines): CEO Command Center — director briefing in morning-brief; paths: apps/crm/src(3), apps/crm/supabase(2) |
| `feat/routine-seller-rescue` | +2/-435 | 7 files changed, 330 insertions(+) | 2026-06-09 | NO | STALE | feat(routines): Seller Rescue — churn scoring + notifications + cron; paths: apps/crm/src(4), apps/crm/supabase(2), apps/crm/vercel.json(1) |
| `feat/seller-rescue-clean` | +1/-432 | 4 files changed, 226 insertions(+) | 2026-06-10 | NO | STALE | feat(routines): Seller Rescue — churn scoring + notifications + cron; paths: apps/crm/src(3), apps/crm/vercel.json(1) |
| `feat/stealth-recruiter-production` | +2/-215 | 18 files changed, 972 insertions(+), 297 deletions(-) | 2026-07-02 | NO | STALE | Merge branch 'main' into feat/stealth-recruiter-production; paths: apps/crm/src(15), apps/crm/docs(1), apps/crm/supabase(1), apps/crm/tests(1) |
| `feat/susr-sp3801qr` | +1/-57 | 2 files changed, 810 insertions(+) | 2026-08-11 | NO | STALE | chore(data): ingest ŠÚ SR sp3801qr for PO+KE (not wired); paths: data(1), scripts/fetch-susr.ts(1) |
| `feat/universal-crm-import-ui` | +1/-458 | 15 files changed, 1198 insertions(+), 1 deletion(-) | 2026-06-08 | NO | STALE | feat(import): Universal CRM Import — UI + API + column detector + preview wizard; paths: apps/crm/src(15) |
| `feat/valuation-sandbox-gdpr-consent` | +7/-132 | 1 file changed, 9 insertions(+), 15 deletions(-) | 2026-07-21 | NO | STALE | docs(memory): overnight handoff after PR #311 merge; paths: memory/session-summary.md(1) |
| `feat/valuation-widget-contact-first` | +1/-142 | 10 files changed, 354 insertions(+), 205 deletions(-) | 2026-07-20 | NO | STALE | fix(valuation): require contact before estimate and tighten price band; paths: apps/crm/src(7), apps/crm/tests(2), data(1) |
| `feat/valuation-widget-e2e-gdpr` | +2/-131 | 7 files changed, 256 insertions(+), 25 deletions(-) | 2026-07-22 | NO | STALE | fix(test): resolve strict mode on demo sandbox badge locator; paths: apps/crm/tests(2), .github/workflows(1), apps/crm/package.json(1), apps/crm/playwright.config.ts(1) |
| `feat/valuation-widget-wave0` | +3/-147 | 11 files changed, 742 insertions(+) | 2026-07-20 | NO | STALE | feat(valuation): add aa-reality-kosice tenant for Moln?r pilot; paths: apps/crm/src(7), apps/crm/.env.local.example(1), apps/crm/tests(1), docs/briefs(1) |
| `feat/valuation-widget-wave1` | +1/-141 | 16 files changed, 1167 insertions(+), 309 deletions(-) | 2026-07-20 | NO | STALE | feat(valuation): add Wave 1 estimate flow, lead triage, and public widget; paths: apps/crm/src(13), apps/crm/tests(2), data(1) |
| `feat/vertical-pack-banner-factory` | +1/-344 | 3 files changed, 96 insertions(+) | 2026-06-19 | NO | STALE | feat(crm): Banner Factory capability on real Realvia fixture (Brief 15 K3b); paths: apps/crm/src(3) |
| `feat/vertical-pack-presentation-builder` | +1/-344 | 3 files changed, 98 insertions(+) | 2026-06-19 | NO | STALE | feat(crm): Presentation Builder capability on real Realvia fixture (Brief 15 K3c); paths: apps/crm/src(3) |
| `feat/w2-credit-spend-wiring` | +2/-68 | 4 files changed, 191 insertions(+), 12 deletions(-) | 2026-08-03 | NO | STALE | fix(brain): regenerate registry index for Memory Engine CI; paths: apps/crm/src(3), brain/registry(1) |
| `feature/color-update` | +1/-655 | 2 files changed, 32 insertions(+), 17 deletions(-) | 2026-05-19 | NO | STALE | feat: Revolis.AI v2 color system — purple/violet design tokens; paths: apps/crm/src(2) |
| `feature/purple-layout` | +5/-653 | 8 files changed, 219 insertions(+), 97 deletions(-) | 2026-05-20 | NO | STALE | feat: apply Slate Horizon design tokens; paths: apps/crm/src(6), apps/crm/public(1), apps/crm/tailwind.config.js(1) |
| `feature/slate-billing-core-page` | +11/-653 | 28 files changed, 1123 insertions(+), 791 deletions(-) | 2026-05-20 | NO | STALE | feat: align billing core with Slate Horizon; paths: apps/crm/src(26), apps/crm/public(1), apps/crm/tailwind.config.js(1) |
| `feature/slate-contacts-list` | +10/-653 | 25 files changed, 1123 insertions(+), 620 deletions(-) | 2026-05-20 | NO | STALE | feat: align contacts list with Slate Horizon; paths: apps/crm/src(23), apps/crm/public(1), apps/crm/tailwind.config.js(1) |
| `feature/slate-dashboard-l99` | +7/-653 | 12 files changed, 625 insertions(+), 249 deletions(-) | 2026-05-20 | NO | STALE | feat: align dashboard with Slate Horizon; paths: apps/crm/src(10), apps/crm/public(1), apps/crm/tailwind.config.js(1) |
| `feature/slate-leads-list` | +8/-653 | 19 files changed, 761 insertions(+), 403 deletions(-) | 2026-05-20 | NO | STALE | feat: align leads list with Slate Horizon; paths: apps/crm/src(17), apps/crm/public(1), apps/crm/tailwind.config.js(1) |
| `feature/slate-pipeline-list` | +9/-653 | 23 files changed, 872 insertions(+), 601 deletions(-) | 2026-05-20 | NO | STALE | feat: align pipeline list with Slate Horizon; paths: apps/crm/src(21), apps/crm/public(1), apps/crm/tailwind.config.js(1) |
| `feature/slate-playbook-list` | +12/-653 | 28 files changed, 1123 insertions(+), 791 deletions(-) | 2026-05-20 | NO | STALE | Merge pull request #24 from onlinovosk-bit/feature/slate-billing-core-page; paths: apps/crm/src(26), apps/crm/public(1), apps/crm/tailwind.config.js(1) |
| `feature/slate-settings-core` | +10/-653 | 26 files changed, 960 insertions(+), 694 deletions(-) | 2026-05-20 | NO | STALE | feat: align settings core with Slate Horizon; paths: apps/crm/src(24), apps/crm/public(1), apps/crm/tailwind.config.js(1) |
| `feature/slate-tasks-list` | +14/-653 | 71 files changed, 5874 insertions(+), 854 deletions(-) | 2026-05-20 | NO | STALE | Merge pull request #29 from onlinovosk-bit/fix/smolko-workdesk-shell; paths: .claude(37), apps/crm/src(29), .gitignore(1), CLAUDE.md(1) |
| `feature/slate-team-core` | +11/-653 | 39 files changed, 1204 insertions(+), 901 deletions(-) | 2026-05-20 | NO | STALE | feat: align team core with Slate Horizon; paths: apps/crm/src(37), apps/crm/public(1), apps/crm/tailwind.config.js(1) |
| `feature/slate-workdesk-shell` | +6/-653 | 10 files changed, 465 insertions(+), 177 deletions(-) | 2026-05-20 | NO | STALE | feat: add Slate Workdesk shell foundation; paths: apps/crm/src(8), apps/crm/public(1), apps/crm/tailwind.config.js(1) |
| `feature/space-ui-dashboard` | +3/-1023 | 202 files changed, 11440 insertions(+), 623 deletions(-) | 2026-04-14 | NO | STALE | chore: add all pending source files, scripts, docs, and assets for CI build; paths: apps/crm/src(54), apps/crm/docs(16), apps/crm/scripts(5), apps/crm/public(2) |
| `feature/tailwind-colors` | +1/-654 | 1 file changed, 20 insertions(+), 2 deletions(-) | 2026-05-19 | NO | STALE | feat: add purple/brand color tokens to Tailwind config; paths: apps/crm/tailwind.config.js(1) |
| `fix/brain-audit-hardening-v1` | +9/-123 | 10 files changed, 335 insertions(+), 123 deletions(-) | 2026-07-23 | NO | STALE | chore(brain): refresh indexes after rebase onto main (#318); paths: brain/src(5), .github/workflows(1), brain/decisions(1), brain/registry(1) |
| `fix/bri-dashboard-hardening` | +1/-446 | 6 files changed, 67 insertions(+), 21 deletions(-) | 2026-06-09 | NO | STALE | fix(cron): BRI + dashboard hardening — timeout, NULL safety, idempotency note; paths: apps/crm/src(6) |
| `fix/ci-baseline-migrations` | +7/-428 | 8 files changed, 338 insertions(+), 12 deletions(-) | 2026-06-10 | NO | STALE | fix(ci): disable storage.vector in config.toml for supabase start; paths: apps/crm/supabase(8) |
| `fix/ci-ephemeral-supabase-allowlist` | +1/-432 | 3 files changed, 90 insertions(+), 7 deletions(-) | 2026-06-10 | NO | STALE | ci: ephemeral local Supabase + allowlist guard for test/build; paths: apps/crm/supabase(2), .github/workflows(1) |
| `fix/contacts-leads-zero` | +2/-586 | 15 files changed, 499 insertions(+), 75 deletions(-) | 2026-05-27 | NO | STALE | fix(crm): contacts/leads browser-first + CI program modules; paths: apps/crm/src(13), apps/crm/docs(2) |
| `fix/contacts-leads-zero-hotfix` | +1/-582 | 8 files changed, 597 insertions(+), 88 deletions(-) | 2026-05-27 | NO | STALE | docs(crm): add competitive analysis and orchestrator task board; paths: apps/crm/src(4), apps/crm/docs(3), apps/crm/public(1) |
| `fix/decision-flags-test-optin` | +1/-416 | 1 file changed, 23 insertions(+), 4 deletions(-) | 2026-06-11 | NO | STALE | fix(test): align decision-flags verification with opt-in semantics; paths: apps/crm/tests(1) |
| `fix/decision-ops-vercel-defaults` | +7/-586 | 9 files changed, 216 insertions(+), 9 deletions(-) | 2026-05-27 | NO | STALE | fix(crm): decision ops UX hint and production smoke doc; paths: apps/crm/src(6), apps/crm/.env.example(1), apps/crm/docs(1), apps/crm/vercel.json(1) |
| `fix/demo-agency-id-constant` | +2/-187 | 2 files changed, 41 insertions(+), 2 deletions(-) | 2026-07-09 | NO | STALE | docs(audit): add D5 acquisition domain findings for 2026-07-09; paths: apps/crm/src(1), docs/audit(1) |
| `fix/demo-v3-live` | +2/-415 | 6 files changed, 521 insertions(+), 945 deletions(-) | 2026-06-11 | NO | STALE | chore(marketing): remove revolis-demo-v3 orphan; DoD MERGED != LIVE; paths: apps/marketing/public(2), .cursor/rules(1), apps/crm/docs(1), apps/marketing/docs(1) |
| `fix/docs-n8n-healthz-endpoint` | +2/-125 | 1 file changed, 1 insertion(+), 1 deletion(-) | 2026-07-23 | NO | STALE | merge(main): resolve README conflict after n8n workflow exports (#316); paths: docs/briefs(1) |
| `fix/heartbeat-realvia-received-at` | +1/-188 | 2 files changed, 10 insertions(+), 1 deletion(-) | 2026-07-09 | NO | STALE | fix(heartbeat): use received_at for realvia_webhook_logs last-seen; paths: apps/crm/src(1), apps/crm/tests(1) |
| `fix/hydration-login` | +2/-473 | 4 files changed, 31 insertions(+), 18 deletions(-) | 2026-06-08 | NO | STALE | fix(ux): use ServiceWorkerRegistration in layout body (CI lint); paths: apps/crm/src(4) |
| `fix/inbound-public-proxy-bypass` | +1/-220 | 1 file changed, 1 insertion(+) | 2026-06-29 | NO | STALE | fix(crm): allow public /api/leads/inbound through proxy; paths: apps/crm/src(1) |
| `fix/landing-slate-horizon` | +1/-626 | 5 files changed, 372 insertions(+), 320 deletions(-) | 2026-05-22 | NO | STALE | fix(ui): migrate /landing hero shell to Slate Horizon light; paths: apps/crm/src(5) |
| `fix/lead-score-honesty` | +1/-456 | 5 files changed, 229 insertions(+), 13 deletions(-) | 2026-06-08 | NO | STALE | fix(leads): honest score display — hide default 22, show — for unscored leads; paths: apps/crm/src(5) |
| `fix/listing-gen-stream-harden` | +2/-64 | 6 files changed, 363 insertions(+), 3 deletions(-) | 2026-08-03 | #360 | STALE | fix(crm): harden listing-content stream route; paths: apps/crm/src(5), apps/crm/supabase(1) |
| `fix/marketing-ga4-config-id` | +1/-182 | 1 file changed, 1 insertion(+), 1 deletion(-) | 2026-07-10 | NO | STALE | fix(marketing): align gtag config with production GA4 property; paths: apps/marketing/app(1) |
| `fix/marketing-ga4-loader-id` | +1/-185 | 1 file changed, 1 insertion(+), 1 deletion(-) | 2026-07-10 | NO | STALE | fix(marketing): point gtag loader to production GA4 property; paths: apps/marketing/app(1) |
| `fix/morning-brief-llm-path` | +1/-420 | 8 files changed, 297 insertions(+), 36 deletions(-) | 2026-06-11 | NO | STALE | fix(crm): morning brief LLM path instrumentation and cron admin client; paths: apps/crm/src(6), apps/crm/supabase(1), apps/crm/tests(1) |
| `fix/onboarding-automat-auth` | +1/-456 | 4 files changed, 298 insertions(+), 192 deletions(-) | 2026-06-08 | NO | STALE | fix(onboarding): resolve 401 — proxy bypass + client fetch + empty state; paths: apps/crm/src(4) |
| `fix/onboarding-client-tables-rls-b1` | +1/-216 | 3 files changed, 55 insertions(+), 45 deletions(-) | 2026-07-01 | NO | STALE | fix(db): B1 RLS for onboarding client tables + remove orphan route; paths: apps/crm/src(1), apps/crm/supabase(1), apps/crm/tests(1) |
| `fix/overnight-feature-health` | +5/-447 | 7 files changed, 71 insertions(+), 27 deletions(-) | 2026-06-09 | NO | STALE | Merge branch 'main' into fix/overnight-feature-health; paths: apps/crm/src(6), apps/crm/docs(1) |
| `fix/p0-workdesk-profile-select-hardening` | +1/-501 | 2 files changed, 17 insertions(+), 11 deletions(-) | 2026-06-04 | NO | STALE | fix(crm): harden Workdesk profile select and sidebar role label; paths: apps/crm/src(2) |
| `fix/password-reset-auth-confirm` | +3/-148 | 12 files changed, 459 insertions(+), 49 deletions(-) | 2026-07-18 | NO | STALE | docs(decisions): record password recovery incident; paths: apps/crm/src(7), apps/crm/tests(1), docs/briefs(1), docs/runbooks(1) |
| `fix/password-reset-code-callback` | +1/-146 | 6 files changed, 32 insertions(+), 8 deletions(-) | 2026-07-20 | #304 | STALE | fix(auth): password reset ?code= via /auth/callback; paths: apps/crm/src(5), apps/crm/tests(1) |
| `fix/prod-deploy-schema-drift-20260713` | +3/-164 | 8 files changed, 447 insertions(+), 31 deletions(-) | 2026-07-13 | NO | STALE | fix: prod verify uses real lead_id and one-line auto_response SQL; paths: apps/crm/scripts(4), apps/crm/src(2), apps/crm/supabase(1), apps/crm/tests(1) |
| `fix/properties-inventory-dashboard-sync` | +9/-587 | 53 files changed, 2879 insertions(+), 737 deletions(-) | 2026-05-26 | NO | STALE | fix(crm): recover invalid Supabase refresh token and free manifest; paths: apps/crm/src(47), apps/crm/docs(6) |
| `fix/realvia-api-response-contract` | +1/-605 | 7 files changed, 279 insertions(+), 1 deletion(-) | 2026-05-22 | NO | STALE | test(realvia): add contract tests and production smoke script; paths: apps/crm/src(5), apps/crm/package.json(1), apps/crm/scripts(1) |
| `fix/realvia-import-auth` | +11/-657 | 8 files changed, 446 insertions(+), 3 deletions(-) | 2026-05-19 | NO | STALE | fix: ignore TS build errors (webpack stricter than Turbopack on main); paths: apps/crm/src(5), apps/crm/next.config.js(1), apps/crm/package.json(1), apps/crm/vercel.json(1) |
| `fix/realvia-webhook-pipeline` | +2/-656 | 10 files changed, 1668 insertions(+) | 2026-05-19 | NO | STALE | feat: Realvia DB migrations (webhook infrastructure, agency credentials, schema health); paths: apps/crm/src(7), apps/crm/supabase(3) |
| `fix/resolveTenantSupabase-matching-funnel` | +2/-218 | 6 files changed, 119 insertions(+), 50 deletions(-) | 2026-06-30 | NO | STALE | Merge branch 'main' into fix/resolveTenantSupabase-matching-funnel; paths: apps/crm/src(5), apps/crm/tests(1) |
| `fix/revolis-ai-light-migration` | +3/-629 | 22 files changed, 1311 insertions(+), 298 deletions(-) | 2026-05-21 | NO | STALE | fix(ui): migrate /revolis-ai to Slate Horizon light workdesk; paths: apps/crm/src(18), apps/crm/docs(2), apps/crm/package.json(1), package-lock.json(1) |
| `fix/segmentation-410-middleware-bypass` | +2/-481 | 2 files changed, 251 insertions(+) | 2026-06-07 | NO | STALE | docs: market_vision capability registry + PROD-FLAGS-CHECKLIST; paths: apps/crm/docs(2) |
| `fix/settings-auth-email-tests` | +2/-190 | 3 files changed, 301 insertions(+) | 2026-07-08 | NO | STALE | Merge branch 'main' into fix/settings-auth-email-tests; paths: apps/crm/src(3) |
| `fix/smolko-contacts-root-cause` | +2/-578 | 11 files changed, 319 insertions(+), 22 deletions(-) | 2026-05-28 | NO | STALE | docs(crm): orchestrator 240min plan 2026-05-27; paths: apps/crm/src(9), apps/crm/docs(2) |
| `fix/smolko-contacts-zero` | +1/-579 | 8 files changed, 104 insertions(+), 74 deletions(-) | 2026-05-27 | NO | STALE | fix(crm): Smolko contacts - filters, hot strip, profile initials; paths: apps/crm/src(7), apps/crm/docs(1) |
| `fix/smolko-dashboard-slate` | +14/-653 | 75 files changed, 6009 insertions(+), 956 deletions(-) | 2026-05-20 | NO | STALE | fix(sidebar): anchor secondary nav at 76px and gate demo toast for Smolko; paths: .claude(37), apps/crm/src(33), .gitignore(1), CLAUDE.md(1) |
| `fix/smolko-plan-display` | +15/-653 | 93 files changed, 6936 insertions(+), 1040 deletions(-) | 2026-05-20 | NO | STALE | test(ai): add comprehensive PII masking vault tests; paths: apps/crm/src(38), .claude(37), .gitignore(1), CLAUDE.md(1) |
| `fix/smolko-pulse-gating` | +15/-653 | 79 files changed, 6067 insertions(+), 931 deletions(-) | 2026-05-20 | NO | STALE | fix(cron): schedule Realvia queue processor for Smolko property sync; paths: .claude(37), apps/crm/src(36), .gitignore(1), CLAUDE.md(1) |
| `fix/smolko-realvia-cron` | +13/-653 | 73 files changed, 5913 insertions(+), 851 deletions(-) | 2026-05-20 | NO | STALE | fix(cron): schedule Realvia queue processor for Smolko property sync; paths: .claude(37), apps/crm/src(30), .gitignore(1), CLAUDE.md(1) |
| `fix/smolko-sidebar-toast` | +14/-653 | 71 files changed, 5926 insertions(+), 884 deletions(-) | 2026-05-20 | NO | STALE | fix(sidebar): anchor secondary nav at 76px and gate demo toast for Smolko; paths: .claude(37), apps/crm/src(29), .gitignore(1), CLAUDE.md(1) |
| `fix/smolko-ultrathink-recovery` | +1/-574 | 9 files changed, 475 insertions(+), 82 deletions(-) | 2026-05-28 | NO | STALE | fix(crm): Smolko contacts fallback + profile link + inventory fallback; paths: apps/crm/src(9) |
| `fix/smolko-workdesk-shell` | +13/-653 | 71 files changed, 5874 insertions(+), 854 deletions(-) | 2026-05-20 | NO | STALE | fix(crm): restore workdesk shell content offset for Smolko onboarding; paths: .claude(37), apps/crm/src(29), .gitignore(1), CLAUDE.md(1) |
| `fix/team-gating-manual-plan` | +1/-435 | 4 files changed, 37 insertions(+), 4 deletions(-) | 2026-06-09 | NO | STALE | fix(team): resolve manual_plan from agencies for team gating — Smolko fix; paths: apps/crm/src(4) |
| `fix/valuation-widget-e2e-nightly` | +1/-120 | 3 files changed, 17 insertions(+), 5 deletions(-) | 2026-07-24 | #326 | STALE | docs: VEOS voice standards, premortem registry, cursor rules; paths: apps/crm/package.json(1), apps/crm/tests(1), docs/briefs(1) |
| `fix/w1-credits-cron-merge` | +4/-66 | 6 files changed, 157 insertions(+), 19 deletions(-) | 2026-08-03 | NO | STALE | chore(brain): refresh registry index after main merge; paths: apps/crm/src(4), apps/crm/vercel.json(1), brain/registry(1) |
| `fix/w1-quick-wins-bundle` | +1/-424 | 10 files changed, 143 insertions(+), 106 deletions(-) | 2026-06-11 | NO | STALE | fix(crm): W1 quick wins — forecast tier, decision opt-in, nav, capabilities; paths: apps/crm/src(8), apps/crm/docs(2) |
| `fix/w1-stealth-recruiter-410` | +4/-65 | 8 files changed, 94 insertions(+), 363 deletions(-) | 2026-08-03 | NO | STALE | Merge origin/main into fix/w1-stealth-recruiter-410; paths: apps/crm/src(6), apps/crm/tests(1), brain/registry(1) |
| `fix/w1b-listing-gen-sandbox-findings` | +1/-64 | 1 file changed, 98 insertions(+) | 2026-08-03 | #366 | STALE | docs(overnight): Wave 1B listing-gen sandbox findings (read-only); paths: docs/briefs(1) |
| `fix/w2-system-usage-agency-guard` | +2/-68 | 3 files changed, 60 insertions(+) | 2026-08-03 | NO | STALE | docs(overnight): link profit-leak patch PR numbers; paths: apps/crm/src(2), docs/briefs(1) |
| `swarm/w5b-demo-checklist` | +2/-70 | 5 files changed, 328 insertions(+), 56 deletions(-) | 2026-08-03 | NO | STALE | fix(ci): refresh brain indexes for overnight docs; paths: docs/briefs(3), brain/decisions(1), brain/registry(1) |
| `swarm/w6a-credit-rates-align` | +2/-70 | 4 files changed, 73 insertions(+), 66 deletions(-) | 2026-08-03 | NO | STALE | fix(ci): refresh brain indexes after credit-rates align; paths: apps/crm/src(2), brain/decisions(1), brain/registry(1) |
| `swarm/w6b-progress-ico` | +1/-70 | 1 file changed, 2 insertions(+) | 2026-08-03 | #351 | STALE | docs(progress): clarify ONLINOVO vs Smolko ICO (Wave 6B); paths: docs/progress.md(1) |
| `test/capabilities-coverage` | +4/-307 | 16 files changed, 842 insertions(+), 1 deletion(-) | 2026-06-22 | NO | STALE | Merge pull request #233 from onlinovosk-bit/docs/capabilities; paths: docs/capabilities(9), apps/crm/src(6), docs/audit(1) |
| `test/listing-gen-tests-docs` | +4/-64 | 17 files changed, 1954 insertions(+), 5 deletions(-) | 2026-08-03 | #362 | STALE | test(crm): listing gen unit tests + docs; paths: apps/crm/src(9), apps/crm/scripts(4), .github/workflows(1), apps/crm/supabase(1) |
| `test/listing-golden-regres` | +1/-48 | 2 files changed, 516 insertions(+) | 2026-08-12 | NO | STALE | test(crm): add A3 listing golden regression fixtures (L12); paths: apps/crm/src(2) |
| `test/w1a-listing-gen-e2e` | +6/-64 | 23 files changed, 2666 insertions(+), 6 deletions(-) | 2026-08-03 | #365 | STALE | test(crm): listing generator E2E (mocked AI); paths: apps/crm/src(11), apps/crm/scripts(4), apps/crm/tests(3), apps/crm/supabase(2) |
| `test/write-probe` | +1/-355 | 1 file changed, 3 insertions(+) | 2026-06-19 | NO | STALE | chore: write-probe for Brief 15 swarm (AP-009 gate); paths: docs/audit(1) |
| `test/write-probe-night` | +1/-308 | 1 file changed, 3 insertions(+) | 2026-06-21 | NO | STALE | chore(probe): overnight write capability probe 2026-06-21; paths: docs/audit(1) |
| `chore/b1-auth-runbook-onboarding-unblock` | +0/-176 | 0 files changed | 2026-07-11 | NO | MERGED | No commits ahead of main |
| `chore/brain-registry-drift-2026-07-27` | +0/-112 | 0 files changed | 2026-07-26 | NO | MERGED | No commits ahead of main |
| `chore/brief10-wave-c-cleanup` | +0/-252 | 0 files changed | 2026-06-25 | NO | MERGED | No commits ahead of main |
| `chore/governance-northstar-r4` | +0/-275 | 0 files changed | 2026-06-25 | NO | MERGED | No commits ahead of main |
| `chore/preview-playwright-smoke` | +0/-170 | 0 files changed | 2026-07-13 | NO | MERGED | No commits ahead of main |
| `chore/realvia-queue-triage` | +0/-258 | 0 files changed | 2026-06-25 | NO | MERGED | No commits ahead of main |
| `chore/repo-hygiene-docs` | +0/-272 | 0 files changed | 2026-06-25 | NO | MERGED | No commits ahead of main |
| `chore/revenue-telemetry` | +0/-622 | 0 files changed | 2026-05-22 | NO | MERGED | No commits ahead of main |
| `chore/rls-schema-parity-audit` | +0/-239 | 0 files changed | 2026-06-26 | NO | MERGED | No commits ahead of main |
| `cursor/pilot-ferovo-realtime-workspace-crm` | +0/-1000 | 0 files changed | 2026-04-17 | NO | MERGED | No commits ahead of main |
| `docs/bri-diagnostic-report` | +0/-344 | 0 files changed | 2026-06-19 | NO | MERGED | No commits ahead of main |
| `docs/capabilities` | +0/-300 | 0 files changed | 2026-06-22 | NO | MERGED | No commits ahead of main |
| `docs/decision-framework-skills` | +0/-201 | 0 files changed | 2026-07-06 | NO | MERGED | No commits ahead of main |
| `docs/ops-uc-smolko-handoff` | +0/-352 | 0 files changed | 2026-06-19 | NO | MERGED | No commits ahead of main |
| `docs/sales-tracker` | +0/-151 | 0 files changed | 2026-07-16 | NO | MERGED | No commits ahead of main |
| `docs/stage0-pass-addendum` | +0/-22 | 0 files changed | 2026-08-15 | NO | MERGED | No commits ahead of main |
| `feat/agency-billing-credits-migration` | +0/-536 | 0 files changed | 2026-06-03 | NO | MERGED | No commits ahead of main |
| `feat/brief8-cadastre-wms-display` | +0/-390 | 0 files changed | 2026-06-15 | NO | MERGED | No commits ahead of main |
| `feat/crm-architect-leads-migration` | +0/-662 | 0 files changed | 2026-05-14 | NO | MERGED | No commits ahead of main |
| `feat/crm-architect-workflows-w1-w4` | +0/-659 | 0 files changed | 2026-05-14 | NO | MERGED | No commits ahead of main |
| `feat/demo-funnel-preview` | +0/-609 | 0 files changed | 2026-05-22 | NO | MERGED | No commits ahead of main |
| `feat/followup-agent-loop1` | +0/-269 | 0 files changed | 2026-06-25 | NO | MERGED | No commits ahead of main |
| `feat/followup-drafts-ui` | +0/-255 | 0 files changed | 2026-06-25 | NO | MERGED | No commits ahead of main |
| `feat/followup-guardian-gate` | +0/-250 | 0 files changed | 2026-06-25 | NO | MERGED | No commits ahead of main |
| `feat/forecast-risk-nba` | +0/-634 | 0 files changed | 2026-05-21 | NO | MERGED | No commits ahead of main |
| `feat/guardian-v1-blok-c` | +0/-106 | 0 files changed | 2026-07-27 | NO | MERGED | No commits ahead of main |
| `feat/inbound-auto-response-variant-a` | +0/-154 | 0 files changed | 2026-07-16 | NO | MERGED | No commits ahead of main |
| `feat/l99-strategy-rollout` | +0/-546 | 0 files changed | 2026-06-02 | NO | MERGED | No commits ahead of main |
| `feat/lead-form-public` | +0/-225 | 0 files changed | 2026-06-28 | NO | MERGED | No commits ahead of main |
| `feat/loop2-outcome-writer` | +0/-248 | 0 files changed | 2026-06-25 | NO | MERGED | No commits ahead of main |
| `feat/marketing-zakulisie-token` | +0/-538 | 0 files changed | 2026-06-03 | NO | MERGED | No commits ahead of main |
| `feat/pipeline-action-nba` | +0/-632 | 0 files changed | 2026-05-21 | NO | MERGED | No commits ahead of main |
| `feat/realsoft-import-adapter` | +0/-380 | 0 files changed | 2026-06-16 | NO | MERGED | No commits ahead of main |
| `feat/revenue-intelligence-wire-not-delete` | +0/-385 | 0 files changed | 2026-06-15 | NO | MERGED | No commits ahead of main |
| `feat/sk-ui-vertical-pack-sidebar` | +0/-265 | 0 files changed | 2026-06-25 | NO | MERGED | No commits ahead of main |
| `feat/starter-pack-47` | +0/-391 | 0 files changed | 2026-06-15 | NO | MERGED | No commits ahead of main |
| `feat/stealth-recruiter-ingest-presov` | +0/-560 | 0 files changed | 2026-05-31 | NO | MERGED | No commits ahead of main |
| `feat/team-action-nba` | +0/-630 | 0 files changed | 2026-05-21 | NO | MERGED | No commits ahead of main |
| `feat/vertical-pack-listing-generator` | +0/-348 | 0 files changed | 2026-06-19 | NO | MERGED | No commits ahead of main |
| `feat/vertical-pack-quality-guardian` | +0/-350 | 0 files changed | 2026-06-19 | NO | MERGED | No commits ahead of main |
| `feat/vlna1-pr1-dashboard-insights` | +0/-532 | 0 files changed | 2026-06-03 | NO | MERGED | No commits ahead of main |
| `feat/vlna1-pr1-insights-cron-cache` | +0/-523 | 0 files changed | 2026-06-03 | NO | MERGED | No commits ahead of main |
| `feat/vlna1-pr2-vercel-crons` | +0/-525 | 0 files changed | 2026-06-03 | NO | MERGED | No commits ahead of main |
| `feat/vlna1-pr3-arbitrage-live` | +0/-512 | 0 files changed | 2026-06-03 | NO | MERGED | No commits ahead of main |
| `feat/w-leads-capture` | +0/-244 | 0 files changed | 2026-06-26 | NO | MERGED | No commits ahead of main |
| `feat/wave0-truthful-pricing-marketing` | +0/-530 | 0 files changed | 2026-06-03 | NO | MERGED | No commits ahead of main |
| `feat/wave1-export-diagnostics` | +0/-322 | 0 files changed | 2026-06-19 | NO | MERGED | No commits ahead of main |
| `feat/wave1-listing-score` | +0/-322 | 0 files changed | 2026-06-19 | NO | MERGED | No commits ahead of main |
| `feat/wave2-k4-playbook-cleanup` | +0/-318 | 0 files changed | 2026-06-20 | NO | MERGED | No commits ahead of main |
| `feat/workdesk-enterprise-blue-pr2bc` | +0/-646 | 0 files changed | 2026-05-21 | NO | MERGED | No commits ahead of main |
| `feat/workdesk-full-light-migration` | +0/-645 | 0 files changed | 2026-05-21 | NO | MERGED | No commits ahead of main |
| `feat/workdesk-intelligence-phase3` | +0/-636 | 0 files changed | 2026-05-21 | NO | MERGED | No commits ahead of main |
| `feat/workdesk-page-shells-pr35` | +0/-644 | 0 files changed | 2026-05-21 | NO | MERGED | No commits ahead of main |
| `fix/billing-light-cleanup` | +0/-638 | 0 files changed | 2026-05-21 | NO | MERGED | No commits ahead of main |
| `fix/ci-stealth-pattern-guard-ap011` | +0/-354 | 0 files changed | 2026-06-18 | NO | MERGED | No commits ahead of main |
| `fix/crm-smolko-dotenv-init` | +0/-542 | 0 files changed | 2026-06-02 | NO | MERGED | No commits ahead of main |
| `fix/dashboard-dark-leak` | +0/-622 | 0 files changed | 2026-05-22 | NO | MERGED | No commits ahead of main |
| `fix/dashboard-insights-vercel-analytics` | +0/-518 | 0 files changed | 2026-06-03 | NO | MERGED | No commits ahead of main |
| `fix/demo-slate-horizon` | +0/-621 | 0 files changed | 2026-05-22 | NO | MERGED | No commits ahead of main |
| `fix/executive-ux-panels` | +0/-622 | 0 files changed | 2026-05-22 | NO | MERGED | No commits ahead of main |
| `fix/followup-decisions-agent-column` | +0/-260 | 0 files changed | 2026-06-25 | NO | MERGED | No commits ahead of main |
| `fix/followup-proxy-cron-bypass` | +0/-262 | 0 files changed | 2026-06-25 | NO | MERGED | No commits ahead of main |
| `fix/forecasting-remove-demo-risk-strip` | +0/-485 | 0 files changed | 2026-06-05 | NO | MERGED | No commits ahead of main |
| `fix/guardian-cta-deep-link-240` | +0/-288 | 0 files changed | 2026-06-23 | NO | MERGED | No commits ahead of main |
| `fix/landing-phase3-preview-html` | +0/-609 | 0 files changed | 2026-05-22 | NO | MERGED | No commits ahead of main |
| `fix/landing-slate-horizon-phase2` | +0/-613 | 0 files changed | 2026-05-22 | NO | MERGED | No commits ahead of main |
| `fix/lead-ai-triage-imported-backfill` | +0/-488 | 0 files changed | 2026-06-04 | NO | MERGED | No commits ahead of main |
| `fix/lead-form-public-prod` | +0/-223 | 0 files changed | 2026-06-28 | NO | MERGED | No commits ahead of main |
| `fix/marketing-activate-modal-l99-pricing` | +0/-544 | 0 files changed | 2026-06-02 | NO | MERGED | No commits ahead of main |
| `fix/marketing-hero-neviete-sk` | +0/-551 | 0 files changed | 2026-06-01 | NO | MERGED | No commits ahead of main |
| `fix/onboard-agency-prod-schema` | +0/-174 | 0 files changed | 2026-07-11 | NO | MERGED | No commits ahead of main |
| `fix/p0-sidebar-profile-select` | +0/-502 | 0 files changed | 2026-06-04 | NO | MERGED | No commits ahead of main |
| `fix/playbook-last-contact-column` | +0/-341 | 0 files changed | 2026-06-19 | NO | MERGED | No commits ahead of main |
| `fix/pr4-scrape-404-proxy-bypass` | +0/-497 | 0 files changed | 2026-06-04 | NO | MERGED | No commits ahead of main |
| `fix/premium-overlay-a11y` | +0/-613 | 0 files changed | 2026-05-22 | NO | MERGED | No commits ahead of main |
| `fix/prod-smolko-tenant-hotfix` | +0/-571 | 0 files changed | 2026-05-29 | NO | MERGED | No commits ahead of main |
| `fix/proxy-cron-bypass` | +0/-650 | 0 files changed | 2026-05-20 | NO | MERGED | No commits ahead of main |
| `fix/reality-monopol-test-detector-feature` | +0/-533 | 0 files changed | 2026-06-03 | NO | MERGED | No commits ahead of main |
| `fix/resolveTenantSupabase-tasks-team` | +0/-234 | 0 files changed | 2026-06-27 | NO | MERGED | No commits ahead of main |
| `fix/schema-guard-allowlist-prod-sync` | +0/-278 | 0 files changed | 2026-06-24 | NO | MERGED | No commits ahead of main |
| `fix/segmentation-410-shim` | +0/-483 | 0 files changed | 2026-06-05 | NO | MERGED | No commits ahead of main |
| `fix/settings-push-notifications-light` | +0/-640 | 0 files changed | 2026-05-21 | NO | MERGED | No commits ahead of main |
| `fix/stealth-recruiter-migration-index` | +0/-210 | 0 files changed | 2026-07-03 | NO | MERGED | No commits ahead of main |
| `fix/stealth-recruiter-production-presov` | +0/-563 | 0 files changed | 2026-05-29 | NO | MERGED | No commits ahead of main |
| `fix/stealth-scan-commentitem-preflight` | +0/-208 | 0 files changed | 2026-07-03 | NO | MERGED | No commits ahead of main |
| `fix/tenant-isolation-leads-defense` | +0/-354 | 0 files changed | 2026-06-18 | NO | MERGED | No commits ahead of main |
| `fix/triage-availability-prompt-tuning` | +0/-159 | 0 files changed | 2026-07-14 | NO | MERGED | No commits ahead of main |
| `fix/valuation-widget-property-first-flow` | +0/-136 | 0 files changed | 2026-07-21 | NO | MERGED | No commits ahead of main |
| `fix/w-leads-create-rls` | +0/-242 | 0 files changed | 2026-06-26 | NO | MERGED | No commits ahead of main |
| `fix/workdesk-program-comparison-light` | +0/-642 | 0 files changed | 2026-05-21 | NO | MERGED | No commits ahead of main |
| `pr/vlna-0.1-cleanup-ui` | +0/-495 | 0 files changed | 2026-06-04 | NO | MERGED | No commits ahead of main |

## Classification notes

- `MERGED`: branch tip is ancestor of `origin/main` or has zero commits ahead.
- `READY`: non-draft open PR that is not very stale, or recent no-PR branch with tests/docs/runbook markers, plus explicitly known complete bus/DMARC branches.
- `STALE`: meaningful unmerged work older than 7 days without PR, or open PR branch very stale / far behind main.
- `EXPERIMENT`: recent unmerged branch without enough evidence of completion, or draft PR not yet stale.
- `UNKNOWN`: branch or PR access missing; none besides explicitly missing known branches in this run.

## Next action

STOP. Founder triages; no PRs are closed, no branches are deleted, no merges are performed from this discovery.
