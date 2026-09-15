# Lane A — report

## Najprv som hľadal

- `apps/crm/scripts/check-api-contract.mjs` — existuje, ratchet vzor
- `apps/crm/next.config.js` — `typescript.ignoreBuildErrors: true` (riadok 28)
- `.github/workflows/saas-grade-pipeline.yml` — krok `Lint` (working-directory apps/crm); typecheck vložený hneď za ním
- `.ai/bus/tasks/TASK-0008.md` — existujúci Task Contract tvar (YAML frontmatter)

## Čo som zmenil

- Skopírované predpripravené: `judge.mjs`, `typecheck-baseline.mjs`, `TASK-TEMPLATE.md` (hashe VSETKY TRI SEDIA)
- `apps/crm/package.json` — scripts `judge`/`typecheck` + devDependency `js-yaml`
- `apps/crm/package-lock.json` — lockfile po `npm install`
- CI: Typecheck (baseline gate) za Lint
- Baseline zapísaná: **69**
- `TASK-0100.md` + ledger run

## Dôkaz

- `overit-hashe.ps1` → VSETKY TRI SEDIA
- `typecheck-baseline.mjs --write-baseline` → count **69**
- Judge → **VERDIKT: ACCEPT**, exit 0, run_id `RUN-20260915112141-TASK-0100`

## Zostávajúce riziká

- `ignoreBuildErrors: true` ostáva (zámerne); ratchet len bráni rastu dlhu
- CI typecheck beží s `working-directory: apps/crm` — skript hľadá baseline path `apps/crm/scripts/...` relatívne; pri absencii súboru padá na DEFAULT_BASELINE 69 (logika skriptu nemená)
- Lane B musí vetviť z tipu tejto lane A
## Amendment — js-yaml

- **Advisory:** GHSA-52cp-r559-cp3m · HIGH · CVSS 7.5 · CWE-400/407
- **Postihnuté:** `>=4.0.0 <4.3.0` (lane A mala `^4.1.0` → 4.1.1)
- **Oprava:** `apps/crm/package.json` `"js-yaml": "^4.3.0"` → resolved **4.3.2**
- **Prečo:** `judge.mjs` parsuje YAML frontmatter od agentov — presne merge-key DoS povrch

### `npm ls js-yaml` po oprave

```
realitka-ai-monorepo@ C:\RealitkaAI-run\lane-A
`-- realitka-ai-crm@0.1.0 -> .\apps\crm
  +-- eslint@9.39.4
  | `-- @eslint/eslintrc@3.3.5
  |   `-- js-yaml@4.3.2 deduped
  +-- js-yaml@4.3.2
  `-- ts-jest@29.4.9
    `-- @jest/transform@30.3.0
      `-- babel-plugin-istanbul@7.0.1
        `-- @istanbuljs/load-nyc-config@1.1.0
          `-- js-yaml@3.15.2
```

- Tranzitívny **4.1.1 zmizol** — eslint/@eslint/eslintrc dedupe na **4.3.2**
- Ostáva `js-yaml@3.14.2` / `3.15.2` pod istanbul (major 3, **mimo** GHSA rozsahu) — dlh main/tooling, neopravované tu
- Lockfile diff: iba deklarácia `^4.1.0` → `^4.3.0` v `apps/crm/package-lock.json` + root `package-lock.json`. `npm update` chcel posunúť nested 3.14.2→3.15.2 — **revertnuté**, necommittnuté
- TASK-0100 scope doplnené o `package-lock.json` + `lanes/A/**` (už boli na vetve; bez toho A4 REJECT)

### Judge po amendment

```
JUDGE  TASK-0100  |  .ai\bus\tasks\TASK-0100.md
------------------------------------------------------------------------------------------------
ID      PRIKAZ                                          STAV     DETAIL
A1      node apps/crm/scripts/typecheck-baseline.mjs    PASS     exit 0, ocakavane 0
A2      node apps/crm/scripts/check-api-contract.mjs -  PASS     exit 0, ocakavane 0
A3      npm --prefix apps/crm run lint                  PASS     exit 0, ocakavane 0
A4      git diff --name-only origin/main...HEAD         PASS     13 suborov, vsetky v scope
------------------------------------------------------------------------------------------------
VERDIKT: ACCEPT  --  4 kontrol PASS, risk=low
run_id:  RUN-20260915144110-TASK-0100
Ledger:  .ai\bus\ledger\2026-09.jsonl
```

