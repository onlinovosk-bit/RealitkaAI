---
id: DEC-20260917-003-a3-onboarding-401-intended
type: decision
status: done
owner: founder
created_at: 2026-09-17T09:40:00+02:00
decided_by: founder
source: "chat:2026-09-17: \"GO na V1.\" · \"V1 — Nechať 401, opraviť dokumentáciu a pridať test, ktorý 401 považuje za zámer. Tým sa nemení bezpečnostný model aplikácie. Opraví sa iba nesúlad medzi aktuálnym správaním → dokumentáciou → testom.\" · \"Potom mu nedávajte automaticky GO na migráciu.\" · \"Migráciu necháme oddelenú ako samostatné rozhodnutie.\""
scope:
  repo_paths:
    - apps/crm/src/proxy-onboarding-session-gate.test.ts
    - docs/reports/2026-09-04-rls-onboarding-session-api.md
    - docs/runbooks/rollback-onboarding-sessions-anon.md
    - .ai/bus/tasks/TASK-RLS-ONBOARDING-SESSION.md
  forbidden_paths:
    - apps/crm/supabase/migrations/**
  external_systems: []
evidence:
  commands:
    - "npx vitest run src/proxy-onboarding-session-gate.test.ts  -> Test Files 1 passed (1), Tests 5 passed (5)"
    - "mutacny test: docasne pridane \"/api/onboarding/session\" do PUBLIC_PATHS -> Tests 2 failed | 3 passed (anon GET + anon POST); proxy.ts nasledne obnoveny, git diff prazdny"
  files:
    - docs/reports/2026-09-17-a3-onboarding-session-401-finding.md
    - .ai/bus/handoffs/HANDOFF-20260917-001-a3-onboarding-401.md
  urls:
    - https://github.com/onlinovosk-bit/RealitkaAI/pull/566
next_action:
  gate: GO REQUIRED
  description: "Aplikovanie migrácie 20260904220000 je SAMOSTATNÉ rozhodnutie — týmto DECISION sa neautorizuje. Pred ním read-only overenie stavu RLS v prode (runbook :38-41)."
  owner: founder
---

# DEC-20260917-003 — A3: 401 na `/api/onboarding/session` je zámer

## DECISION (founder)

| čo | stav |
|---|---|
| Variant | **V1** — nechať 401, opraviť dokumentáciu, zafixovať zámer testom |
| Bezpečnostný model aplikácie | **nemení sa** |
| `/api/onboarding/session` pre neprihláseného | **401 = zámer**, nie regresia |
| Onboarding bez prihlásenia | **nepodporovaný** ako serverový sync; anonymný wizard beží na `localStorage` |
| Aplikovanie migrácie `20260904220000` | **NEAUTORIZOVANÉ** — samostatné rozhodnutie |
| Varianty V2–V5 | **neprijaté**; zostávajú v reporte ako budúce možnosti |

## Čo sa mení a čo nie

Mení sa **len** súlad medzi správaním, dokumentáciou a testom. Nemení sa `proxy.ts`,
`route.ts`, `session-api.ts`, klient ani žiadny SQL súbor.

| vrstva | pred | po |
|---|---|---|
| správanie | 401 pre anon | 401 pre anon *(bez zmeny)* |
| dokumentácia | tvrdila „public sync funguje" | korigovaná na pravdivé znenie |
| test | `route.test.ts` asertuje `200` obídením proxy | pribudol proxy-level test, ktorý 401 fixuje ako zámer |

## Acceptance A3 — vyhodnotenie, nie prepis

Text acceptance A3 zostáva nezmenený (`06`: DECISION nesmie meniť Acceptance, iba ju vyhodnotiť).
Meranie nesedí so scope pôvodnej formulácie: sync pre **prihláseného** funguje, pre **anonymného**
nie a ani nemá. Zapísané ako `fail` + `deviation`, nie ako iný výklad.

## Zostáva otvorené (nie týmto DECISION)

1. **Migrácia `20260904220000`** — stále `PREPARED ONLY`. `Allow anon access` je v prode
   pravdepodobne otvorená. Pred apply: read-only SELECT z
   `docs/runbooks/rollback-onboarding-sessions-anon.md:38-41`.
2. **A1, A2** — zostávajú `unknown`, zavrie ich až ten read-only prod dôkaz.
3. **Supabase Auth „Confirm email"** v produkčnom projekte — rozhoduje, či 401 zasiahne aj
   registračnú cestu, alebo len klik z welcome e-mailu.
