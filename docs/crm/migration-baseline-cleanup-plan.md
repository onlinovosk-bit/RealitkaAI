# Migration Baseline Cleanup Plan

## Current release baseline (completed)

- Staging has `ai_insight` applied directly and verified.
- `supabase db push --yes` now returns `Remote database is up to date.` without manual repair.
- Conflicting historical migrations were moved from active path:
  - `supabase/migrations/20260411_semantic_search.sql`
  - `supabase/migrations/20260412_enterprise_realtime_audit_rls.sql`
  - `supabase/migrations/20260412_google_calendar_oauth.sql`
  into:
  - `supabase/migrations-archive/`

This keeps release velocity high and prevents out-of-order failures on `db push`.

## Why this was needed

- Multiple historical files shared the same migration version prefix (`20260411`, `20260412`) and collided with remote history.
- Some historical SQL expected schema objects that differ on staging.
- Result was repeated `db push` failure despite the latest migration being safe.

## Rules for all next migrations (to avoid manual fixes)

1. Use unique timestamp versions with seconds: `YYYYMMDDHHMMSS_description.sql`.
2. Never create two migration files with the same version prefix.
3. Keep `supabase/migrations/` forward-only for actively deployable migrations.
4. Put retired or conflict-prone history in `supabase/migrations-archive/`.
5. Write migrations idempotently (`if exists`, `if not exists`, safe `drop policy if exists`).

## Release checklist for every DB change

1. Create migration with unique timestamp name.
2. Run `npx supabase migration list`.
3. Run `npx supabase db push --yes` on staging.
4. Verify schema/data with `npx supabase db query --linked "...";`.
5. Record result in release notes.

## Optional hardening (recommended next sprint)

- Create one schema snapshot baseline for fresh environments.
- Add CI guard that fails when duplicate migration versions exist.
- Add CI step `supabase db lint` + dry-run migration check.
