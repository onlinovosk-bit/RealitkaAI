# Decision Memory projection

**Source of truth:** [`memory/decisions.md`](../../memory/decisions.md)

This directory holds machine projections and first-class ADRs. It is **not** a second decisions log.

| Path | Role |
|---|---|
| `index.json` | Generated view (`npm run brain:ingest`). Do not hand-edit. |
| `adr-*.md` | Hand-authored ADRs (catalog assets). |
| `decisions.md` | **Removed** (D-2026-08-17-01 Variant A). Do not recreate. |

`brain:ingest` reads `memory/decisions.md` only. T10: do not regenerate `index.json` when source files are unchanged.
