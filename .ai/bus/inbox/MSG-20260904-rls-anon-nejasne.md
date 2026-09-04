# MSG-20260904 — RLS anon audit: otázky pred ďalším DROP

**From:** security/rls-anon-audit agent  
**To:** founder  
**Priority:** P0 follow-up  
**Audit:** `docs/audit/2026-09-04-rls-anon-policies.md`

## NEJASNÉ — `lead_assignment_rules` demo_* (4 politiky)

Tabuľka má otvorené `demo_*` pre `anon` **aj** `authenticated` a sú to **jediné** RLS
politiky. UI (`lead-automation-store.ts`) ich potrebuje po prihlásení.

Tabuľka **nemá `agency_id`** (iba `profile_ids uuid[]`). Bez schémy:

- DROP bez náhrady → zlomí authenticated UI
- `TO authenticated USING (true)` → stále cross-tenant medzi agentúrami
- tenant via `profile_ids` ∩ `profiles.auth_user_id` → nepokryje admina, čo pravidlá spravuje

**Otázka:** Pridať `agency_id` (+ backfill) a až potom NAHRADIŤ, alebo dočasne
authenticated-only s vedomým cross-tenant rizikom?

## PRESUNÚŤ NA SERVER — `onboarding_sessions` / `Allow anon access`

Browser (`useOnboarding.ts`, `OnboardingClient.tsx`) upsert/select cez anon kľúč.
localStorage je SoT; sync toleruje zlyhanie.

**Otázka:** Môžeme DROP `Allow anon access` už teraz (sync ticho padne), alebo čakať
na API endpoint so service role v samostatnom PR?

## Nepublikovať

Neposielať do chatu anon kľúč, connection string ani project ref.
