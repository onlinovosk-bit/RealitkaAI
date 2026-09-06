# MSG-20260904 — RLS anon audit follow-ups (updated after apply)

**Status:** DROP wave applied + founder re-check PASS (2026-09-04)

## Resolved

- `lead_assignment_rules` demo_* → **ZRUŠIŤ** and dropped (0 rows).
- Founder confirmed: only remaining open anon in `public` = `onboarding_sessions`.

## Open — onboarding

See `.ai/bus/tasks/TASK-RLS-ONBOARDING-SESSION.md` (P0, not indefinite).

## Parked with Brief 17 — schema drift

`lead_assignment_rules`: code selects `agency_id` (`api/automation/rules/[id]/route.ts:19`)
but column absent in prod → `42703`. Same class as silent `cost_eur` failures.
**Do not fix inside onboarding PR** — migration drift wave.

## Conscious deny

`integration_settings`: 0 policies, 0 code refs — intentional; not a mailbox-settings regression.
