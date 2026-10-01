# Report — Runner AUDIT close-loop (2026-09-16)

**Pre:** Claude / ďalšia session  
**Režim:** AUDIT ONLY — hotový, STOP  
**Vetva:** `audit/2026-09-16` @ `7318e6159` (= lokálny `origin/main`)  
**Kontrakt:** `docs/prompts/runner/RUNNER.md` + vrstvy 00–12 (všetky načítané)

## Verdikt

AUDIT MODE je **dokončený**. EXECUTION sa **nespustil** a nesmie — preflight **BLOCK**.

## Artefakty (source of truth)

Všetko pod:

`docs/overnight/2026-09-16-audit-close-loop/audit/`

| súbor | obsah |
|---|---|
| `preflight.json` | príkazy + BLOCK/UNKNOWN |
| `a1-git.json` … `a4-gates.json` | inventár s evidence_cmd |
| `OPEN-WORK-REGISTER.md` | zlúčený register |
| `dag.json` / `dag-summary.md` | READY graf |
| `wave-1.json` | WAVE 1 **not launchable** |
| `RUN-SUMMARY.md` | uzávierka behu |

## Preflight BLOCK (tvrdé)

1. `node apps/crm/scripts/judge.mjs --help` → `ERR_MODULE_NOT_FOUND: js-yaml` (`apps/crm/node_modules` chýba).
2. `apps/crm/scripts/tc-orchestrator.mjs` **nie je na main** (je len na `chore/tc-orchestrator`), pričom Ruflo runtime je **unverified**.

UNKNOWN (zámerne nespustené — AUDIT zakázal externé služby): `git fetch`, `gh pr list`.

## Register (skrátene)

- kind: zacate_nedotiahnute 8 · hotove_nezapnute 4 · zapnute_nesledovane 2 · zrusene_neupratane 1 · zdokumentovane_neplatne 5  
- state: READY 6 · BLOCKED 6 · STALE 2 · OBSOLETE 1 · UNKNOWN 4  

Najväčšie rozpory dokument vs. repo:

- RUNNER cituje `tc-orchestrator.mjs` → na main chýba  
- `scope-guard.yml` (B7) → chýba  
- TASK-0100 stále `open` → Judge už na main (#554)  
- TASK-NS-001 `IN_PROGRESS` → ledger má ACCEPT  
- ledger `cost_usd: 0` všade → podľa kontraktu má byť `null` ak sa nemeria  

## DAG / WAVE 1

- Executable READY uzly: **1** (`bus:close-TASK-0100`, owner=founder)  
- Runnable negative_case: **0** → gate uzly (B7, cost_usd) do vlny nepatria  
- WAVE 1: `launchable: false`, tasks `[]`

## Čo ďalej (len po founder GO)

1. Operátor: `npm ci` v `apps/crm` → Judge `--help` exit 0  
2. Founder: rozhodnúť land `tc-orchestrator` z `chore/tc-orchestrator` (samostatný PR)  
3. Founder: typecheck paydown `launch-record` podpísať alebo odložiť  
4. Až potom písomné **GO EXECUTION MODE**

## Čo Claude nemá robiť

Nemergovať, nepushovať do main, nespúšťať EXECUTION, nevymýšľať Ruflo API, nespúšťať vlnu pri preflight BLOCK.
