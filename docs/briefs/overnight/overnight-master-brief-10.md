# OVERNIGHT MASTER BRIEF 10 — RealSoft Import Adapter
**Dátum:** 2026-06-16 · **Branch:** `feat/realsoft-import-adapter` · **Status:** in-progress (receiver/logging delivered)

## Scope delivered
- Added `POST /api/realsoft/import` receiver with RealSoft-compatible JSON ack contract (`code/message`).
- Added agency-scoped auth mapping via `agencies.realsoft_export_user` + `agencies.realsoft_export_pass`.
- Added raw audit table `realsoft_import_logs` with agency RLS and idempotency index by `(agency_id, action, external_id)`.
- Wired receiver into Universal Import infrastructure (`import_jobs`, `import_rows`, `migration_cases`).
- Added denylist rules for `realsoft` ingestion paths in auto-merge policy.

## Guardrails
- RealSoft mapper is intentionally blocked behind `REALSOFT_SAMPLE_READY` until a real payload sample is provided.
- No guessed field schema is used for mapping.
- External ID extraction is opt-in via env (`REALSOFT_EXTERNAL_ID_PATH_ACTION_1`, `REALSOFT_EXTERNAL_ID_PATH_ACTION_2`).

## Pending for production enablement
- Provide real payload fixtures (action 1 + action 2) and complete canonical field mapping to leads/properties.
- Final legal gate: DPA confirmation before production rollout.

