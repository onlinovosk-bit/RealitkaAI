# OVERNIGHT REPORT 9 — skeleton

> Orchestrátor doplní počas noci. **Pre-flight je overený stav pred Vlnou 1.**

## Pre-flight inventár (Brief 8.0 resty)

**Pravidlo:** REPORTOVANÉ ≠ COMMITNUTÉ — overené `git branch -a` + open PRs @ 2026-06-11.

| Agent 8.0 | Vetva | Remote | PR | Verdikt |
|-----------|-------|--------|-----|---------|
| B RLS | `chore/rls-tenant-isolation-suite` | áno | #184 | CI zelené, čaká merge |
| C onboarding | `feat/onboarding-activation-emails` | áno | #183 | len e-maily, wizard chýba |
| A landing v2 | `feat/landing-v2-release` | **nie** | — | nedobehlo |
| D metrics | `feat/founder-metrics` | **nie** | — | nedobehlo |
| E nehnuteľnosti | `feat/nehnutelnosti-import` | **nie** | — | nedobehlo |
| F resty | `fix/w2-leftovers` | **nie** | — | nedobehlo |

## Vlna → agent → PR → tier → stav

_(doplní orchestrátor počas noci)_

## RLS nálezy (kritické navrchu)

_(z #184 po merge)_

## Otázky pre Andyho

_(doplní orchestrátor)_

## Ranná Tier 3 fronta

1. Merge #184 RLS — pred self-serve dátami
2. Landing v2 (keď PR existuje) — len v release okne
3. Migračné PRs mimo automerge
