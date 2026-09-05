# W0 inventúra — 2026-09-05T2308-CEST-research

## Authorization
- Founder GO: „GO Ruflo Swarm Now!“
- Launch record: docs/overnight/2026-09-05-ruflo-swarm/launch-record.md (STARTED)
- Scope: research_and_specs ONLY (ASSUMED)
- Spend: subscription_only (ASSUMED) — no unknown paid API required for this runner

## Git
- Worktree: C:\RealitkaAI-l99-w2\.worktrees\docs-ruflo-overnight-prepared (docs/ruflo-overnight-prepared)
- BASE_SHA (origin/main fetched): cf3604613cdbb6a7a279e175f2c792fb25591461
- Bridge-harness at C:/RealitkaAI: NOT touched (no stash/reset/clean)
- Dirty product branches elsewhere: ignored for BASE

## Runner capability
- Cursor agent with repo read, WebSearch, shell, docs write
- NOT using scripts/ruflo-model-bridge V0
- Concurrency: 1 orch + ≤3 workers
- Live paid preflight model call: NOT performed

## Isolation
- Output root: output/overnight/2026-09-05T2308-CEST-research/ (exclusive)
- Lane write-sets pairwise disjoint for workers (lanes/A..K, amendments/)
- Orchestrator only: w0/, control/, final/
- Input snapshot: w0/input/ (package + pricing + AGENTS + migration inventory; no .env/PII)

## Migrations
- Count at BASE: 102 files under apps/crm/supabase/migrations/
- Latest include: 20260904150000_drop_open_anon_policies.sql, 20260904220000_drop_onboarding_sessions_anon_all.sql, 20260903070000_customer_health_daily.sql

## Drift notes
- .cursor/rules/revolis-builder.mdc: MISSING (AGENTS.md still references it)
- Use l99-engineering-constitution.mdc for Integration Report substitute

## Verdict
**READY** — STARTED authorized.