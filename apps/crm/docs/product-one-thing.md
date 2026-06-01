# Product One Thing (L99)

## One Thing Statement
- The single highest-priority product outcome is: **reliable, explainable CRM operator trust in daily decisions**.

## Scope
- This document aligns product focus, ownership, and execution evidence.
- It is intentionally isolated from test and infrastructure implementation details.

## Success Definition
- Users can trust dashboard and core workflows for daily decisions.
- Priority execution is visible, owned, and measurable.
- Compliance-sensitive behavior is explicit and documented.

## L99 Execution Checklist (Priority Items)

| Priority Item | Owner | Deadline | Evidence | Status |
| --- | --- | --- | --- | --- |
| Finalize One Thing KPI set (3 KPIs max) | Product Lead | 2026-06-03 | KPI section update in this doc | In progress |
| Map KPI owners and review cadence | Governance Lead | 2026-06-04 | KPI owner matrix with weekly cadence | Planned |
| Align roadmap items to One Thing filter | Program Manager | 2026-06-06 | Prioritization table in roadmap docs | Planned |
| Define stop-doing list for non-core initiatives | Product Lead | 2026-06-05 | Approved stop-doing list in this doc | Planned |

## Final KPI Set (Recommended Default L99)
- **KPI 1 - Operator no-workaround rate**: >= 90% of daily operator actions completed without manual workaround.
- **KPI 2 - Decision rationale coverage**: >= 95% of priority decisions include visible rationale in UI or linked doc.
- **KPI 3 - Critical workflow uptime-without-blocker**: >= 99% days per month with zero P0/P1 blocker in critical CRM workflows.

## Compliance Impact Veto Policy (Recommended Default L99)
- A roadmap item is **blocked from scheduling** when Legal Ops Owner marks compliance impact as `High` and required mitigation evidence is missing.
- Unblock rule: item can enter sprint only after mitigation owner, deadline, and evidence link are present and acknowledged by Legal Ops Owner.
- Fast-track exception (P0 business continuity only): Product Lead may authorize temporary continuation for max 5 business days with written risk acceptance and explicit rollback plan.

## Role Proposal
- **Product Lead**: accountable for One Thing direction and KPI approval.
- **Governance Lead**: accountable for execution visibility and evidence quality.
- **Program Manager**: responsible for roadmap alignment and delivery tracking.
- **Engineering Lead**: consulted on feasibility and sequencing.
- **Legal Ops Owner**: consulted for compliance-sensitive scope decisions.

## RACI (Mini)

| Deliverable | Product Lead | Governance Lead | Program Manager | Engineering Lead | Legal Ops Owner |
| --- | --- | --- | --- | --- | --- |
| One Thing statement and KPI approval | A/R | C | C | C | C |
| KPI review cadence and evidence format | C | A/R | C | C | C |
| Roadmap filtering by One Thing | C | C | A/R | C | C |
| Stop-doing list ratification | A/R | C | C | C | C |

## Open Decisions (User)
- [x] **Recommended default (L99): Final 3 KPI set approved as above**
- [x] **Recommended default (L99): Compliance-impact veto policy approved as above**

## Immediate Action Tracker (Defaults Activation)

| Action | Owner | Deadline | Evidence | Status |
| --- | --- | --- | --- | --- |
| Add KPI data source and measurement query for each final KPI | Product Lead | 2026-06-05 | KPI source links added under each KPI | [ ] Not started |
| Apply compliance-veto gate to current roadmap prioritization board | Program Manager | 2026-06-04 | Board screenshot/link showing gate field and blocked items | [ ] Not started |
| Publish weekly KPI review cadence and attendees | Governance Lead | 2026-06-04 | Weekly review slot + owner list in `apps/crm/docs/progress.md` | [ ] Not started |
