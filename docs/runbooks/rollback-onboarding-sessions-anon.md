# Rollback: onboarding_sessions anon ALL

**Použiť iba ak** po aplikovaní `20260904220000_drop_onboarding_sessions_anon_all.sql`
verejný onboarding sync prestane fungovať **a** hotfix API `/api/onboarding/session`
nie je nasadený / nedostupný.

**Varovanie:** tento rollback **znovu otvára** `Allow anon access`
(`FOR ALL TO anon USING (true)`). Emergency net, nie cieľový stav.

**Preferovaný forward-fix:** over deploy Preview/Production CRM s route
`GET|POST /api/onboarding/session` (service role) — klient už nevolá
`supabaseClient.from("onboarding_sessions")`.

Spustiť v SQL editore produkcie **až po explicitnom founder GO**.

```sql
BEGIN;

DO $$
BEGIN
  IF to_regclass('public.onboarding_sessions') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Allow anon access" ON public.onboarding_sessions;
    CREATE POLICY "Allow anon access"
      ON public.onboarding_sessions
      FOR ALL
      TO anon
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

COMMIT;
```

## Overenie po rollback

```sql
SELECT polname, polcmd, roles::text
FROM pg_policy
JOIN pg_class ON pg_class.oid = pg_policy.polrelid
WHERE relname = 'onboarding_sessions';
```

Očakávanie: existuje `Allow anon access` pre `anon`.

## Related (out of scope)

- `lead_assignment_rules` / Brief 17 schema drift — **not** fixed by this rollback.
- `integration_settings` full deny — intentional; do not reopen here.