# 2026-09-29 — Agentic system inventory (Wave 0)

**Branch:** `docs/agentic-system-inventory`  
**Tip inventoried:** `b898322ee`  
**Artifact:** `docs/architecture/agentic-system-inventory.md`

## Verdict

Existing Inter-Agent Bus (`packages/bus-core` + `.ai/bus` + `scripts/bus`), Runner (`consume` + execution-state), and Control Contract (`packages/control-contract`) are real and must be **extended**, not replaced.

## Wave 0

- Inventory complete (Existing / Missing / Duplicates / Risks / Reuse Plan).
- No runtime code changed.
- Wave 1 blocked on Founder GO: extend `bus-core` (A) vs new adapter package (B).

## Not done (preserved)

- Model router, USD cost governor, always-on runner host, CP-P0-1A durability, Cursor protocol automation — deferred per wave plan.