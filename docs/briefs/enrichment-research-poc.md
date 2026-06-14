# Enrichment + Research Agent PoC

## Scope

- `src/lib/enrichment/` waterfall enrichment engine with provider interface and fallback flow.
- `src/lib/research-agent/` dossier builder (schema-validated JSON + OpenAI optional call).
- Supabase migrations for `enrichment_log` and `leads.dossier`.

## Implemented

### Enrichment Engine

- `EnrichmentProvider` contract: `name`, `canHandle(field)`, `fetch(input)`.
- Waterfall behavior: provider 1 -> provider 2 -> ... until non-null value.
- v1 providers:
  - phone normalization (reused from `contacts-import-core.ts`)
  - email validation
  - kataster lookup stub (TODO real API)
  - FinStat/ORSR stub (TODO real API)
- Audit writes to `enrichment_log` (agency-scoped).

### Research Agent

- `buildDossier(propertyOrContactId/input)` flow:
  1. run enrichment tool
  2. run web fetch stub
  3. compose deterministic dossier
  4. optionally refine with OpenAI JSON output
  5. validate with Zod schema
  6. persist to `leads.dossier` for lead records
- Anti-hallucination rule: unknown facts remain `null` + `null_reasons`.

## Tests

- Unit:
  - waterfall fallback to second provider
  - phone normalization (local + international)
  - dossier schema validation (valid/invalid)
- Integration (`TEST_SUPABASE_*`):
  - `enrichment_log` RLS cross-tenant read/write guard
- Smoke:
  - enrich test contact + build dossier
  - verify dossier signals and audit consistency

## TODO (real APIs)

- Replace kataster stub with real property owner/title API adapter.
- Replace FinStat/ORSR stub with production-grade adapters + retry/rate-limit.
- Add source provenance scoring and per-provider health metrics.
- Add partner-safe legal basis log for enrichment runs (GDPR Art. 6(1)(f) balancing note).
