# Premortem Mitigations (L99)

## Scope
- This document defines top risk mitigations for CRM governance and docs execution stream.
- It avoids implementation detail in test and infrastructure streams.

## Top Risks And Mitigations
1. **Decision latency blocks execution**
   - Mitigation: enforce explicit owner and deadline for each priority decision.
2. **Compliance drift between legal intent and product behavior**
   - Mitigation: require evidence links for each GDPR-sensitive change before rollout.
3. **Unclear ownership across Product, Engineering, and Legal**
   - Mitigation: maintain a lightweight RACI and keep it versioned in docs.

## L99 Execution Checklist (Priority Items)

| Priority Item | Owner | Deadline | Evidence | Status |
| --- | --- | --- | --- | --- |
| Freeze top-5 operational risks for Q2/Q3 | Governance Lead | 2026-06-03 | Risk register update in `apps/crm/docs/progress.md` | In progress |
| Define mitigation acceptance criteria per risk | Product Ops Lead | 2026-06-05 | Signed criteria section in this doc | Planned |
| Confirm escalation SLA for blocker decisions (24h/48h) | Program Manager | 2026-06-04 | Escalation matrix in `apps/crm/docs/RUFLO-ORCHESTRATION.md` | Planned |
| Validate legal/compliance handoff points | Legal Ops Owner | 2026-06-06 | Checklist reference in `apps/crm/docs/legal/LEGAL-CHANGELOG.md` | Planned |

## Role Proposal
- **Governance Lead**: accountable for risk prioritization and decision cadence.
- **Product Ops Lead**: accountable for translating mitigations into executable work.
- **Legal Ops Owner**: accountable for compliance interpretation and sign-off gates.
- **Program Manager**: accountable for timeline integrity and escalation routing.
- **Engineering Lead**: responsible for feasibility input and implementation sequencing.

## RACI (Mini)

| Deliverable | Governance Lead | Product Ops Lead | Legal Ops Owner | Program Manager | Engineering Lead |
| --- | --- | --- | --- | --- | --- |
| Premortem risk list | A | R | C | C | C |
| Mitigation acceptance criteria | A | R | C | C | C |
| Escalation SLA and runbook | C | C | C | A/R | C |
| Compliance handoff gates | C | C | A/R | C | C |

## Open Decisions (User)
- [x] **Recommended default (L99): Role -> Name mapping process approved**
  - Decision rule: every accountable role in a priority item must be mapped to exactly one named primary owner and one named backup owner before status can move to `In progress`.
  - Mapping template:
    - `Role:`
    - `Primary owner (name):`
    - `Backup owner (name):`
    - `Effective from (YYYY-MM-DD):`
    - `Evidence link:`
  - Operational gate: if mapping is missing for any P0/P1 item, Program Manager blocks execution start and escalates within the same business day.
- [x] **Recommended default (L99): Escalation SLA approved**
  - P0 decision blocker: initial acknowledgement <= 2h (business hours), decision/owner assignment <= 24h.
  - P1 decision blocker: initial acknowledgement <= 8h (business hours), decision/owner assignment <= 48h.
  - If deadline is missed: auto-escalate to Governance Lead, then fallback to Product Lead after +8h.

## Immediate Action Tracker (Defaults Activation)

| Action | Owner | Deadline | Evidence | Status |
| --- | --- | --- | --- | --- |
| Populate role->name mapping for all P0/P1 items using template above | Program Manager | 2026-06-03 | Updated table in this doc + link in `apps/crm/docs/progress.md` | [ ] Not started |
| Confirm backup owner coverage for each mapped role | Governance Lead | 2026-06-04 | Backup-owner field completed for every mapped role | [ ] Not started |
| Publish escalation matrix with P0/P1 timers in runbook | Program Manager | 2026-06-04 | Matrix section in `apps/crm/docs/RUFLO-ORCHESTRATION.md` | [ ] Not started |
