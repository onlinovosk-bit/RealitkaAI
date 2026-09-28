# V4-C prod migration-history audit (read-only)

**Lane:** Vlna 4 / V4-C  
**Date:** 2026-08-15  
**Scope:** compare local `apps/crm/supabase/migrations/*.sql` on `origin/main` against prod `supabase_migrations.schema_migrations`.  
**This document does not apply, repair, or push anything.**

## Explicit ban

**`supabase db push` na prod = zakázaný** until this history gap is resolved by a founder-reviewed repair plan.

A prod `db push` would treat every local filename version that is missing from remote history as pending. That is **49 files**, including objects that are already live (version skew + schema applied outside filename history). Re-running them can fail on existing constraints/policies or mutate live data.

Do **not** run `supabase db push`.  
Do **not** run `supabase migration repair` from this PR.  
Do **not** `INSERT`/`UPDATE`/`DELETE` on `supabase_migrations.schema_migrations` except as a later, explicit founder GO.

---

## 1. Counts (measured, 2026-08-15)

| Source | Count | When / how |
| --- | ---: | --- |
| Local SQL files (`apps/crm/supabase/migrations/*.sql` on `origin/main` @ `9109a73e`) | **94** | 2026-08-15, filesystem listing in this worktree |
| Prod history rows (`ypgajkhqtbriqqmyawyv`.`supabase_migrations.schema_migrations`) | **47** | 2026-08-15 14:40 Europe/Bratislava (12:40 UTC), MCP `execute_sql` SELECT |
| Exact **version** match (local filename prefix = history `version`) | **45** | derived |
| Table A — history `version` with **no** local filename | **2** | derived |
| Table B — local file with **no** matching history `version` | **49** | derived (= 94 − 45) |
| Pending if someone ran `db push` now | **~49** | CLI matches on `version`, not on `name` |

### Founder hypothesis vs measured

| Claim (treat as hypothesis) | Measured |
| --- | --- |
| Remote history was **46** rows | **47** rows now |
| Plus **+3** applied outside normal filename history | **3** outside-path applies exist (see below) |
| Therefore 94 files vs 46+3 history rows | **94 vs 47**, not 94 vs 49 |

Reconciliation (measured, not guessed):

- **44** history rows match local filename versions through `20260528103000_realvia_agency_ident_bracket_normalize.sql`.
- **+2** Management API applies with **apply-time versions, not filenames**: `valuation_estimates` / `system_usage_agency` (`created_by=onlinovo.sk@gmail.com`).
- **+1** `acquisition_core` via SQL Editor + `migration repair`: `version=20260811220000`, `name=acquisition_core`, `created_by=null` — this **does** match the local filename, so it is **not** Table A.
- 44 + 2 = **46** (likely the founder’s “46 rows” snapshot **before** `acquisition_core` was repaired into history). 46 + 1 = **47** today.
- The “+3” names the three outside-path applies; two of them were already inside that 46-row snapshot.

### Schema note (honest)

Requested query used `inserted_at`. That column **does not exist** on prod.

Actual columns: `version` (text, NOT NULL), `statements` (ARRAY), `name` (text), `created_by` (text), `idempotency_key` (text), `rollback` (ARRAY).

Query actually run:

```sql
SELECT version, name, created_by
FROM supabase_migrations.schema_migrations
ORDER BY version;
```

Additional **read-only** catalog probes (information_schema / pg_catalog / `list_tables`) were used only to mark Table C **measured vs inferred**. No INSERT/UPDATE/DELETE. No `apply_migration`. No `db push`.

---

## 2. Table A — history rows that do NOT match a local filename

These remote versions are **not** the timestamp prefix of any file in `apps/crm/supabase/migrations/`. They are applied-outside-filename / version skew.

| Remote `version` | `name` | `created_by` | Local filename (name match, different version) | Verdict |
| --- | --- | --- | --- | --- |
| `20260802134100` | `valuation_estimates` | `onlinovo.sk@gmail.com` | `20260731210000_valuation_estimates.sql` | **Version skew.** Management API apply-time version. Table `public.valuation_estimates` is live (2 rows). |
| `20260802134104` | `system_usage_agency` | `onlinovo.sk@gmail.com` | `20260731220000_system_usage_agency.sql` | **Version skew.** File is an `INSERT` of agency `00000000-0000-0000-0000-000000000001` (`Revolis System` / `revolis-system`). That row **is live**. |

### Outside-path but version **matches** (not Table A)

| Remote `version` | `name` | `created_by` | Local file | Notes |
| --- | --- | --- | --- | --- |
| `20260811220000` | `acquisition_core` | `null` | `20260811220000_acquisition_core.sql` | Founder: SQL Editor + `migration repair`. Version already equals filename. Tables `acquisition_accounts` / `acquisition_campaigns` / `acquisition_events` are live. **No version repair needed.** |

`created_by` is `null` on 45/47 rows. Only the two Management API rows carry `onlinovo.sk@gmail.com`.

---

## 3. Table B — local files with no matching history version

These 49 files would be treated as **pending** by `db push`. They either never ran, or ran under a **different** version (Table A), or were applied by SQL Editor / dashboard without a matching history row.

| # | Local file | Version prefix | Why it is Table B |
| ---: | --- | --- | --- |
| 1 | `2026_genome_layer2.sql` | `2026` | no history row |
| 2 | `20260310_baseline_core_schema.sql` | `20260310` | no history row |
| 3 | `20260527120000_stealth_recruiter_prospects.sql` | `20260527120000` | no history row (duplicate name vs #4/#5) |
| 4 | `20260529120000_stealth_recruiter_prospects.sql` | `20260529120000` | no history row |
| 5 | `20260531120000_stealth_recruiter_prospects_repair.sql` | `20260531120000` | no history row |
| 6 | `20260602_agency_billing_and_credits.sql` | `20260602` | no history row |
| 7 | `20260603_dashboard_insights_cache.sql` | `20260603` | no history row |
| 8 | `20260604120000_leads_imported_to_novy.sql` | `20260604120000` | no history row (data UPDATE) |
| 9 | `20260607210500_agencies_manual_plan.sql` | `20260607210500` | no history row |
| 10 | `20260608120000_universal_crm_import.sql` | `20260608120000` | no history row |
| 11 | `20260609130000_agencies_manual_plan_check.sql` | `20260609130000` | no history row |
| 12 | `20260609210000_routine_notifications.sql` | `20260609210000` | no history row |
| 13 | `20260609210001_import_jobs_fk_fix.sql` | `20260609210001` | no history row |
| 14 | `20260610000001_ai_action_audit.sql` | `20260610000001` | no history row |
| 15 | `20260611000000_realvia_json_import_source.sql` | `20260611000000` | no history row |
| 16 | `20260611000001_credit_ledger_source.sql` | `20260611000001` | no history row |
| 17 | `20260611000002_ai_action_audit_cost.sql` | `20260611000002` | no history row |
| 18 | `20260611000003_spend_credits.sql` | `20260611000003` | no history row |
| 19 | `20260611000004_ai_cost_daily.sql` | `20260611000004` | no history row |
| 20 | `20260612000000_demo_ops.sql` | `20260612000000` | no history row |
| 21 | `20260612120000_morning_brief_content_source.sql` | `20260612120000` | no history row |
| 22 | `20260613000000_rls_credit_ledger_action_scores.sql` | `20260613000000` | no history row |
| 23 | `20260613000001_rls_audit_snapshot_rpc.sql` | `20260613000001` | no history row |
| 24 | `20260613000002_service_role_table_grants.sql` | `20260613000002` | no history row (grants; not fully verified) |
| 25 | `20260614213000_enrichment_log_and_contacts_dossier.sql` | `20260614213000` | no history row |
| 26 | `20260614220000_add_leads_dossier.sql` | `20260614220000` | no history row |
| 27 | `20260615000000_credit_redemption_codes.sql` | `20260615000000` | no history row |
| 28 | `20260615102500_fix_enrichment_log_rls_profiles_permission.sql` | `20260615102500` | no history row (depends on #25) |
| 29 | `20260615104000_grant_enrichment_log_table_privileges.sql` | `20260615104000` | no history row (depends on #25) |
| 30 | `20260616070500_realsoft_import_adapter.sql` | `20260616070500` | no history row |
| 31 | `20260616103500_realsoft_auth_hash_hardening.sql` | `20260616103500` | no history row |
| 32 | `20260616123000_rls_wave_a_hardening.sql` | `20260616123000` | no history row |
| 33 | `20260616124500_rls_wave_a_leak_closure.sql` | `20260616124500` | no history row |
| 34 | `20260617120000_uc_export_mapper.sql` | `20260617120000` | no history row |
| 35 | `20260618120000_realsoft_import_logs_upsert_constraint.sql` | `20260618120000` | no history row |
| 36 | `20260629120000_acquire_dedup_keys.sql` | `20260629120000` | no history row |
| 37 | `20260701120000_onboarding_client_tables_rls.sql` | `20260701120000` | no history row |
| 38 | `20260713140000_buyer_intents_tenant_rls.sql` | `20260713140000` | no history row |
| 39 | `20260713150000_inbound_auto_response.sql` | `20260713150000` | no history row |
| 40 | `20260713160000_agencies_contact_columns.sql` | `20260713160000` | no history row |
| 41 | `20260720193000_valuation_tenants.sql` | `20260720193000` | no history row |
| 42 | `20260721120000_leads_gdpr_consent.sql` | `20260721120000` | no history row |
| 43 | `20260722120000_sandbox_gdpr_consent.sql` | `20260722120000` | no history row |
| 44 | `20260726120000_moat_capture_blok_b.sql` | `20260726120000` | no history row |
| 45 | `20260727120000_guardian_v1_blok_c.sql` | `20260727120000` | no history row |
| 46 | `20260728140000_profiles_platform_admin.sql` | `20260728140000` | no history row |
| 47 | `20260731210000_valuation_estimates.sql` | `20260731210000` | ran under **`20260802134100`** (Table A) |
| 48 | `20260731220000_system_usage_agency.sql` | `20260731220000` | ran under **`20260802134104`** (Table A) |
| 49 | `20260803120000_ai_generations.sql` | `20260803120000` | no history row |

`20260811220000_acquisition_core.sql` is **not** in Table B (version matches).

---

## 4. Table C — likely already-live objects among Table B

Confidence: **measured** = object/column/constraint probed on prod 2026-08-15. **inferred** = filename / founder statement only.

Repairing history (`migration repair --status applied`) does **not** run SQL. Marking a file applied while its objects are missing would skip a real schema gap forever.

### C1. Version-skew — objects live, history version wrong (measured)

| Local file | Probe | Result | Confidence |
| --- | --- | --- | --- |
| `20260731210000_valuation_estimates.sql` | table `public.valuation_estimates` | exists, 2 rows; history name matches under `20260802134100` | **measured** |
| `20260731220000_system_usage_agency.sql` | `agencies.id = 00000000-0000-0000-0000-000000000001` | row exists (`Revolis System` / `revolis-system`, `is_active=false`) | **measured** |

`db push` would try these **again** under filename versions. High risk even with `IF NOT EXISTS` / `ON CONFLICT` — do not push.

### C2. Signature objects live without matching history (measured)

These files (or equivalent SQL) almost certainly ran outside filename history. Full statement-by-statement equality with the local file is **not** proven.

| Local file | Signature object | Prod | Confidence |
| --- | --- | --- | --- |
| `2026_genome_layer2.sql` | `public.decisions`, `public.exclusivity_outcomes` | tables exist (`decisions` 241 rows) | **measured** (tables); file completeness **inferred** |
| `20260310_baseline_core_schema.sql` | `leads`, `activities`, `properties` | exist (480 / 185 / 127 rows) | **measured** (core tables); demo policies **not** fully audited |
| `20260527120000` / `20260529120000` / `20260531120000` stealth trio | `stealth_recruiter_prospects` | table exists; policies `stealth_recruiter_prospects_tenant` **and** `tenant_isolation` | **measured** table; **which of the 3 files** is live = founder review (overlapping CREATE TABLE IF NOT EXISTS) |
| `20260602_agency_billing_and_credits.sql` | `credit_ledger` | exists (2 rows) | **measured** |
| `20260603_dashboard_insights_cache.sql` | `dashboard_insights_cache` | exists (3 rows) | **measured** |
| `20260607210500_agencies_manual_plan.sql` | `agencies.manual_plan` + index `agencies_manual_plan_idx` | both exist | **measured** |
| `20260608120000_universal_crm_import.sql` | `import_jobs`, `import_rows`, `migration_cases` | all exist | **measured** |
| `20260609130000_agencies_manual_plan_check.sql` | constraint `agencies_manual_plan_check` | exists with expected plan keys | **measured** |
| `20260609210000_routine_notifications.sql` | `routine_notifications` | exists (89 rows) | **measured** |
| `20260610000001_ai_action_audit.sql` | `ai_action_audit` | exists (30 rows) | **measured** |
| `20260611000001_credit_ledger_source.sql` | `credit_ledger.source`, `agencies.grant_credits_balance`, `purchased_credits_balance`, `cockpit_tier` | columns exist | **measured** |
| `20260611000003_spend_credits.sql` | function `spend_credits` | exists | **measured** |
| `20260613000001_rls_audit_snapshot_rpc.sql` | function `rls_audit_snapshot` | exists | **measured** |
| `20260616070500_realsoft_import_adapter.sql` | `realsoft_import_logs` | exists | **measured** |
| `20260616103500_realsoft_auth_hash_hardening.sql` | `resolve_agency_id_for_realsoft_credentials` | exists | **measured** |
| `20260618120000_realsoft_import_logs_upsert_constraint.sql` | UNIQUE `uq_realsoft_import_logs_dedupe (agency_id, action, external_id)` | exists | **measured** |
| `20260629120000_acquire_dedup_keys.sql` | `acquire_dedup_keys` | exists (22 rows) | **measured** |
| `20260701120000_onboarding_client_tables_rls.sql` | policy `service_role_only` on onboarding tables | exists | **measured** |
| `20260713140000_buyer_intents_tenant_rls.sql` | `buyer_intents` + policy `buyer_intents_agency` | table + policy exist (`buyer_intents` 3 rows; `buyer_events` exists) | **measured** |
| `20260713150000_inbound_auto_response.sql` | `leads.auto_response_sent_at`, `agencies.auto_response_enabled` | both exist | **measured** |
| `20260713160000_agencies_contact_columns.sql` | `agencies.email`, `agencies.phone` | both exist | **measured** |
| `20260720193000_valuation_tenants.sql` | `valuation_tenants` + `get_valuation_tenant` | table (2 rows) + function exist | **measured** |
| `20260721120000_leads_gdpr_consent.sql` | `leads.gdpr_consent_at`, `gdpr_consent_version` | both exist | **measured** |
| `20260722120000_sandbox_gdpr_consent.sql` | `sandbox_submissions`, `lead_consents` | both exist | **measured** |
| `20260726120000_moat_capture_blok_b.sql` | `deal_outcomes`, `moat_ai_recommendations` | both exist | **measured** |
| `20260727120000_guardian_v1_blok_c.sql` | `guardian_findings` | exists (29 rows) | **measured** |

### C3. Signature objects **missing** — do not mark applied (measured)

`db push` of these would create **new** objects (or alter existing ones). That may be intended later — it is **not** a history-only repair.

| Local file | Expected object | Prod | Confidence |
| --- | --- | --- | --- |
| `20260609210001_import_jobs_fk_fix.sql` | FK `ON DELETE SET NULL` | FK exists with `confdeltype=a` (**NO ACTION**), not SET NULL | **measured not applied** |
| `20260611000000_realvia_json_import_source.sql` | `import_jobs_source_check` includes `realvia-json` | check exists **without** `realvia-json` | **measured not applied** |
| `20260611000002_ai_action_audit_cost.sql` | `ai_action_audit.cost_eur`, `credits_spent`; view `ai_action_daily_agency` | columns/view not found | **measured not applied** |
| `20260611000004_ai_cost_daily.sql` | `ai_action_audit.model`, `latency_ms`; view `ai_cost_daily` | not found | **measured not applied** |
| `20260612000000_demo_ops.sql` | `demo_prospects`, `demo_bookings` | tables not found | **measured not applied** |
| `20260612120000_morning_brief_content_source.sql` | `morning_briefs.content_source` | column not found | **measured not applied** |
| `20260614213000_enrichment_log_and_contacts_dossier.sql` | `enrichment_log` | table not found | **measured not applied** |
| `20260614220000_add_leads_dossier.sql` | `leads.dossier` | column not found | **measured not applied** |
| `20260615000000_credit_redemption_codes.sql` | `credit_redemption_codes` | table not found | **measured not applied** |
| `20260615102500` / `20260615104000` | enrichment_log RLS/grants | blocked by missing table | **measured not applied** |
| `20260617120000_uc_export_mapper.sql` | `profiles.import_source_id` + unique index | column/index not found | **measured not applied** |
| `20260728140000_profiles_platform_admin.sql` | `profiles.is_platform_admin` + trigger | column and trigger not found | **measured not applied** |
| `20260803120000_ai_generations.sql` | `ai_generations` | table not found | **measured not applied** |

### C4. Weak / mixed — founder review (measured weakly or only inferred)

| Local file | Evidence | Confidence |
| --- | --- | --- |
| `20260604120000_leads_imported_to_novy.sql` | `UPDATE` status `'imported'` → `'Nový'`. Prod: 0 `imported`, 480 `Nový`-like. Could be the migration **or** leads never used `imported`. | **inferred / weak** |
| `20260613000000_rls_credit_ledger_action_scores.sql` | `credit_ledger` exists; `lead_action_scores` table **not** found. File mixes ledger RLS + another table. | **mixed — founder review** |
| `20260613000002_service_role_table_grants.sql` | GRANT ALL / default privileges. Not verified (would need `information_schema.role_table_grants`). | **inferred** |
| `20260616123000_rls_wave_a_hardening.sql` | Dynamic policy creation. Not statement-audited. | **inferred** |
| `20260616124500_rls_wave_a_leak_closure.sql` | Named policies on leads/properties. Tenant policies exist from earlier May RLS history; this file may be additive or redundant. | **inferred** |

---

## 5. Proposed `migration repair` commands — **text only, do not execute**

`migration repair` updates **history only**. It does not apply or revert SQL. Source: [Supabase database migrations](https://supabase.com/docs/guides/deployment/database-migrations).

Syntax:

```text
supabase migration repair --status reverted <version>
supabase migration repair --status applied <version>
```

Run only against the **linked prod** project after founder GO. Never from CI. Never bundled with `db push`.

### 5.1 Safer (history rewrite for proven version skew)

Goal: remote `version` equals local filename for the two Management API applies, **without** re-running SQL.

Order matters: revert apply-time versions first so you do not keep duplicate names with two versions.

```text
# TEXT ONLY — do not execute
# Project: ypgajkhqtbriqqmyawyv
# Preconditions (already measured 2026-08-15):
#   public.valuation_estimates exists
#   agencies 00000000-0000-0000-0000-000000000001 exists

supabase migration repair --status reverted 20260802134100
supabase migration repair --status applied 20260731210000

supabase migration repair --status reverted 20260802134104
supabase migration repair --status applied 20260731220000
```

After that, `db push` would **stop** seeing those two files as pending. It would **still** see the other 47 Table B files. **`db push` remains forbidden.**

`acquisition_core`: **no repair**. Version already matches.

### 5.2 Needs founder review (do not batch-apply)

Mark `--status applied` **only** after a per-file SQL vs live-schema check (or after deliberately applying the SQL once). Candidate versions whose signature objects are live (C2), still requiring a completeness check:

```text
# TEXT ONLY — founder review required per version
# Do not paste this list into a single repair without checking leftover ALTERs/policies.

supabase migration repair --status applied 2026
supabase migration repair --status applied 20260310
# stealth trio: pick the file that matches live indexes/policies, not all three
supabase migration repair --status applied 20260527120000
supabase migration repair --status applied 20260529120000
supabase migration repair --status applied 20260531120000
supabase migration repair --status applied 20260602
supabase migration repair --status applied 20260603
supabase migration repair --status applied 20260607210500
supabase migration repair --status applied 20260608120000
supabase migration repair --status applied 20260609130000
supabase migration repair --status applied 20260609210000
supabase migration repair --status applied 20260610000001
supabase migration repair --status applied 20260611000001
supabase migration repair --status applied 20260611000003
supabase migration repair --status applied 20260613000001
supabase migration repair --status applied 20260616070500
supabase migration repair --status applied 20260616103500
supabase migration repair --status applied 20260618120000
supabase migration repair --status applied 20260629120000
supabase migration repair --status applied 20260701120000
supabase migration repair --status applied 20260713140000
supabase migration repair --status applied 20260713150000
supabase migration repair --status applied 20260713160000
supabase migration repair --status applied 20260720193000
supabase migration repair --status applied 20260721120000
supabase migration repair --status applied 20260722120000
supabase migration repair --status applied 20260726120000
supabase migration repair --status applied 20260727120000
```

Stealth trio risk: marking all three applied claims three migrations ran; only one table exists. Prefer **one** applied + two left pending **or** squash/docs decision.

### 5.3 Do **not** repair as applied (schema gap still open)

These should stay pending until SQL is applied in a **controlled, one-file** process (SQL Editor or a future dedicated PR) — **not** via `db push` of the whole 49.

```text
# Do NOT mark applied — objects/columns missing or definition differs (measured)

20260609210001   # import_jobs FK still NO ACTION, not SET NULL
20260611000000   # realvia-json missing from import_jobs_source_check
20260611000002   # ai_action_audit cost columns / daily view missing
20260611000004   # model/latency_ms + ai_cost_daily missing
20260612000000   # demo_prospects / demo_bookings missing
20260612120000   # morning_briefs.content_source missing
20260614213000   # enrichment_log missing
20260614220000   # leads.dossier missing
20260615000000   # credit_redemption_codes missing
20260615102500   # depends on enrichment_log
20260615104000   # depends on enrichment_log
20260617120000   # profiles.import_source_* missing
20260728140000   # is_platform_admin missing
20260803120000   # ai_generations missing
```

Weak/mixed (C4): `20260604120000`, `20260613000000`, `20260613000002`, `20260616123000`, `20260616124500` — founder decides after a policy/grant dump.

---

## 6. `db push` na prod = zakázaný

If `db push` ran today it would attempt approximately:

**49 local versions not in remote history**, including:

1. Re-apply `valuation_estimates` / `system_usage_agency` under **filename** versions while they are already live under **apply-time** versions.
2. Re-create or alter dozens of June–July objects that are already live (`credit_ledger`, `import_jobs`, `guardian_findings`, …). `IF NOT EXISTS` is not a guarantee: `CREATE POLICY` without drop, `ADD CONSTRAINT`, and data `UPDATE`s can fail or mutate prod.
3. Also apply genuine gaps (`ai_generations`, `enrichment_log`, platform-admin, …) in the **same unordered blast** as the already-live set.

That is the failure mode this lane exists to prevent.

**Allowed later (not this PR):** per-file SQL apply + verify + then `migration repair --status applied` for that one version, under founder GO.

---

## 7. Honest gaps

| Gap | Impact |
| --- | --- |
| `inserted_at` does not exist | Could not sort/filter by apply time; used `version` + `created_by` only |
| `statements` ARRAY not dumped | Did not compare stored SQL vs local files for the 47 history rows (payload size / noise) |
| RLS / GRANT completeness | Wave A hardening, service_role grants, and overlapping stealth policies were not statement-diffed |
| Data migration `imported` → `Nový` | 0 remaining `imported` is weak evidence |
| TEST project `ndfytadjboqvtsrpdyby` | Not queried (out of scope) |
| Local vs prod function bodies | Existence checked; `CREATE OR REPLACE` drift not hashed |
| This PR | Docs only. Repair commands are text. Nothing was executed on prod beyond SELECT / `list_tables` / `list_migrations` |

---

## Appendix A — all 94 local SQL files (`origin/main`)

Listed in filesystem name order as of 2026-08-15. Flag: **match** = history `version` equals filename prefix.

| # | File | History |
| ---: | --- | --- |
| 1 | `2026_genome_layer2.sql` | Table B |
| 2 | `20260310_baseline_core_schema.sql` | Table B |
| 3 | `20260320_rls.sql` | match |
| 4 | `20260411_performance_fee.sql` | match |
| 5 | `20260412_activity_stream_view.sql` | match |
| 6 | `20260413_ai_insight_alias.sql` | match |
| 7 | `20260418_enterprise_ai_intelligence.sql` | match |
| 8 | `20260419_enterprise_rls_profile_link.sql` | match |
| 9 | `20260424_google_calendar_oauth.sql` | match |
| 10 | `20260425231407_event_pipeline.sql` | match |
| 11 | `20260425231426_bri_live_score.sql` | match |
| 12 | `20260426114846_morning_brief.sql` | match |
| 13 | `20260426120111_arbitrage_engine.sql` | match |
| 14 | `20260426121525_price_trail.sql` | match |
| 15 | `20260426133000_ghost_monitor.sql` | match |
| 16 | `20260426143000_broker_trust_protocol.sql` | match |
| 17 | `20260426150000_bsm_reforma_campaign.sql` | match |
| 18 | `20260426170000_demand_data_moat.sql` | match |
| 19 | `20260426183000_competitor_sleep_detector.sql` | match |
| 20 | `20260426193000_b2b_data_api.sql` | match |
| 21 | `20260426203000_ai_coaching_engine.sql` | match |
| 22 | `20260426210000_developer_api_onboarding.sql` | match |
| 23 | `20260428130500_onboarding_mvp.sql` | match |
| 24 | `20260428164000_demo_prefill_links.sql` | match |
| 25 | `20260428214500_leads_indexes.sql` | match |
| 26 | `20260429111000_decision_intelligence_core.sql` | match |
| 27 | `20260502000000_push_subscriptions.sql` | match |
| 28 | `20260504000000_onboarding_checklist_v2.sql` | match |
| 29 | `20260504100000_rate_limit_buckets.sql` | match |
| 30 | `20260504200000_automat_onboarding_schema.sql` | match |
| 31 | `20260507120000_outreach_campaigns.sql` | match |
| 32 | `20260507140000_rls_decision_tables.sql` | match |
| 33 | `20260507150000_outreach_segments_templates.sql` | match |
| 34 | `20260507160000_rls_leads_activities.sql` | match |
| 35 | `20260508180000_rls_properties.sql` | match |
| 36 | `20260508200000_profile_integrations.sql` | match |
| 37 | `20260508210000_rls_tasks_recommendations.sql` | match |
| 38 | `20260508220000_rls_agencies_profiles_teams.sql` | match |
| 39 | `20260508230000_rls_lead_property_matches.sql` | match |
| 40 | `20260509000000_rls_lead_scores.sql` | match |
| 41 | `20260512103000_realvia_agency_credentials_metrics.sql` | match |
| 42 | `20260512174500_realvia_schema_health_rpc.sql` | match |
| 43 | `20260514120000_architect_workflows_leads_columns.sql` | match |
| 44 | `20260523183000_resolve_agency_id_for_realvia_rpc.sql` | match |
| 45 | `20260527120000_stealth_recruiter_prospects.sql` | Table B |
| 46 | `20260527143000_event_scheduler_phase1.sql` | match |
| 47 | `20260528103000_realvia_agency_ident_bracket_normalize.sql` | match |
| 48 | `20260529120000_stealth_recruiter_prospects.sql` | Table B |
| 49 | `20260531120000_stealth_recruiter_prospects_repair.sql` | Table B |
| 50 | `20260602_agency_billing_and_credits.sql` | Table B |
| 51 | `20260603_dashboard_insights_cache.sql` | Table B |
| 52 | `20260604120000_leads_imported_to_novy.sql` | Table B |
| 53 | `20260607210500_agencies_manual_plan.sql` | Table B |
| 54 | `20260608120000_universal_crm_import.sql` | Table B |
| 55 | `20260609130000_agencies_manual_plan_check.sql` | Table B |
| 56 | `20260609210000_routine_notifications.sql` | Table B |
| 57 | `20260609210001_import_jobs_fk_fix.sql` | Table B |
| 58 | `20260610000001_ai_action_audit.sql` | Table B |
| 59 | `20260611000000_realvia_json_import_source.sql` | Table B |
| 60 | `20260611000001_credit_ledger_source.sql` | Table B |
| 61 | `20260611000002_ai_action_audit_cost.sql` | Table B |
| 62 | `20260611000003_spend_credits.sql` | Table B |
| 63 | `20260611000004_ai_cost_daily.sql` | Table B |
| 64 | `20260612000000_demo_ops.sql` | Table B |
| 65 | `20260612120000_morning_brief_content_source.sql` | Table B |
| 66 | `20260613000000_rls_credit_ledger_action_scores.sql` | Table B |
| 67 | `20260613000001_rls_audit_snapshot_rpc.sql` | Table B |
| 68 | `20260613000002_service_role_table_grants.sql` | Table B |
| 69 | `20260614213000_enrichment_log_and_contacts_dossier.sql` | Table B |
| 70 | `20260614220000_add_leads_dossier.sql` | Table B |
| 71 | `20260615000000_credit_redemption_codes.sql` | Table B |
| 72 | `20260615102500_fix_enrichment_log_rls_profiles_permission.sql` | Table B |
| 73 | `20260615104000_grant_enrichment_log_table_privileges.sql` | Table B |
| 74 | `20260616070500_realsoft_import_adapter.sql` | Table B |
| 75 | `20260616103500_realsoft_auth_hash_hardening.sql` | Table B |
| 76 | `20260616123000_rls_wave_a_hardening.sql` | Table B |
| 77 | `20260616124500_rls_wave_a_leak_closure.sql` | Table B |
| 78 | `20260617120000_uc_export_mapper.sql` | Table B |
| 79 | `20260618120000_realsoft_import_logs_upsert_constraint.sql` | Table B |
| 80 | `20260629120000_acquire_dedup_keys.sql` | Table B |
| 81 | `20260701120000_onboarding_client_tables_rls.sql` | Table B |
| 82 | `20260713140000_buyer_intents_tenant_rls.sql` | Table B |
| 83 | `20260713150000_inbound_auto_response.sql` | Table B |
| 84 | `20260713160000_agencies_contact_columns.sql` | Table B |
| 85 | `20260720193000_valuation_tenants.sql` | Table B |
| 86 | `20260721120000_leads_gdpr_consent.sql` | Table B |
| 87 | `20260722120000_sandbox_gdpr_consent.sql` | Table B |
| 88 | `20260726120000_moat_capture_blok_b.sql` | Table B |
| 89 | `20260727120000_guardian_v1_blok_c.sql` | Table B |
| 90 | `20260728140000_profiles_platform_admin.sql` | Table B |
| 91 | `20260731210000_valuation_estimates.sql` | Table B (live under Table A version) |
| 92 | `20260731220000_system_usage_agency.sql` | Table B (live under Table A version) |
| 93 | `20260803120000_ai_generations.sql` | Table B |
| 94 | `20260811220000_acquisition_core.sql` | match (SQL Editor + repair; `created_by=null`) |

---

## Appendix B — all 47 prod history rows (measured)

| `version` | `name` | `created_by` |
| --- | --- | --- |
| `20260320` | `rls` | `null` |
| `20260411` | `performance_fee` | `null` |
| `20260412` | `activity_stream_view` | `null` |
| `20260413` | `ai_insight_alias` | `null` |
| `20260418` | `enterprise_ai_intelligence` | `null` |
| `20260419` | `enterprise_rls_profile_link` | `null` |
| `20260424` | `google_calendar_oauth` | `null` |
| `20260425231407` | `event_pipeline` | `null` |
| `20260425231426` | `bri_live_score` | `null` |
| `20260426114846` | `morning_brief` | `null` |
| `20260426120111` | `arbitrage_engine` | `null` |
| `20260426121525` | `price_trail` | `null` |
| `20260426133000` | `ghost_monitor` | `null` |
| `20260426143000` | `broker_trust_protocol` | `null` |
| `20260426150000` | `bsm_reforma_campaign` | `null` |
| `20260426170000` | `demand_data_moat` | `null` |
| `20260426183000` | `competitor_sleep_detector` | `null` |
| `20260426193000` | `b2b_data_api` | `null` |
| `20260426203000` | `ai_coaching_engine` | `null` |
| `20260426210000` | `developer_api_onboarding` | `null` |
| `20260428130500` | `onboarding_mvp` | `null` |
| `20260428164000` | `demo_prefill_links` | `null` |
| `20260428214500` | `leads_indexes` | `null` |
| `20260429111000` | `decision_intelligence_core` | `null` |
| `20260502000000` | `push_subscriptions` | `null` |
| `20260504000000` | `onboarding_checklist_v2` | `null` |
| `20260504100000` | `rate_limit_buckets` | `null` |
| `20260504200000` | `automat_onboarding_schema` | `null` |
| `20260507120000` | `outreach_campaigns` | `null` |
| `20260507140000` | `rls_decision_tables` | `null` |
| `20260507150000` | `outreach_segments_templates` | `null` |
| `20260507160000` | `rls_leads_activities` | `null` |
| `20260508180000` | `rls_properties` | `null` |
| `20260508200000` | `profile_integrations` | `null` |
| `20260508210000` | `rls_tasks_recommendations` | `null` |
| `20260508220000` | `rls_agencies_profiles_teams` | `null` |
| `20260508230000` | `rls_lead_property_matches` | `null` |
| `20260509000000` | `rls_lead_scores` | `null` |
| `20260512103000` | `realvia_agency_credentials_metrics` | `null` |
| `20260512174500` | `realvia_schema_health_rpc` | `null` |
| `20260514120000` | `architect_workflows_leads_columns` | `null` |
| `20260523183000` | `resolve_agency_id_for_realvia_rpc` | `null` |
| `20260527143000` | `event_scheduler_phase1` | `null` |
| `20260528103000` | `realvia_agency_ident_bracket_normalize` | `null` |
| `20260802134100` | `valuation_estimates` | `onlinovo.sk@gmail.com` |
| `20260802134104` | `system_usage_agency` | `onlinovo.sk@gmail.com` |
| `20260811220000` | `acquisition_core` | `null` |

---

## Closure

- **Changed:** this report only.
- **Verified:** 94 local files; 47 prod history rows via SELECT; Table A/B/C as above.
- **Still risky:** any prod `db push`; any batch `migration repair --status applied` over C3/C4 files.
