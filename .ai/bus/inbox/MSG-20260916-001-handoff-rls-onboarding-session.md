---
id: MSG-20260916-001-handoff-rls-onboarding-session
type: handoff
contract: REVOLIS_AGENT_CONTRACT_v0.1
status: open
from: orchestrator
to: [executor, challenger]
created_at: 2026-09-16T20:13:00Z
base:
  repo: onlinovosk-bit/RealitkaAI
  ref: 2ca212ef40531251b33bd5dede219b5765e90285
task:
  ref: .ai/bus/tasks/TASK-RLS-ONBOARDING-SESSION.md
  objective: "Zosúladiť task kartu s realitou repa a pripraviť founderovi jediné rozhodnutie potrebné na uzavretie P0 — bez zápisu do produkcie."
refs:
  context:
    - docs/architecture/REVOLIS_AGENT_CONTRACT_v0.1.md
    - .ai/bus/AGENT_PROTOCOL.md
    - .ai/bus/inbox/MSG-20260904-rls-anon-nejasne.md
    - docs/reports/2026-09-04-rls-onboarding-session-api.md
    - docs/audit/2026-09-04-rls-anon-policies.md
  decisions:
    - memory/decisions.md
  prior_outputs: []
expected_output:
  path: .ai/bus/outbox/MSG-20260916-01X-{role}-rls-onboarding-session.md
  path_by_role:
    executor: .ai/bus/outbox/MSG-20260916-010-executor-rls-onboarding-session.md
    challenger: .ai/bus/outbox/MSG-20260916-011-challenger-rls-onboarding-session.md
  kinds_allowed_by_role:
    executor: [FINDING, PROPOSAL, EVIDENCE, ACTION]
    challenger: [FINDING, PROPOSAL, EVIDENCE]
  must_answer:
    - "Q1: Aký je skutočný stav implementácie v repe pri base.ref v porovnaní s tým, čo tvrdí task karta?"
    - "Q2: Je DROP politiky `Allow anon access` preukázateľne aplikovaný v produkcii? Ak to z repa nevieš dokázať, označ UNKNOWN a navrhni overenie s gate."
    - "Q3: Ktoré body Acceptance z karty sú splnené s dôkazom, ktoré nie a ktoré sú UNKNOWN?"
    - "Q4: Aký je jediný ďalší krok k uzavretiu P0 a aký má gate?"
constraints:
  write_set:
    - "{expected_output.path_by_role[<tvoja rola>]}"
  forbidden:
    - prod_write
    - push
    - pr
    - merge
    - external_comms
    - read_other_role_outputs_before_own
independent_first: true
decision_owner: founder
---

# HANDOFF — TASK-RLS-ONBOARDING-SESSION (Gate 0 validačný beh)

Tento súbor je tvoj **jediný vstup**. Všetko ostatné nájdeš cez `refs` pri `base.ref`.
Pravidlá výstupu: `docs/architecture/REVOLIS_AGENT_CONTRACT_v0.1.md` §2, §3, §5, §6.

Ak ti chýba kontext, ktorý sa z `refs` nedá získať, **nehádaj**: zapíš ho do
`context_requests` a pokračuj s tým, čo dokázať vieš.

Nevykonávaj nič s `side_effects: external | production`. Na produkčnú DB ani GitHub API
v tomto behu nesiahaj — tvrdenie o nich je UNKNOWN, kým ho neoverí gated krok.
