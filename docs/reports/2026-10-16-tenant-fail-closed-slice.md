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

The update runs only when the select succeeds and `profile_id` equals the
caller's profile id. The update itself is also filtered by `profile_id`.
A missing row, a null `profile_id`, a failed select, or another profile skips
the write. The email send path is unchanged.

This does not read or write `profiles.is_active`. A null `is_active` still
passes `?? true` and is not an access gate.

## Test

`npx vitest run src/app/api/ghostwriter/send-email/__tests__/ownership-fail-closed.test.ts`
