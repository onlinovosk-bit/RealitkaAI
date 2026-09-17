# Lane A - Repo truth / reuse matrix (Revolis CRM)

**RUN_ID:** 2026-09-05T2308-CEST-research  
**BASE_SHA (task):** `cf3604613cdbb6a7a279e175f2c792fb25591461`  
**Worktree HEAD (observed):** `4ebb91fba58277cc696f4de66a4e9382b16e7313` (docs prep; BASE_SHA is ancestor)  
**Scope:** READ-ONLY repo inventory - brownfield CRM, not greenfield. No production runtime claims.

---

## Decisions

1. **Treat CRM as brownfield reuse surface.** Core tenant CRM entities (`agencies`, `profiles`, `leads`, `properties`, `activities`, `scheduled_events`) have CODE_PRESENT + schema migrations; do not redesign tables for overnight research.
2. **Capability status vocabulary is repo-evidence only:** `CODE_PRESENT` | `TEST_EVIDENCE` | `PROD_UNKNOWN` (plus documented in-repo config). Production liveness is never inferred from code alone.
3. **Deals are lead-pipeline semantics, not a first-class `public.deals` CRM table.** Open/at-risk deals map to lead statuses + deal-trigger/first-audit; `ai_sourced_deals` is a separate fee/AI table.
4. **Contacts are not a dedicated CRM contacts API.** Contact-like data lives on leads / property broker-owner fields / import fallbacks; no `/api/contacts` tree found.
5. **Phone audit path = call-analyzer (+ persist to activities) + workdesk first-audit (call targets), not a telephony CDR product.** No Twilio/phone-trunk integration proven in this pass.
6. **`.cursor/rules/revolis-builder.mdc` is MISSING** in this worktree and parent repo search (depth 5) - `AGENTS.md` still points to it → process drift.
7. **Migrations: exactly 102 `*.sql` files** under `apps/crm/supabase/migrations/`. Latest RLS/tenant-relevant filenames listed below; apply-state on PROD is PROD_UNKNOWN.
8. **Cron surface is split:** 27 `/api/cron/*/route.ts` handlers vs 16 scheduled entries in `apps/crm/vercel.json` - presence of route ≠ production schedule.

---

## Evidence

### Inventory anchors
| Metric | Value | Path |
|--------|-------|------|
| API `route.ts` count | 226 | `apps/crm/src/app/api/**` |
| SQL migrations | 102 | `apps/crm/supabase/migrations/*.sql` |
| Verification specs | 60 `*.verification.test.ts` (listed this pass) | `apps/crm/tests/verification/` |
| Vercel cron entries | 16 | `apps/crm/vercel.json` |
| Cron route handlers | 27 | `apps/crm/src/app/api/cron/**` |

### Capability reuse matrix

| Capability | Status | Repo evidence (summary) | Tests | Prod |
|------------|--------|-------------------------|-------|------|
| agencies / profiles / auth / tenant | CODE_PRESENT + TEST_EVIDENCE | Baseline tables `agencies`,`profiles`,`teams`; `src/lib/auth.ts` resolves `agency_id`; APIs `auth/login`, `profiles`, `crm/tenant-health`; RLS through profiles guards + anon policy drops | `profiles-role-agency-guard`, `onboarding-client-rls`, `customer-health-auth`, `proxy-session-gate` | PROD_UNKNOWN |
| properties | CODE_PRESENT + TEST_EVIDENCE | Baseline `properties`; API `properties`, `inventory`, `[id]`; RLS `20260508180000_rls_properties.sql` | `crm-lists-pagination`, `property-launch-pack-v0`, listing-content specs | PROD_UNKNOWN |
| leads / contacts | CODE_PRESENT + TEST_EVIDENCE (leads); contacts = fallback/import only | Baseline `leads`; rich `/api/leads/**`; contacts via `lib/leads/contacts-fallback.ts`, `lib/import/contacts-import-core.ts` - no contacts API tree | lead-* verification suite; contacts-fallback unit tests | PROD_UNKNOWN |
| deals | CODE_PRESENT (pipeline-on-leads) + partial schema | Deal UX/nav pipeline; `lib/agents/deal-trigger.ts`; `leads/[id]/deal-strategy`; `ai_sourced_deals` migration - **no `public.deals` CRM table found** | first-audit uses deal-trigger statuses | PROD_UNKNOWN |
| viewings / scheduled_events | CODE_PRESENT + schema RLS | `20260527143000_event_scheduler_phase1.sql` creates `scheduled_events` (`viewing` type); APIs `scheduled-events`, `playbook/confirm-viewing`; `lib/scheduled-events/store.ts` | calendly webhook/unit tests; dedicated scheduled-events verification not found this pass | PROD_UNKNOWN |
| activities | CODE_PRESENT + TEST_EVIDENCE (indirect) | Baseline `activities`; API `activities` + `leads/[id]/activities`; `lib/activities-store.ts` | RLS mig `20260507160000_rls_leads_activities.sql` | PROD_UNKNOWN |
| billing / program-tier-pricing | CODE_PRESENT + TEST_EVIDENCE | `lib/program-tier-pricing.ts`, `credits-billing.ts`; APIs `billing/*`, `hub/get-tier`; mig `20260602_agency_billing_and_credits.sql` | `billing-credits.verification.test.ts`, `program-tier-pricing.test.ts` | PROD_UNKNOWN |
| phone audit path | CODE_PRESENT + TEST_EVIDENCE | Dashboard `call-analyzer`; APIs `ai/call/analyze`, `transcribe`, `call-coach/stream`; persist `lib/workflows/call-analysis-persist.ts` → activities type Hovor; workdesk `first-audit` | `call-analyzer.verification.test.ts`, `first-audit.verification.test.ts` | PROD_UNKNOWN |
| portal adapters | CODE_PRESENT + TEST_EVIDENCE | Realvia `lib/realvia/**`; APIs `realvia/import`, `webhooks/realvia`, `cron/realvia-process`, `integrations/portal/import`; `PortalNehnutelnostiSource.ts`; parsers `bazos-parser`, `portal-parser` | `realvia-agency-scoped-source`, `realvia-honest-unknown-mapping` | PROD_UNKNOWN |
| jobs / crons | CODE_PRESENT + DOCUMENTED_SCHEDULE (subset) | 27 cron routes; 16 schedules in vercel.json | dashboard-insights-cron, follow-up-sweep, etc. | PROD_UNKNOWN |

### Latest relevant RLS / tenant migrations (by filename)
- `20260904220000_drop_onboarding_sessions_anon_all.sql`
- `20260904150000_drop_open_anon_policies.sql`
- `20260903070000_customer_health_daily.sql`
- `20260831233000_profiles_guard_account_tier_ui_role.sql`
- `20260830231500_profiles_guard_role_agency.sql`
- `20260827214500_leads_revoke_anon_table_privileges.sql`
- `20260816230000_prod_drift_profiles_leads.sql`
- `20260728140000_profiles_platform_admin.sql`
- `20260713140000_buyer_intents_tenant_rls.sql`
- `20260701120000_onboarding_client_tables_rls.sql`
- Wave A: `20260616123000_rls_wave_a_hardening.sql`, `20260616124500_rls_wave_a_leak_closure.sql`
- May cluster: `20260508220000_rls_agencies_profiles_teams.sql`, `20260508180000_rls_properties.sql`, `20260507160000_rls_leads_activities.sql`

### revolis-builder.mdc drift
- `apps/crm/AGENTS.md` step 2 references `.cursor/rules/revolis-builder.mdc`
- File **does not exist** in worktree `.cursor/rules/` (present: architecture, l99-*, revolis-api/db/ui, workflow)
- Also **not found** under parent repo depth-5 search
- **Drift:** Integration Report gate claimed by AGENTS.md is underspecified in-repo

---

## Assumptions

1. Worktree HEAD is a valid inventory superset relative to BASE_SHA (ancestor relationship confirmed); overnight freeze pointer remains BASE_SHA.
2. TEST_EVIDENCE means automated tests exist in repo, not that CI was green for this RUN_ID.
3. AGENTS.md "~205 routes" is stale vs observed 226 `route.ts` files.
4. Product vocabulary (contacts/deals) may map onto leads - reuse should follow the code model.

---

## Unknowns

1. Which of the 102 migrations are applied on production Supabase (PROD_UNKNOWN).
2. Whether Vercel production has the 16 vercel.json crons enabled; status of ~11 cron routes without schedule entries.
3. Live Stripe/billing webhook health and which `account_tier` / seat products are sold.
4. Whether Realvia/portal scraping runs in production for any paying agency.
5. Whether call-analyzer is used with real transcripts in production vs fixtures only.
6. Where `revolis-builder.mdc` was supposed to live (deleted / never committed / renamed).
7. Dedicated `contacts` / `deals` table existence in **remote** prod schema beyond migrations.

---

## Experiments

1. **Migration apply audit (read-only):** compare remote schema / migration list vs 102 files - APPLIED vs PENDING (needs credentials; out of Lane A).
2. **Cron coverage matrix:** for each of 27 cron routes, mark SCHEDULED | UNSCHEDULED | INVOKED_ELSEWHERE; verify Vercel project cron UI.
3. **Entity vocabulary probe:** information_schema for `deals`/`contacts` on staging.
4. **Builder rule recovery:** git history for revolis-builder.mdc; restore or retarget AGENTS.md to existing constitution/revolis-*.mdc.

---

## Product Implications

1. Overnight / Ruflo specs must **reuse** leads+activities+scheduled_events+properties+agency tenant - not invent parallel CRM cores.
2. Deal features should extend **lead status / deal-trigger / first-audit**, not assume a `deals` microservice.
3. Contact CRM features must clarify lead vs property-derived contact vs import path before new tables.
4. Phone/audit product narrative binds to **call-analyzer + activities persistence + first-audit**, with honest PROD_UNKNOWN on telephony.
5. Billing/tier work has a single pricing SoT file (`program-tier-pricing.ts`) - prefer editing there over new pricing modules.
6. Process risk: missing `revolis-builder.mdc` weakens Integration Report gate - fix docs/rules before large build waves.

---

## Decision Memory Payload (draft)

```yaml
lane: A
run_id: 2026-09-05T2308-CEST-research
base_sha: cf3604613cdbb6a7a279e175f2c792fb25591461
status: PASS_WITH_CONDITIONS
crm_posture: brownfield_reuse_not_greenfield
migration_count: 102
api_route_ts_count: 226
capabilities:
  agencies_profiles_auth_tenant: { code: true, tests: true, prod: unknown }
  properties: { code: true, tests: true, prod: unknown }
  leads: { code: true, tests: true, prod: unknown }
  contacts: { code: fallback_import_only, dedicated_api: false, prod: unknown }
  deals: { code: lead_pipeline_semantics, table_public_deals: false, ai_sourced_deals: true, prod: unknown }
  viewings_scheduled_events: { code: true, tests: partial, prod: unknown }
  activities: { code: true, tests: indirect, prod: unknown }
  billing_program_tier_pricing: { code: true, tests: true, prod: unknown }
  phone_audit_path: { code: call_analyzer_plus_first_audit, tests: true, telephony_integration: unproven, prod: unknown }
  portal_adapters: { code: true, tests: true, prod: unknown }
  jobs_crons: { handlers: 27, vercel_scheduled: 16, prod: unknown }
drift:
  revolis_builder_mdc: missing
  agents_md_references_builder: true
next_action: Freeze matrix at W1 gate; Lane B/C consume without inventing greenfield entities; open builder-rule restore/AGENTS fix as docs chore
```

---

## Status

**PASS_WITH_CONDITIONS** - matrix complete from repo evidence; all production runtime facts marked PROD_UNKNOWN; builder-rule drift documented.
