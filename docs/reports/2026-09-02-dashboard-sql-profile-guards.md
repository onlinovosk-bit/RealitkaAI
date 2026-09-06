# Dashboard SQL — profile guards (#493 / #494)

**Date:** 2026-09-02  
**Project:** `ypgajkhqtbriqqmyawyv` (onlinovosk-bit's Project)

## ZISTI

Both deep-defense triggers are **already live** on production. No Dashboard paste was required today.

| Trigger | Status |
|---|---|
| `profiles_guard_role_and_agency` (BEFORE UPDATE OF role, agency_id) | present |
| `profiles_guard_account_tier_and_ui_role` (BEFORE UPDATE OF account_tier, ui_role) | present |

Functions with the same names exist. Columns `account_tier` and `ui_role` exist on `public.profiles`.

`supabase_migrations.schema_migrations` remote list (MCP `list_migrations`) still ends around `acquisition_core` — these guards were applied outside the recorded migration history (Dashboard / manual), which matches the earlier founder workflow for drift catch-up.

## Okno app ↔ trigger

App-level fixes from #493/#494 are on `main`. Trigger layer is also on. Hole for those four privilege fields is closed at both layers.

## Poznámka (mimo tohto SQL kroku)

`profiles.is_platform_admin` **nie je** v production columns (migration `20260728140000_profiles_platform_admin.sql` not in remote history). Operator / onboarding-MVP platform-admin gates fail closed until that column is applied + founder row granted. Track separately — not part of #493/#494 SQL pair.
