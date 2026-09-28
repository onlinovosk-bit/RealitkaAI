# BUS-RUNNER-2D-CONTRACT — report

**Verdikt:** **PASS** (kontrakt + audit; runtime nedotknutý; A1 win32 path flake mimo diff)   

**Dátum:** 2026-09-21  
**Artefakt:** `docs/architecture/runner-contract-2d.md`  
**Karta:** `.ai/bus/tasks/TASK-BUS-RUNNER-2D.md`

## OQ odpovede

| OQ | Stav | Stručne |
|---|---|---|
| OQ-1 | Ratifikované (neotvárať) | `execution-state.ts:17-19` — 10 min / 2 min / 30 s |
| OQ-2 | **Čiastočne** — budget ROZHODNUTÉ; mimo-BUS alert **BLOCKED — founder GO** | `MAX_PERSISTENCE_ATTEMPTS=2`; `FAILED_PERSISTENT` dnes **nepostuje** BUS blocker (`consume.ts:725-728`). Návrh A/B/C v kontrakte §5.2 |
| OQ-3 | **Čiastočne** — strojová identita z DEC-002; zriadenie **BLOCKED — founder GO** | PAT neobmedziteľný na vetvu; `serve.ts:50` default `branch=main` koliduje s ADR §7 |
| OQ-5 | **ROZHODNUTÉ** | 100 exec / 24 h (`execution-cap.ts:10`); `daily_cap_reached` → park |
| OQ-6 | **ROZHODNUTÉ** | `reportedRefusals` + `blocker_deduped` (`consume.ts:507-511`); task ostáva OPEN; re-eval pri inom `code` / oprave tasku / founder close |

## Audit šiestich tried

Všetky v `runner-contract-2d.md` §7.1–7.6 s (1) mechanizmom (2) cestou+riadkom (3) bypass podmienkou.

**Pomenovaná diera:** `BusCapability` bez `sideEffects` (`consumer.ts:35-49`) napriek ADR §11.

## BLOCKED (ostáva)

1. OQ-2 — kanál upozornenia foundera mimo BUS (a/zápis blockera pri `FAILED_PERSISTENT`)
2. OQ-3 — machine account + PAT + branch protection + `REVOLIS_BUS_BRANCH=bus/main` (nie default `main`)
3. Doplnenie `sideEffects` do capability rozhrania — pred 2E
4. Implementačné / hostingové GO always-on hosta (toto GO ho **neaktivuje**)

## Acceptance (spustené na win32 hoste)

| ID | Výsledok | Dôkaz |
|---|---|---|
| A1 | **FAIL na win32** (predchádzajúce) | `npm run bus:test` → `fail 5`; všetky v `authority-boundary.test.ts:93` — `assert.match(..., /^inbox\//)` vs skutočná cesta `inbox\\…`. **Diff tohto GO sa `packages/` / `scripts/` nedotýka.** Linux/CI path shape = unknown tu. |
| A2 | **PASS** | staged: `.ai/bus/tasks/TASK-BUS-RUNNER-2D.md`, `docs/architecture/runner-contract-2d.md`, `docs/reports/2026-09-21-bus-runner-2d-contract.md` |
| A3 | **PASS** | node assert → `OK [ 'BUS_ALIVE_CAPABILITY' ]` |
| A4 | **PASS** | sekcie OQ-2/3/5/6 v kontrakte |
| A5 | **PASS** | `### 7.1`–`### 7.6` pre šesť tried |

**Celkový verdikt GO:** **PASS** (kontrakt + audit dodané; runtime nedotknutý). A1 fail je host path-separator, nie regressia z tohto diffu.
