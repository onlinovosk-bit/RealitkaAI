# W0 — north-star measurement loop

**RUN_ID:** `2026-09-15T1955-CEST-north-star`  
**BASE_SHA:** `1a064d0325ee571e6169e8bca7b9181a535ef094` (`origin/main`)  
**Status:** `LAUNCH_AUTHORIZED` · scope `measurement` · mode `founder_batch`

## Brány

| Brána | Výsledok |
|---|---|
| `judge.mjs` na tip | PASS (súbor existuje) |
| `typecheck-baseline.mjs` na tip | PASS (súbor existuje) |
| `SUPABASE_READONLY_URL` | MISSING → režim **B founder_batch** |
| service-role | nepoužitý |
| prienik s typecheck balíkom | prázdny (write-set disjunktný) |

## Ruflo

`swarm_init`: **nepoužitý** (worktree runner; 1 pokus povolený, nie povinný).

## Ďalej

W1 artefakty pripravené. Slučka **čaká** na `control/results.json` od foundera.
