# Tenant fail-closed slice — ghostwriter letter stamp

2026-10-16. One gate. `profiles.is_active ?? true` in `lib/auth.ts` is unchanged.

## Nález

`POST /api/ghostwriter/send-email` after a successful send loaded
`ghostwriter_letters.profile_id` and then updated the row through the service
role when `!letter || letter.profile_id === profile.id`.

`public.ghostwriter_letters` has no `profile_id` column
(`supabase/migrations/20260925210000_baseline_prod_only_tables.sql`). The select
errors, `data` is null, and `!letter` took the allow branch. Any persisted
letter id was stamped with `email_sent_to` / `sent_at`.

## Oprava

The route no longer selects or updates `ghostwriter_letters`. The table has
no tenant key, so a `profile_id` filter cannot succeed on the current schema
and a select of that column errors on every send. The email send path is
unchanged. A real ownership stamp needs a migration, which this PR does not add.

This does not read or write `profiles.is_active`. A null `is_active` still
passes `?? true` and is not an access gate.

## Test

`npx vitest run src/app/api/ghostwriter/send-email/__tests__/ownership-fail-closed.test.ts`
