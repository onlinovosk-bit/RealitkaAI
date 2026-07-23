# Memory Engine V1 implementation report - 2026-07-22

## What changed

- Preserved `brain/ENGINE.md` without modification.
- Stored the three supplied Fable artifacts at their declared repository paths.
- Added a tracked-files-only, idempotent TypeScript ingest.
- Added ten generated registry pointers and twenty-one evidenced decision
  projections while preserving `memory/decisions.md` as canonical.
- Added deterministic audit JSON/Markdown with delta and a manual weekly summary.
- Added fixtures, unit/integration/regression tests, typecheck, runbook, and
  pull-request artifact workflow.
- Added no database, graph store, scheduler, network integration, production
  credential, customer payload, or outbound action.

## Traceability

| V1 requirement | Resolution | Evidence |
|---|---|---|
| Registry schema and validator | EXTEND, generated pointer view; max 10 sources | `brain/src/schema.ts`, `brain/src/loader.ts`, `brain/registry/index.json` |
| Decision Memory, at least 15 real decisions | EXTEND as non-canonical projection; 21 records | `brain/src/catalog.ts`, `brain/decisions/index.json`, `memory/decisions.md` |
| Idempotent repository ingest | NEW, tracked allowlist only | `brain/src/ingest.ts`, `npm run brain:check` |
| Audit with delta | NEW, deterministic checks plus confidence-labelled advisory heuristics | `brain/src/audit-core.ts`, `brain/src/audit.ts`, `brain/audits/` |
| Weekly summary, max 5 recommendations | NEW, manual deterministic generator | `brain/src/weekly.ts`, `brain/learning/` |
| Fixtures, tests, runbook, CI artifact | NEW | `brain/tests/`, runbook, `.github/workflows/memory-engine-report.yml` |
| No DB, graph, scheduler, PII, or invented metrics | REJECT/DEFER as required | source policy, security validator, explicit unavailable fields |

## Verification evidence

- TypeScript: `npm run brain:typecheck` - pass.
- Tests: `npm run brain:test` - 7/7 pass.
- CRM lint: pass.
- CRM production build: pass; only the pre-existing Next.js middleware
  deprecation warning remains.
- Full CRM suite: 175 test files / 782 tests passed; five Supabase integration
  suites require unavailable local `TEST_SUPABASE_*` credentials and could not run.
- Ingest: 10 registry records, 21 decision records, zero validation issues.
- Idempotence: second ingest produced zero changed files.
- Audit: zero schema errors; findings are evidence-linked and confidence-labelled.
- Delta: first run records additions; second identical run records them unchanged.
- Weekly: no more than five recommendations; unavailable business inputs stay
  unavailable.

## Deliberate deviations from the Fable text

1. Commands use npm because this repository is an npm workspace with a lockfile.
2. `brain/decisions` is not a second source of truth; it is a generated projection.
3. Cursor rules remain policy evidence, not invented historical decisions.
4. Semantic duplication and unused behavior are advisory, not automatic verdicts.
5. The supplied source file is labelled as a Fable synthesis, because verbatim
   originals are unavailable.
6. The requested retrospective cost-of-waiting number is `unavailable`; no measured
   time series exists, so a monthly extrapolation would violate AP-001.
7. The wider V1 is implemented as a local candidate behind the merge gate. It does
   not silently rewrite the older unlock conditions in `brain/ENGINE.md`.

## Founder gates

- Decide whether the July 22 brief explicitly unlocks the registry, validator, and
  weekly candidate described as backlog in `brain/ENGINE.md`.
- Review the `.github` workflow change and generated decision evidence.
- Approve or reject the scoped commit and later PR/merge.
- Separately approve any future scheduler, production source, external publication,
  database change, or customer-metric ingestion.

## Cost-of-waiting baseline

`unavailable`. The repository has no measured timestamps for status reconstruction,
Gmail forensics, or tracker synchronization on 2026-07-22. Measurement can begin
with the first founder-reviewed run; no retrospective estimate was invented.
