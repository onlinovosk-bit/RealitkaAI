# Plan — BO Property Launch Pack V0

**BO:** `docs/briefs/BO-property-launch-pack-v0.md`  
**Status:** spec only — implementácia až po `GO IMPLEMENT PROPERTY LAUNCH PACK V0`

## Kroky (po GO)

1. Adapter `PropertyLaunchFacts` + unit testy (manuál / Realvia).
2. Orchestrátor: KF1 generate → Guardian → (opt) vertical-pack → export allowlist.
3. API + tenké UI za flagom.
4. Verification + fixture `13303557`.
5. Doplniť 4 source_id z founder dodávky; pilot stopky; report.

## Zakázané v diff

- `mapCategory` / `processQueue` type remap  
- nová migrácia / nová tabuľka  
- portal publish / chatbot  
- bulk 132

## Závislosti (paralelné, iné PR)

- Oficiálny číselník Realvia (category + transaction) — **blocker** pred mapper fix
- Mapper P0: `mapCategory` + `mapTransaction` + backfill — samostatné GO
- Voliteľné: apply `ai_generations` (samostatný GO)

