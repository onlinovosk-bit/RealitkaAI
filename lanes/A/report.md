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