# Tech Ownership (L99)

## Scope
- Defines ownership boundaries for product delivery, governance, and compliance-facing execution.
- Keeps separation from test and infrastructure streams.

## Ownership Principles
- One accountable owner per deliverable.
- Ownership by role first, then mapped to individual names.
- Evidence-driven closure: no item is "Done" without linked evidence.
- Escalation path is explicit and time-bound.

## L99 Execution Checklist (Priority Items)

| Priority Item | Owner | Deadline | Evidence | Status |
| --- | --- | --- | --- | --- |
| Publish ownership map for core CRM modules | Engineering Lead | 2026-06-04 | Updated module-owner matrix in this doc | In progress |
| Assign accountable owner for cross-functional docs stream | Program Manager | 2026-06-03 | Approved owner list in `apps/crm/docs/progress.md` | Planned |
| Define dependency protocol between product/legal/engineering | Governance Lead | 2026-06-06 | Dependency handoff section in this doc | Planned |
| Add escalation policy for unresolved ownership conflicts | Program Manager | 2026-06-05 | Escalation flow with SLA and fallback owner | Planned |

## Module Ownership Map (Role-Level)

| Area | Accountable Owner | Responsible Owner(s) | Consulted | Informed |
| --- | --- | --- | --- | --- |
| CRM Dashboard UX/Data Decisions | Product Engineering Lead | Frontend Engineer | Data Steward, Product Ops Lead | Governance Lead |
| Lead/Contact Lifecycle Rules | Product Ops Lead | CRM Operations Specialist | Legal Ops Owner, Engineering Lead | Program Manager |
| Compliance-Sensitive Data Definitions | Legal Ops Owner | Compliance Ops Manager | DPO/Privacy Lead, Data Steward | Product Leadership |
| Documentation Governance | Governance Lead | Program Manager | Engineering Lead, Legal Ops Owner | Stakeholders |

## Dependency Handoff Protocol
1. Requesting stream creates task with owner, outcome, and due date.
2. Receiving owner accepts or rejects within 1 business day.
3. If no response, Program Manager escalates to accountable owner.
4. Closure requires evidence link and status update.

## Role Proposal
- **Engineering Lead**: architecture and feasibility accountability.
- **Product Engineering Lead**: feature-level implementation ownership.
- **Product Ops Lead**: process and business-operation ownership.
- **Governance Lead**: cross-stream ownership model integrity.
- **Program Manager**: deadlines, escalations, and risk tracking.

## Open Decisions (User)
- [x] **Recommended default (L99): `Data Steward` remains a separate role**
  - Decision rule: data-definition disputes, schema glossary ownership, and audit traceability decisions are accountable to Data Steward, not Product Ops.
  - Coverage model: assign one primary + one backup steward through role->name mapping.
- Confirm escalation fallback owner when Program Manager is unavailable.

## Immediate Action Tracker (Defaults Activation)

| Action | Owner | Deadline | Evidence | Status |
| --- | --- | --- | --- | --- |
| Record Data Steward primary/backup in module ownership map | Governance Lead | 2026-06-05 | Updated ownership map row in this doc | [ ] Not started |
