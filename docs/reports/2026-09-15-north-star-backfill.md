# 2026-09-15 — North-star backfill (W2)

**RUN_ID:** `2026-09-15T1955-CEST-north-star`  
**Mode:** `founder_batch` · **Range:** 2026-08-17 → 2026-09-16 (31 dní)  
**BASE tip:** `origin/main` po #557

## 1. Tabuľka 31 dní

| deň | realvia | portal | leads_new | activities | matches | intents_new | notif | unread_eod | merged PRs |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---|
| 2026-08-17 | 0 | 0 | 0 | 0 | 0 | 0 | 3 | 94 | — |
| 2026-08-18 | 0 | 0 | 0 | 0 | 0 | 0 | 2 | 96 | — |
| 2026-08-19 | 0 | 0 | 0 | 0 | 0 | 0 | 3 | 99 | — |
| 2026-08-20 | 0 | 0 | 0 | 0 | 0 | 0 | 2 | 101 | — |
| 2026-08-21 | 0 | 0 | 0 | 0 | 0 | 0 | 4 | 105 | — |
| 2026-08-22 | 0 | 0 | 0 | 0 | 0 | 0 | 2 | 107 | — |
| 2026-08-23 | 0 | 0 | 3 | 2 | 0 | 0 | 4 | 111 | — |
| 2026-08-24 | 0 | 0 | 12 | 0 | 0 | 0 | 3 | 114 | — |
| 2026-08-25 | **7** | 0 | 1 | 0 | 0 | 0 | 2 | 116 | — |
| 2026-08-26 | 0 | 0 | 0 | 0 | 0 | 0 | 3 | 119 | #474 |
| 2026-08-27 | 0 | 0 | 1 | 0 | 0 | 0 | 2 | 121 | #476 #478 #479 #483 #485 |
| 2026-08-28 | 1 | 0 | 0 | 0 | 0 | 0 | 3 | 124 | #488 #489 |
| 2026-08-29 | 0 | 0 | 0 | 0 | 0 | 0 | 3 | 127 | — |
| 2026-08-30 | 0 | 0 | 7 | 0 | 0 | 0 | 3 | 130 | — |
| 2026-08-31 | 0 | 0 | 0 | 0 | 0 | 0 | 2 | 132 | — |
| 2026-09-01 | 0 | 0 | 0 | 0 | 0 | 0 | 3 | 135 | — |
| 2026-09-02 | 0 | 0 | 0 | 0 | 0 | 0 | 2 | 137 | #469 #470 #472 |
| 2026-09-03 | 0 | 0 | 0 | 0 | 0 | 0 | 3 | 140 | #481 #509 #513 |
| 2026-09-04 | 0 | 0 | 0 | 0 | 0 | 0 | 3 | 143 | #528 |
| 2026-09-05 | 0 | 0 | 0 | 0 | 0 | 0 | 4 | 147 | #477 #534 |
| 2026-09-06 | 0 | 0 | 0 | 1 | 0 | 0 | 4 | 151 | — |
| 2026-09-07 | 0 | 1 | 1 | 0 | 0 | 0 | 3 | 154 | — |
| 2026-09-08 | 0 | 1 | 1 | 0 | 0 | 0 | 5 | 159 | — |
| 2026-09-09 | 0 | 0 | 0 | 0 | 0 | 0 | 3 | 162 | — |
| 2026-09-10 | 0 | 0 | 0 | 0 | 0 | 0 | 3 | 165 | — |
| 2026-09-11 | **9** | 0 | 0 | 0 | 0 | 0 | 3 | **1** | — |
| 2026-09-12 | 0 | 0 | 0 | 0 | 0 | 0 | 3 | 1 | — |
| 2026-09-13 | 0 | 0 | 0 | 0 | 0 | 0 | 2 | 0 | — |
| 2026-09-14 | 0 | 0 | 0 | 0 | 0 | 0 | 4 | 2 | — |
| 2026-09-15 | **2** | **2** | **2** | 0 | 0 | 0 | 4 | 1 | #553 #554 #555 #556 #557 |
| 2026-09-16 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | — |

Súčet v rozsahu: **leads_new = 28** · **activities = 3** · **matches = 0** · **intents_new = 0** · **realvia_webhooks = 19** · **auto_responses = 0** · **viewings = 0** · **closed_won = 0**.

## 2. Kroky loopu celé na nule (za 31 dní)

| krok | stav |
|---|---|
| QUALIFICATION (`matches_new`) | **nula každý deň** |
| INTENT (`intents_new`) | **nula každý deň** (stock intents_total=3) |
| WARMING | `not_implemented: true` |
| OUTREACH (`auto_responses_sent`) | **nula každý deň** |
| APPOINTMENT (`viewings`) | **nula každý deň** |
| MANDATE (`closed_won`) | **nula každý deň** |

SIGNAL nie je mŕtvy: Realvia **7** (25. 8.), **9** (11. 9.), **2** (15. 9.) — tri krátke výkyvy, nie obnovený tok. Portal leady od 7. 9.

## 3. `production_effect` v ledgeri

Na `main` je v `.ai/bus/ledger/2026-09.jsonl` **1 riadok** (`TASK-0100`), `merged_at: null`, `production_effect: null`.

Pravidlo balíka: doplniť `production_effect` len ak `merged_at` existuje a deň >7 dní. → **0 riadkov spárovaných, 1 ostáva null** (chýba `merged_at`). To nie je chyba merania — ledger ešte neukladá merge čas pri Judge ACCEPT.

## 4. Dôkaz

- `control/results.json` — 31 riadkov z founder SQL
- `.ai/bus/metrics/north-star-2026-08.jsonl` + `...-09.jsonl`
- `node apps/crm/scripts/north-star-validate.mjs --range 2026-08-17,2026-09-16 --ci` → exit 0

## 5. Stop

`backfill_complete` · max PR = 1 (tento).
