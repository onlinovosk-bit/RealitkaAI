# Stav Vlny 3B a Vlny 4

**Dátum:** 2026-08-15 (súbor podľa zadania 2026-08-17)

## Vlna 3B (L13 / L14) — nebeží

Zdroj: `docs/prompts/ruflo-swarm-vlna3-2026-08-12.md` (spúšťa founder po merge L9).

| Lane | Zadanie | Vetva | PR | Stav |
|---|---|---|---|---|
| L13 PR-S0.4 | sync campaigns + ad groups, mock-first | — | — | **nie je** |
| L14 PR-S0.5 | sync keywords + search terms + metrics | — | — | **nie je** |

Na `main` (`9109a73e6`) v `apps/crm/src/lib/acquisition/` sú len `credentials.ts`, `google-ads-client.ts` a testy. Adresár `sync/` neexistuje. Remote `feat/acquisition-s04*` / `s05*` nie sú. L9 (#390) a L7 (#384) sú zmergované — vstupná brána 3B je otvorená, swarm nespustený.

## Vlna 4 L15–L18 — STOP, prompt chýba

Zadaná cesta `docs/prompts/ruflo-swarm-vlna4-5-2026-08.md` **v repe nie je** (ani na `origin/main`). Bez promptu sa lane nespúšťajú.

Zámena, ktorú nerobíme: STF-P0 L15–L18 sú iný program (`#396` L15 merged, `#394` L16 merged, `#395` L17 merged, `#397` L18 open). To nie je Acquisition Vlna 4.

Ďalší krok: founder dodá `ruflo-swarm-vlna4-5-2026-08.md` do repa, potom L15–L18 = vetva + PR + STOP.
