# Lead tables — authority card (2026-07-23)

**Status:** internal · **Owner:** engineering · **Review:** founder confirmed deprecated table

## Summary

Revolis CRM uses **two active lead stores** in application runtime plus one **deprecated legacy** table that may still exist in older Supabase environments.

| Table | Authority | Runtime usage (`apps/crm/src`) | Migration evidence |
|-------|-----------|--------------------------------|--------------------|
| `public.leads` | **Canonical CRM leads** — valuation widget (production), inbound, workdesk, BRI, Realvia import | Yes (primary) | `apps/crm/supabase/migrations/20260310_baseline_core_schema.sql` |
| `public.saas_leads` | **Canonical SaaS funnel** — `/proof`, demo booking, sales funnel | Yes (`sales-funnel-store.ts`) | `apps/crm/supabase/18_add_tasks_and_saas_leads.sql` |
| `public.revolis_leads` | **DEPRECATED legacy** — do not use in new code | **No** (0 references) | Not created in tracked migrations; allowlist + reporting scripts only |

## Rules

1. **New CRM lead intake** → always `public.leads` (unless explicit SaaS funnel scope).
2. **Public proof / demo booking** → `public.saas_leads` via `createSaasLead`.
3. **`revolis_leads`** → deprecated. Founder confirmed 2026-07-23: zero application usage. Legacy scripts (`realvia-volume-report.mjs`) and schema allowlist entries may remain until a separate cleanup PR; no new references.

## Brain / Memory Engine

`brain:audit` emits an advisory finding when deprecated tables have no application usage but remain documented in allowlists or ops scripts. This card is the canonical authority reference for that finding.

## Related decisions

- `memory/decisions.md` — BO-001 Proof of Value (`saas_leads`)
- `memory/decisions.md` — Sandbox demo + `lead_consents` (`leads` isolation)
