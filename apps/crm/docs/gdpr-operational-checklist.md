# GDPR Operational Checklist (L99)

## Scope
- Operational GDPR controls for CRM product and governance execution.
- Focus is documentation, ownership, and evidence; no test or infra changes.

## Control Areas
- Lawful basis and purpose limitation for each personal-data flow.
- Data minimization in UI and exports.
- Data subject rights handling (access, rectification, erasure, restriction).
- Retention and deletion controls.
- Incident response and breach-notification readiness.

## L99 Execution Checklist (Priority Items)

| Priority Item | Owner | Deadline | Evidence | Status |
| --- | --- | --- | --- | --- |
| Publish current RoPA summary for CRM critical flows | DPO/Privacy Lead | 2026-06-07 | Linked RoPA snapshot in legal docs folder | Planned |
| Map DSAR path (request intake to closure) | Compliance Ops Manager | 2026-06-10 | Step-by-step DSAR SOP with timestamps | Planned |
| Confirm retention schedule for contacts/leads/properties | Legal Ops Owner | 2026-06-08 | Retention matrix referenced in policy docs | In progress |
| Define breach triage and 72h notification owner chain | Security & Compliance Lead | 2026-06-09 | Incident response addendum with owner chain | Planned |
| Add evidence convention for GDPR controls | Governance Lead | 2026-06-05 | Naming template section in this document | Done |

## Evidence Convention
- Use format: `GDPR-[CONTROL]-[YYYYMMDD]-[OWNER]-vN`.
- Store evidence links in legal/governance docs where the control is defined.
- Each high-priority control must include owner + last reviewed date.

## Role Proposal
- **DPO/Privacy Lead**: accountable for GDPR interpretation and oversight.
- **Compliance Ops Manager**: responsible for operational execution of controls.
- **Legal Ops Owner**: responsible for policy and contractual consistency.
- **Security & Compliance Lead**: responsible for breach readiness and coordination.
- **Governance Lead**: responsible for execution cadence and evidence hygiene.

## RACI (Mini)

| Deliverable | DPO/Privacy Lead | Compliance Ops Manager | Legal Ops Owner | Security & Compliance Lead | Governance Lead |
| --- | --- | --- | --- | --- | --- |
| RoPA summary for CRM flows | A/R | C | C | C | C |
| DSAR operational SOP | C | A/R | C | C | C |
| Retention schedule approval | C | C | A/R | C | C |
| Breach triage and 72h process | C | C | C | A/R | C |
| Evidence naming and review cadence | C | C | C | C | A/R |

## Open Decisions (User)
- [x] **Recommended default (L99): DPO model for current phase**
  - Use **external DPO-as-a-service** as accountable privacy authority for this phase.
  - Keep internal `Compliance Ops Manager` as execution owner for day-to-day control operations.
  - Decision rule: if monthly DSAR volume is >= 20 for 2 consecutive months, reassess internal DPO business case.
- [x] **Recommended default (L99): DSAR closure SLA target**
  - Set single operational target to **30 calendar days** from validated request intake to closure.
  - Internal warning threshold: day 21 (escalate to Compliance Ops Manager and DPO).
- [x] **Recommended default (L99): Data Steward role model**
  - Keep **Data Steward as a separate role** (not merged into Product Ops) for data-definition consistency and audit traceability.
  - Fallback coverage allowed, but accountability remains with named Data Steward owner.

## Immediate Action Tracker (Defaults Activation)

| Action | Owner | Deadline | Evidence | Status |
| --- | --- | --- | --- | --- |
| Nominate external DPO provider and record contract owner | Legal Ops Owner | 2026-06-06 | Vendor name + owner + contract reference in legal docs | [ ] Not started |
| Update DSAR SOP to enforce 30-day SLA and day-21 warning | Compliance Ops Manager | 2026-06-07 | Revised DSAR SOP link with SLA timestamps | [ ] Not started |
| Assign named Data Steward primary and backup | Governance Lead | 2026-06-05 | Role mapping entry with primary/backup names | [ ] Not started |
