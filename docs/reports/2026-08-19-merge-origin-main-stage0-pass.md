# Merge origin/main into docs/stage0-pass-confirmed

**Date:** 2026-08-19
**Branch:** docs/stage0-pass-confirmed
**Fetch:** origin/main 2331d1296..d8d9a64b1 succeeded. Current branch fetched; tracking in sync before merge.

## Divergence before merge

- Unique to branch: 8f308b75f (Stage 0 PASS confirmed after #416)
- Unique to origin/main: 19 commits (auth ILIKE #427, billing #401, credits #392, and follow-ups)
- Merge-base: d6b9e3518 (#416)

## Conflicts

| File | Class | Resolution |
|---|---|---|
| memory/decisions.md | **simple** | Identical through D-2026-08-15-03; origin/main only appends D-2026-08-15-04 (ILIKE auth). Kept both (took theirs append). |
| memory/session-summary.md | **simple** | Both rewrote 2026-08-15 session for different workstreams. Kept both as stacked session blocks (this branch Stage 0 PASS, then origin/main ILIKE). |

No complicated conflicts. No leftover conflict markers.

## Out of scope

Did not fold listing-content registry, brain ingest, or unrelated CI from PRs #369/#370/#371/#374. Incoming main files auto-merged without conflict.

Untracked docs/prompts/ruflo-swarm-noc-2026-08-15.md left unstaged.

## Push

Not pushed (action default).
