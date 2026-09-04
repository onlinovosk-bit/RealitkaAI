# RLS anon policies — APPLY evidence

**Applied:** 2026-09-04 (founder GO) via Supabase pply_migration name drop_open_anon_policies  
**Repo file:** pps/crm/supabase/migrations/20260904150000_drop_open_anon_policies.sql  
**Amendment in same wave:** lead_assignment_rules demo_* NEJASNÉ → ZRUŠIŤ  
**Deferred:** onboarding_sessions → .ai/bus/tasks/TASK-RLS-ONBOARDING-SESSION.md  
**Rollback:** docs/runbooks/rollback-anon-policies.md (ready, not used)

## Pre-apply path check

- Logged-in maklér: browser @supabase/ssr session → role uthenticated
- Kept activities policies: ctivities_insert_agency, ctivities_select_agency, ctivities_tenant_select, ctivities_tenant_write
- New: pipeline_moves_tenant_select, pipeline_moves_tenant_write
- Public no-session writes: service/admin (inbound, buyer-onboarding, webhooks)

## Post-apply verification (pg_policies)

### Remaining anon/demo on target tables
| Tabuľka | Politika | Poznámka |
|---|---|---|
| onboarding_sessions | Allow anon access (ALL) | Zámerne nedropnuté — TASK-RLS-ONBOARDING-SESSION |

Žiadne demo_*, *_anon_*, ani properties_anon_insert / matches_anon_legacy_all na cieľových tabuľkách.

### Remaining policies by table (expected)

| Tabuľka | Politik |
|---|---|
| integration_settings | *(žiadna — RLS deny pre anon/authenticated; 0 rows)* |
| lead_assignment_rules | *(žiadna — RLS deny; 0 rows)* |
| ctivities | ctivities_insert_agency, ctivities_select_agency, ctivities_tenant_select, ctivities_tenant_write (all uthenticated) |
| properties | properties_*_agency, properties_tenant (uthenticated) |
| lead_property_matches | lead_property_matches_agency, matches_*_agency |
| pipeline_moves | pipeline_moves_tenant_select, pipeline_moves_tenant_write (uthenticated) |
| onboarding_sessions | Allow anon access (non) — follow-up task |

## Governance note (Brief 17 vlna 1 input)

- Voľné SQL mimo migrations/: 27
- Aplikovaných v prod histórii pred touto vlnou: 48 / 100 súborov v repe
