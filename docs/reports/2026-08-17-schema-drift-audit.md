# Schema-drift audit — 2026-08-17 (L38)

**Status:** audit-only. **No database writes.** Proposed SQL below was **not executed**.
**Lane:** L38. **STOP** after this PR. Founder merges. Do not apply ALTERs from this document without a separate GO.

This report compares columns/tables the CRM code reads and writes against the **production** Revolis Supabase schema. It also records migration-history drift and the L35 guardian unique finding.

## Scope and method

| Item | Value |
|---|---|
| Audit date | 2026-08-17 |
| Code base | `origin/main` @ `2331d1296` (`fix(crm): throttle profile tier writes (L34) #432`) |
| Production project | `ypgajkhqtbriqqmyawyv` (`onlinovosk-bit's Project`, `eu-west-1`, Postgres 17.6) |
| How identified | `apps/crm/.env.example` → `https://ypgajkhqtbriqqmyawyv.supabase.co`; MCP `get_project` confirmed ACTIVE_HEALTHY |
| MCP | `plugin-supabase-supabase` (read-only): `get_project`, `list_tables` (verbose), `list_migrations`, `list_extensions`, `get_advisors` (security), `execute_sql` SELECT-only against `information_schema` / `pg_catalog` / `pg_indexes` / `supabase_migrations.schema_migrations` |
| MCP blocked | `user-supabase` returned Unauthorized. Per instructions: **no `mcp_auth` loop**. Index/column introspection still completed via `plugin-supabase-supabase`. |
| Code inventory | `apps/crm` `.from("…")` + chained `.select` / `.eq` / `.insert` / `.update` / `.upsert` (runtime `src/` + `supabase/functions/`) |
| Not in this PR | No ALTERs applied. No L37 genome rename. No Stage 1. No `memory/` writes. |

**This is incomplete only for:** objects outside `public` that the app does not query; PostgREST embed aliases mistaken for columns (filtered out below); historical Dashboard DDL whose SQL is not in `schema_migrations`.

Cowork source: founder report 16.8.2026 (schema drift ~46/95 migrations; manual ALTERs on `profiles`/`leads`; follow-up = this audit + guardian unique from L35).

---

## High-level findings

| Signal | Count |
|---|---|
| Local migration files (`apps/crm/supabase/migrations`) | **95** |
| Rows in prod `supabase_migrations.schema_migrations` | **47** |
| Local files with no matching prod history row | **50** |
| Prod `public` tables (`list_tables`) | **108** |
| Prod `public` columns (`information_schema.columns`) | **1292** across **116** relations (tables + views) |
| Runtime `.from("…")` tables in CRM code | **115** |
| Confirmed **missing columns** on existing tables (high-confidence) | **~18** (hottest: `leads`, `profiles`, `ai_action_audit`) |
| Confirmed **missing tables** the runtime still queries | **≥9** (hottest: `scheduled_events`, `ai_generations`, `enrichment_log`) |
| Guardian unique `guardian_open_unique` | **PRESENT on prod** (DDL not in migration history) |

**Hottest tables (code expects, prod lacks):**

1. **`leads`** — `last_contact_at`, `bri_score`, `dossier`, `hubspot_contact_id` (42703 risk on dashboard / daily-actions / shadow-inventory / HubSpot sync).
2. **`profiles`** — `is_platform_admin`, `l99_slots_*`, `ai_tone`, `enterprise_onboarded_at` (operator gate + licensing writes).
3. **`ai_action_audit`** — `cost_eur`, `credits_spent`, `model`, `latency_ms`.
4. **Missing table `scheduled_events`** — migration `20260527143000_event_scheduler_phase1` is **recorded as applied**, but `to_regclass('public.scheduled_events')` is **NULL**. History lie + missing object.

16.8 founder Dashboard ALTERs (`tier_updated_at`, `sofia_insight`, `is_active`, `last_contact` text, AI triage columns, etc.) **are present** on prod. They are **not** in `schema_migrations`. Remaining hole vs that wave: code still selects **`last_contact_at`** (timestamptz semantics); prod has **`last_contact` text** only.

---

## Differences — code expects vs prod has

Legend: **Missing** = 42703 / relation-not-found risk. **Present** = confirmed on prod. **Mismatch** = different name or type; do not ADD blindly.

### `public.leads`

| Code expects | Prod has | Verdict |
|---|---|---|
| `last_contact_at` (used as ISO timestamptz in `.select` / `.lt` / `.or`) | **no** — has `last_contact text` (`'Práve vytvorený'`) | **Missing + type mismatch.** Repo baseline never defined `last_contact_at`. |
| `bri_score` | **no** | **Missing.** In `20260310_baseline_core_schema.sql` (unrecorded). Index migration `20260428214500` is recorded but only creates `idx_leads_bri_score` *if the column exists* — it does not; prod leads indexes are only `leads_pkey`, `idx_leads_agency_id`, `leads_embedding_idx`. |
| `dossier` jsonb | **no** | **Missing.** File `20260614220000_add_leads_dossier.sql` unrecorded. |
| `hubspot_contact_id` | **no** | **Missing.** Written by `src/app/api/integrations/hubspot/sync/route.ts`. |
| `sofia_insight`, `is_active`, `ai_insight`, `ai_engine`, `ai_priority`, `ai_reason`, `ai_triage_at`, `ai_priority_manual_at`, `last_ai_followup_at`, `ai_followup_count`, `client_segment`, `buyer_readiness_score`, `assigned_profile_id`, `last_contact` (text), `note`, `financing`, `timeline`, `property_type`, `rooms` | **yes** | Present (16.8 manual ALTER + older columns). |
| `gdpr_consent_at`, `gdpr_consent_version` | **yes** | Present even though `20260721120000_leads_gdpr_consent.sql` is unrecorded (out-of-band). |

### `public.profiles`

| Code expects | Prod has | Verdict |
|---|---|---|
| `tier_updated_at` | **yes** (`timestamptz`, nullable) | Present (16.8 ALTER). Live select in `resolve-profile-for-auth.ts`. |
| `is_platform_admin` | **no** | **Missing.** `src/lib/operator/access.ts` `.select("is_platform_admin")`. Migration `20260728140000` unrecorded. |
| `l99_slots_protocol`, `l99_slots_vision`, `l99_slots_active`, `l99_upgraded_at` | **no** | **Missing.** Written by `src/app/_actions/l99-licensing.ts`. **No migration file** in repo. Prod has `command_slots` instead. |
| `ai_tone`, `enterprise_onboarded_at` | **no** | **Missing.** Written by `src/app/api/enterprise/onboard-start/route.ts`. |
| `account_tier`, `auth_user_id`, `agency_id`, `ui_role`, `protocol_active`, `command_slots` | **yes** | Present. |

### Guardian (L35)

| Code / migration expects | Prod has | Verdict |
|---|---|---|
| Table `public.guardian_findings` | **yes** (8 columns, 29 rows, RLS on) | Present. |
| Unique index `guardian_open_unique` on `(agency_id, lead_id, rule_code) WHERE resolved_at IS NULL` | **yes** | **Present.** `pg_indexes` definition matches `20260727120000_guardian_v1_blok_c.sql`. |
| History row `20260727120000` / `guardian_v1_blok_c` | **no** | **History drift only.** Do **not** re-run CREATE INDEX. Optional follow-up: record the version in `schema_migrations` in a dedicated history PR (not this one, not L37). |

L35 / Cowork asked this audit to include guardian unique: the object exists on prod; the gap is **unrecorded migration**, not a missing unique.

### Other existing tables — high-confidence missing columns

| Table | Code expects | Prod has | Notes |
|---|---|---|---|
| `ai_action_audit` | `cost_eur`, `credits_spent`, `model`, `latency_ms` | `action_kind, agency_id, body_hash, channel, created_at, id, lead_id, meta, profile_id, subject_preview, variant` | `20260611000002_ai_action_audit_cost.sql` unrecorded. |
| `morning_briefs` | `content_source`, `content_source_reason` | no those two | `20260612120000_morning_brief_content_source.sql` unrecorded. |
| `ghostwriter_letters` | `profile_id` | no | Runtime generate/send-email. |
| `lead_assignment_rules` | `agency_id` | no (`criteria, id, is_active, name, profile_ids, rule_type`) | Automation rules API. |
| `lead_property_matches` | `match_score` (fallback) | `score` | **Name mismatch.** Code already falls back `score ?? match_score`. Prefer code, not ALTER. |
| `arbitrage_matches` | embed alias `bazos_listing:` | columns `listing_bazos`, `listing_portal` | **Not missing.** PostgREST alias. |

### Missing tables (runtime `.from`, `to_regclass` = NULL)

| Table | Representative callers | Repo SQL |
|---|---|---|
| `scheduled_events` | `src/lib/scheduled-events/store.ts` | `20260527143000_event_scheduler_phase1.sql` — **history says applied, table absent** |
| `ai_generations` | `src/lib/listings/generations-store.ts` | `20260803120000_ai_generations.sql` unrecorded |
| `enrichment_log` | `src/lib/enrichment/engine.ts` | `20260614213000_enrichment_log_and_contacts_dossier.sql` unrecorded |
| `credit_redemption_codes` | `src/lib/starter-pack/*` | `20260615000000_credit_redemption_codes.sql` unrecorded |
| `ai_cost_daily` | `src/lib/metrics/fetch.ts` | `20260611000004_ai_cost_daily.sql` unrecorded |
| `demo_bookings`, `demo_prospects`, `demo_prefill_links` | Calendly / demo cron | `20260612000000_demo_ops.sql` / `20260428164000` (latter **is** recorded — verify leftover objects) |
| `conversations`, `messages` | `src/lib/outreach-store.ts` | No matching `public` tables |
| `event_store` | `src/infra/db/eventstore/EventStore.ts` | No matching table |
| `team_member_permissions` | `src/app/api/nav/permissions/route.ts` | No matching table |

Lower-priority / edge-function-only missing relations (not CRM page hot path): `api_keys`, `b2b_price_intelligence`, `broker_performance_stats`, `competitor_activity_logs`, `competitor_monitoring`, `demand_signals`, `developer_api_key_requests`, `lead_action_scores`, `lead_closing_windows`, `lead_micro_actions`, `lead_rescue_runs`, `notifications`, `outreach_log`, `strategic_alerts`.

### Present despite unrecorded migrations (do not re-CREATE)

Examples already on prod: `guardian_findings`, `stealth_recruiter_prospects`, `dashboard_insights_cache`, `acquire_dedup_keys`, `valuation_tenants`, `acquisition_accounts` / `acquisition_campaigns` / `acquisition_events`, `agencies.email` / `agencies.phone`, leads GDPR columns. **Blind `supabase db push` of the 50 files would collide.**

### Prod hygiene (not CRM column drift)

Junk `public` relations: `AI AGENT AUTOMAT ONBOARDING`, `AI AGENT AUTOMAT ONBOARDING no.2.01`, `gpmmfashion@gmail.com tabulka`. Not referenced by CRM `.from()`. Leave in place until an explicit cleanup GO.

Installed extensions (subset): `plpgsql`, `uuid-ossp`, `pgcrypto`, `pg_stat_statements`, `vector` 0.8.0, `supabase_vault`. `pg_trgm` / `pg_cron` / `postgis` are **available but not installed**.

### Security advisors (read-only; not this lane)

`get_advisors(security)`: **8 ERROR** `security_definer_view` (`activity_stream`, `morning_brief_stats`, `arbitrage_stats`, `negotiation_briefs`, `v_genome_decisions_resolved`, `v_genome_calibration`, `v_genome_exclusivity_patterns`, `genome_decision_open`) + 77 WARN. Cowork mentioned 4 CRITICAL; current count is 8 (genome views included). Separate security wave. **L37** `20260817120000_rename_genome_layer2.sql` is on `main` and **unapplied** — out of this PR.

---

## Proposed SQL (text only — do not execute)

All statements are `IF NOT EXISTS` / idempotent where possible. **This PR does not run them.** A later lane should split P0 column ALTERs from missing-table CREATEs, and must not replay full unrecorded files against objects that already exist.

### P0 — columns that already 42703 on live CRM paths

```sql
-- AUDIT ONLY. Do not execute from L38.

-- profiles: operator gate (20260728140000)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_platform_admin boolean NOT NULL DEFAULT false;

-- profiles: L99 licensing writes (no migration file in repo; types inferred from code)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS l99_slots_protocol integer,
  ADD COLUMN IF NOT EXISTS l99_slots_vision integer,
  ADD COLUMN IF NOT EXISTS l99_slots_active integer,
  ADD COLUMN IF NOT EXISTS l99_upgraded_at timestamptz;

-- profiles: enterprise onboard writes
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS ai_tone text,
  ADD COLUMN IF NOT EXISTS enterprise_onboarded_at timestamptz;

-- leads: code uses timestamptz; prod only has last_contact text
-- Do not drop/rename last_contact in the same change.
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS last_contact_at timestamptz;

-- leads: baseline + live selects (SupabaseLeadsRepository, rescue, sales-brain)
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS bri_score smallint NOT NULL DEFAULT 0;

-- leads: research dossier (20260614220000)
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS dossier jsonb;

-- leads: HubSpot sync persist
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS hubspot_contact_id text;

CREATE INDEX IF NOT EXISTS idx_leads_bri_score ON public.leads (bri_score);
CREATE INDEX IF NOT EXISTS idx_profiles_platform_admin
  ON public.profiles (id) WHERE is_platform_admin = true;
```

Optional backfill (still not executed here): copy parseable timestamps from `last_contact` is **not safe** (`last_contact` is free text). Leave `last_contact_at` NULL until writers populate it, or change code to stop selecting `last_contact_at` (separate PR).

### P1 — supporting columns

```sql
ALTER TABLE public.ai_action_audit
  ADD COLUMN IF NOT EXISTS cost_eur numeric(10, 4),
  ADD COLUMN IF NOT EXISTS credits_spent integer,
  ADD COLUMN IF NOT EXISTS model text,
  ADD COLUMN IF NOT EXISTS latency_ms integer;

ALTER TABLE public.morning_briefs
  ADD COLUMN IF NOT EXISTS content_source TEXT
    CHECK (content_source IS NULL OR content_source IN ('llm', 'fallback')),
  ADD COLUMN IF NOT EXISTS content_source_reason TEXT;

ALTER TABLE public.ghostwriter_letters
  ADD COLUMN IF NOT EXISTS profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.lead_assignment_rules
  ADD COLUMN IF NOT EXISTS agency_id uuid REFERENCES public.agencies(id) ON DELETE CASCADE;
```

### P1 — missing table already marked applied (`scheduled_events`)

Repair is CREATE (table is absent). Do **not** insert a duplicate `schema_migrations` row for `20260527143000`.

```sql
CREATE TABLE IF NOT EXISTS public.scheduled_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  lead_id text REFERENCES public.leads(id) ON DELETE SET NULL,
  property_id text REFERENCES public.properties(id) ON DELETE SET NULL,
  event_type text NOT NULL DEFAULT 'viewing',
  status text NOT NULL DEFAULT 'scheduled',
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  location text NOT NULL DEFAULT '',
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  timezone text NOT NULL DEFAULT 'Europe/Bratislava',
  google_calendar_event_id text,
  google_calendar_html_link text,
  reminder_minutes integer,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  cancelled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT scheduled_events_ends_after_start CHECK (ends_at > starts_at),
  CONSTRAINT scheduled_events_type_check CHECK (
    event_type = ANY (ARRAY['viewing','meeting','call','reminder','other']::text[])
  ),
  CONSTRAINT scheduled_events_status_check CHECK (
    status = ANY (ARRAY['scheduled','confirmed','cancelled','completed','no_show']::text[])
  )
);
```

RLS/policies: copy from `apps/crm/supabase/migrations/20260527143000_event_scheduler_phase1.sql` in the apply PR, after confirming no partial objects.

### P2 — missing tables with unapplied files (apply file, do not invent)

Do not paste full CREATEs here. Apply (in a later PR, with GO) the existing files **after** a dry-run against prod:

- `20260803120000_ai_generations.sql`
- `20260614213000_enrichment_log_and_contacts_dossier.sql` (skip parts that already exist)
- `20260615000000_credit_redemption_codes.sql`
- `20260611000004_ai_cost_daily.sql`
- `20260612000000_demo_ops.sql`

### Guardian unique — no ALTER

```sql
-- ALREADY EXISTS ON PROD. Do not execute.
-- CREATE UNIQUE INDEX IF NOT EXISTS guardian_open_unique
--   ON public.guardian_findings (agency_id, lead_id, rule_code)
--   WHERE resolved_at IS NULL;
```

### Do not do from this audit

- Replay all 50 unrecorded migrations.
- Mix in `20260817120000_rename_genome_layer2.sql` (L37).
- `INSERT` into `supabase_migrations.schema_migrations` without a dedicated history PR.
- Drop junk tables or security-definer views.

---

## Migration history gap (context)

Recorded prod versions end at `20260811220000_acquisition_core`. Local `main` continues through June–August files (billing, import, guardian, platform admin, ai_generations, acquisition sync, genome rename). Several of those objects were created **out of band** (Dashboard / partial apply), so history is neither “46 missing objects” nor “50 safe to push”.

16.8 founder ALTERs on `profiles.tier_updated_at` and `leads.*` are live and still **unrecorded**.

---

## Verification performed

- MCP `get_project` on `ypgajkhqtbriqqmyawyv`.
- `information_schema.columns` (1292 rows).
- `pg_indexes` (313 public indexes), including `guardian_open_unique`.
- `supabase_migrations.schema_migrations` (47 rows).
- `to_regclass` for missing-table suspects.
- `get_advisors` security (8 ERROR security-definer views).
- Code grep: `last_contact_at`, `is_platform_admin`, `guardian_open_unique`, `.from("…")`.

No `INSERT`/`UPDATE`/`DELETE`/`ALTER`/`CREATE`/`DROP`. No `apply_migration`. No edge deploys.

---

## STOP

L38 complete: report only. **Do not merge from the agent.** **Do not apply SQL.** Next apply-lane needs founder GO and must not bundle L37.
