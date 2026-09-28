---
id: HANDOFF-20260917-001-a3-onboarding-401
protocol: multi-agent-protocol-v0
type: handoff
status: open
from: executor (Claude Cowork cloud)
to: reviewer (subagent)
created_at: 2026-09-17T07:30:00+02:00
task_ref: .ai/bus/tasks/TASK-RLS-ONBOARDING-SESSION.md
artifact_refs:
  - path: .ai/bus/tasks/TASK-RLS-ONBOARDING-SESSION.md
    role: task
  - path: apps/crm/src/proxy.ts
    role: context
  - path: apps/crm/src/app/api/onboarding/session/route.ts
    role: context
  - path: apps/crm/src/lib/onboarding/session-api.ts
    role: context
  - path: docs/reports/2026-09-04-rls-onboarding-session-api.md
    role: report
  - path: .ai/bus/decisions/DEC-20260916-002-rls-prod-state-unknown.md
    role: decision
prior_decisions:
  - DEC-20260916-001-rls-onboarding-confirm-applied
  - DEC-20260916-002-rls-prod-state-unknown
  - DEC-20260917-002-operating-mode-b
out_of_scope:
  - apps/crm/src/app/api/automation/rules/**
  - produkčná DB, migrácie, .github/workflows
next_action:
  gate: GO REQUIRED
  description: "Predložiť founderovi FINDING + PROPOSAL k acceptance bodu A3 tejto task karty; implementácia až po GO."
  owner: founder
---

## Zadanie pre reviewera

Rozhodni **výlučne z artefaktov uvedených vyššie a zo stromu repozitára** (rezolučné poradie podľa
`docs/prompts/multi-agent-protocol-v0/04-independent-first.md`). Neptaj sa na kontext, ktorý sa dá prečítať.

Otázka, ktorú máš zodpovedať typovanými blokmi:

1. Aké je **skutočné runtime správanie** `/api/onboarding/session` pre požiadavku **bez prihlásenej session**
   (GET aj POST)? Rozhodni z kódu, nie z tvrdení v dokumentoch.
2. Ak je odpoveď 401 (alebo iný non-2xx), **čo sa stane s onboarding flow na klientovi** — kde sa chyba
   spracuje, čo používateľ vidí, čo sa stratí.
3. Existuje v repe **test alebo iný dôkaz**, ktorý toto správanie potvrdzuje alebo vyvracia?
4. Aké sú **možné varianty riešenia** vrátane varianty „nechať tak" — s bezpečnostným dopadom každej
   (pozri históriu RLS v reporte a v DEC).

## Pravidlá výstupu (00, 02)

- Každé vecné tvrdenie typuj: `FINDING` | `PROPOSAL` | `EVIDENCE`. Nič iné.
- `FINDING` bez `EVIDENCE` (cesta:riadok alebo príkaz + výstup) je neplatný.
- **Nesmieš** emitovať `DECISION` ani `ACTION` mimo vlastného výstupu.
- **Nesmieš** meniť súbory v repozitári, pushovať, ani volať sieť. Iba čítanie + lokálne príkazy.
- Na konci uveď `context_requests: []` ak ti nič nechýbalo; inak vypíš presne, čo chýbalo a akým
  príkazom by sa to zavrelo.
