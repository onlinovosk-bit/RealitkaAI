# AMD-H2 — Tenant NULL bypass must cover leads + properties (supersedes BO-P1 scope)

**Finding:** F-H2 (Lane H, HIGH)
**RUN_ID:** `20260905T2304-ruflo-overnight`
**BASE_SHA:** `cf3604613cdbb6a7a279e175f2c792fb25591461`
**Action:** AMEND_SPEC
**Supersedes:** G BO-P1 wording that names only `properties_tenant` NULL bypass; soft reads of D5 as properties-only

## Fix (binding)

BO-P1 must explicitly:

1. Inventory **every** production-bound policy using `agency_id IS NULL` (at minimum `properties_tenant` and `leads_tenant`; activities policies that inherit via lead).
2. Backfill NULL `agency_id` rows **before** dropping the bypass.
3. Drop NULL OR branch on properties **and** leads; rewrite activities predicates accordingly.
4. Acceptance: second-agency JWT sees **0** NULL-agency properties **and** leads; WITH CHECK rejects NULL-agency writes after freeze.

## Evidence

| Claim | Path |
|---|---|
| Properties RLS NULL OR | `apps/crm/supabase/migrations/20260508180000_rls_properties.sql` |
| Leads RLS NULL OR (`leads_tenant`) | `apps/crm/supabase/migrations/20260507160000_rls_leads_activities.sql` |
| H finding | `lanes/H/report.md` F-H2 |

## Residual

- Spec under-scope repaired.
- **RLS unrepaired in code** => multi-tenant Cohort / pilot GO remains blocked.
- Prod apply / residual NULL rows still PROD_UNKNOWN (ops/founder).
