# P0 schema ALTERs - leads + profiles (apply PR, not executed)

**Status:** repo prep only. **No database writes from this lane.** SQL below was **not** run.
**STOP** after this PR. Founder applies via Dashboard SQL Editor. Do not merge from the agent. Do not `db push`.

Follow-up to L38 audit [#436](https://github.com/onlinovosk-bit/RealitkaAI/pull/436). **Not** a replay of L37 [#435](https://github.com/onlinovosk-bit/RealitkaAI/pull/435) (`20260816230000_prod_drift_profiles_leads`).

## Why these four

L38 (`docs/reports/2026-08-17-schema-drift-audit.md`) measured production `ypgajkhqtbriqqmyawyv` vs CRM `.select` / `.from`. Live 42703 risk on:

| Column | Type | Prod today |
|---|---|---|
| `leads.last_contact_at` | `timestamptz` | **missing.** Prod has `last_contact text` from 16.8 founder ALTERs ('Práve vytvorený'). Do **not** drop/rename `last_contact`. |
| `leads.bri_score` | `smallint NOT NULL DEFAULT 0` | **missing.** In unrecorded baseline; `20260428214500` is recorded but only indexes the column *if it exists*. |
| `leads.dossier` | `jsonb` | **missing.** File `20260614220000` unrecorded. |
| `profiles.is_platform_admin` | `boolean NOT NULL DEFAULT false` | **missing.** File `20260728140000` unrecorded. Operator gate. |

Out of this PR (L38 listed them, founder next-task line did **not** mark them P0 apply): `l99_slots_*`, `ai_tone`, `enterprise_onboarded_at`, `hubspot_contact_id`. Also out: missing tables, 50 unrecorded local files, L37 16.8 columns, genome rename, platform-admin trigger from `20260728140000`.

No backfill from `last_contact` to `last_contact_at` (`last_contact` is free text). Leave `last_contact_at` NULL until writers populate it.

## Dashboard SQL (founder - SQL Editor on prod)

Same statements as `apps/crm/supabase/migrations/20260817220000_p0_schema_alters_leads_profiles.sql`:

```sql
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_platform_admin boolean NOT NULL DEFAULT false;

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS last_contact_at timestamptz,
  ADD COLUMN IF NOT EXISTS bri_score smallint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS dossier jsonb;

CREATE INDEX IF NOT EXISTS idx_leads_bri_score ON public.leads (bri_score);
CREATE INDEX IF NOT EXISTS idx_profiles_platform_admin
  ON public.profiles (id) WHERE is_platform_admin = true;
```

Then record history (same path as `20260811220000_acquisition_core` / L37):

```sql
INSERT INTO supabase_migrations.schema_migrations (version, name, statements, created_by)
VALUES ('20260817220000', 'p0_schema_alters_leads_profiles', ARRAY[]::text[], NULL);
```

Confirm:

```sql
SELECT version, name, created_by
FROM supabase_migrations.schema_migrations
WHERE version = '20260817220000';

SELECT table_name, column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (
    (table_name = 'leads' AND column_name IN ('last_contact', 'last_contact_at', 'bri_score', 'dossier'))
    OR (table_name = 'profiles' AND column_name = 'is_platform_admin')
  )
ORDER BY table_name, column_name;
```

Expect `last_contact` **and** `last_contact_at` both present after apply.

## Do not

- Merge this PR from the agent.
- `supabase db push` / MCP `apply_migration` / any INSERT/ALTER/CREATE from this lane.
- Replay `#435` / `20260816230000`.
- Replay the 50 unrecorded local migrations.
- Mix proxy API-401, Gmail, or Stripe work into this PR.

## STOP

Branch + PR only. Founder applies when ready. No merge. No db push.