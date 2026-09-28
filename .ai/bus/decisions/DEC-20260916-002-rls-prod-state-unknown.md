---
id: DEC-20260916-002-rls-prod-state-unknown
type: decision
status: done
owner: founder
created_at: 2026-09-16T23:15:00+02:00
supersedes_in_part: DEC-20260916-001-rls-onboarding-confirm-applied
decided_by: founder
source: "chat:2026-09-16 (text zostavil ChatGPT, founder ho odoslal ako rozhodnutie): \"Track B: PASS + CLOSE. Gate 0: PASS. Track A: pokračovať bez zmeny scope. Production migration: zatiaľ UNKNOWN, nie CONFIRMED, pokiaľ nemáme evidenciu.\" · \"neposielal GO APPLY-PROD len preto, aby sme odstránili UNKNOWN\""
scope:
  repo_paths:
    - .ai/bus/tasks/TASK-RLS-ONBOARDING-SESSION.md
    - .ai/bus/decisions/DEC-20260916-001-rls-onboarding-confirm-applied.md
  external_systems: []
evidence:
  commands:
    - "git show origin/audit/2026-09-16:.ai/bus/decisions/DEC-20260916-001-rls-onboarding-confirm-applied.md  # evidence: gh pr view 534 + report 2026-09-04 (\"migration PREPARED, NOT applied\") — žiadny prod dôkaz"
    - "git show origin/audit/2026-09-16:.ai/bus/ledger/2026-09.jsonl | grep -c RLS-ONBOARDING  # 0 — verdikt ACCEPT nevydal Judge"
  files:
    - docs/reports/2026-09-04-rls-onboarding-session-api.md
    - docs/reports/2026-09-04-rls-anon-apply.md
  urls: []
next_action:
  gate: GO REQUIRED
  description: "Produkčné overenie alebo apply 20260904220000 — samostatná autorizovaná vlna až po Track A. Nie teraz."
---

# DEC-20260916-002 — RLS onboarding: produkčný stav = UNKNOWN

## DECISION (founder)

| čo | stav |
|---|---|
| Track B | **PASS + CLOSE** |
| Gate 0 (Protocol) | **PASS** |
| Gate 1 (Infrastructure integrity) | **IN PROGRESS** — Track A bez zmeny scope |
| Gate 2 / Gate 3 | NOT STARTED |
| `TASK-RLS-ONBOARDING-SESSION` | `done` iba ako **engineering** (kód + merge #534) |
| produkčná migrácia `20260904220000` | **UNKNOWN** — nie CONFIRMED |
| `GO APPLY-PROD` | **nevydané** |

## Čo sa týmto opravuje v DEC-20260916-001

DEC-001 zapísal „Production state … **OK**“. Jeho evidence (`gh pr view 534`, report z 2026-09-04)
dokazuje merge, **nie** produkčný stav. Report 2026-09-04 výslovne uvádza „migration PREPARED, NOT applied“.
Časť „prod OK“ je týmto rozhodnutím nahradená. Uzavretie engineering časti zostáva v platnosti.

## Princíp (nový, z Track B)

**STATE MUST BE EVIDENCE-BACKED.** Hodnota `status` bez `evidence` pre každú vrstvu
(PR / commit / produkcia) nie je stav, iba tvrdenie. Neoverená vrstva má hodnotu `unknown`.
