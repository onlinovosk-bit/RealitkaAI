---
id: TASK-RLS-ONBOARDING-SESSION
type: task
status: done
status_scope: engineering          # done = kód + merge; NIE produkčný stav
owner: founder
created_at: 2026-09-04T12:00:00Z
updated_at: 2026-09-16T23:15:00+02:00
scope:
  repo_paths:
    - apps/crm/src/app/api/onboarding/session/**
    - apps/crm/src/lib/onboarding/**
    - apps/crm/supabase/migrations/20260904220000_drop_onboarding_sessions_anon_all.sql
    - docs/runbooks/rollback-onboarding-sessions-anon.md
    - docs/reports/2026-09-04-rls-onboarding-session-api.md
  forbidden_paths:
    - apps/crm/src/app/api/automation/rules/**
evidence:                          # STATE MUST BE EVIDENCE-BACKED
  pr:
    number: 534
    status: merged
    merged_at: 2026-09-05T21:59:00+02:00
  commit:
    sha: 3aed4fcf74db4c157360a3539d4fe248a5c1017e
    proof: "git merge-base --is-ancestor 3aed4fcf origin/main  -> exit 0"
  production:
    migration_applied: unknown     # 20260904220000 — žiadny artefakt o apply
    anon_policy_present: unknown   # posledný zdokumentovaný stav 2026-09-04: EXISTUJE
    last_documented: docs/reports/2026-09-04-rls-anon-apply.md
    verified_by: null              # iba read-only prod dôkaz ho zmení; mimo aktuálnej vlny
acceptance_state:                  # pôvodné kritériá karty (2026-09-04), nie prepísané
  - id: A1
    desc: "`Allow anon access` neexistuje"
    state: unknown
  - id: A2
    desc: "5 existujúcich sessions nie sú verejne listovateľné anon kľúčom"
    state: unknown
  - id: A3
    desc: "Onboarding progress sync stále funguje (API alebo scoped policy)"   # desc NEPREPÍSANÝ (06)
    state: fail
    deviation: accepted_by_founder            # DEC-20260917-003 — 401 je zámer, nie porucha
    measured: "sync funguje pre prihláseného; pre anonymného nie (401) a podľa DEC-20260917-003 ani nemá"
    finding: "neprihlásený používateľ dostane 401: apps/crm/src/proxy.ts:88 isPublic() neobsahuje /api/onboarding/session; :183 `!user && /api/` -> 401; useOnboarding.ts:108-113 soft-fail .catch(() => {})"
    proof: "apps/crm/src/proxy-onboarding-session-gate.test.ts — 5 passed; mutačný test (docasne PUBLIC_PATHS) -> 2 failed"
    evidence_report: docs/reports/2026-09-17-a3-onboarding-session-401-finding.md
  - id: A4
    desc: "Rollback SQL v tom istom PR"
    state: pass
    proof: "docs/runbooks/rollback-onboarding-sessions-anon.md pridaný v 9235643b (PR #534)"
verdict:                           # iba Judge (runner/09); manuálny ACCEPT odstránený
  result: null
  reason: null
  checked_at: null
  ledger_run_id: null
founder_decisions:
  - .ai/bus/decisions/DEC-20260916-001-rls-onboarding-confirm-applied.md   # čiastočne nahradené
  - .ai/bus/decisions/DEC-20260916-002-rls-prod-state-unknown.md
  - .ai/bus/decisions/DEC-20260917-003-a3-onboarding-401-intended.md   # A3 vyhodnotené: 401 = zámer
---

# TASK-RLS-ONBOARDING-SESSION — zatvoriť `Allow anon access`

**Status:** `done` **(engineering)** — kód Path B + PR #534 merged. **Produkcia: UNKNOWN.**  
**PR:** https://github.com/onlinovosk-bit/RealitkaAI/pull/534 — **MERGED** 2026-09-05 (`3aed4fcf7`)  
**Branch:** `security/rls-onboarding-session`  
**Report:** `docs/reports/2026-09-04-rls-onboarding-session-api.md`  
**Decisions:** `DEC-20260916-001` (GO CONFIRM-APPLIED) → čiastočne nahradené `DEC-20260916-002` (prod = UNKNOWN)

> `done` tu **neznamená**, že v produkcii neexistuje `Allow anon access`.
> Pôvodné bezpečnostné Acceptance A1–A2 sú `unknown` (front matter `acceptance_state`).
> A3 je `fail` s `deviation: accepted_by_founder` — 401 pre neprihláseného je **zámer**
> (`DEC-20260917-003`), nie otvorená porucha.

## Acceptance — pôvodné kritériá (2026-09-04)

- [ ] A1 `Allow anon access` neexistuje — **UNKNOWN**
- [ ] A2 5 sessions nie sú verejne listovateľné anon kľúčom — **UNKNOWN**
- [ ] A3 Onboarding sync funguje — **FAIL, odchýlku prijal founder** (`DEC-20260917-003`): funguje pre prihláseného; anonymný dostane 401 a je to zámer. Brána fixovaná testom `apps/crm/src/proxy-onboarding-session-gate.test.ts`.
- [x] A4 Rollback SQL v tom istom PR — **PASS** (`9235643b`)

## Out of scope (unchanged)

- `lead_assignment_rules` / `agency_id` drift → Brief 17
- `integration_settings` conscious deny

## Historical problem statement

`onboarding_sessions` had `Allow anon access` (`FOR ALL TO anon USING (true)`).
Path B: API `POST/GET /api/onboarding/session` (service role) + DROP anon ALL.
See report for implementation detail — do not re-paste here.
