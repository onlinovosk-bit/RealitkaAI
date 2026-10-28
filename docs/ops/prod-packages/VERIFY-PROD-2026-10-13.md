# VERIFY-PROD 2026-10-13 — dôkaz (iba SELECT, nič sa nezapísalo)

Projekt `ypgajkhqtbriqqmyawyv`, spustené po `GO VERIFY-PROD` (founder).

## Balík A — demand-activation: UŽ APLIKOVANÝ
- `verify-after.sql` (len SELECT, 27 kontrol): **27/27 `ok = true`**.
- Obe tabuľky (`lead_demands`, `demand_property_matches`): RLS zapnuté, 1 politika SELECT pre `authenticated` cez `profile_agencies_for_auth()` bez `IS NULL`, anon bez práv, authenticated bez zápisu, service_role SELECT+INSERT, `agency_id` uuid NOT NULL, FK 2/4, UNIQUE, 7 indexov, 0 riadkov (flagy vypnuté).
- Záver: `apply.sql` netreba spúšťať. `GO DEMAND-SCHEMA` je bezpredmetné.

## Balík B — agency-null-policies-close
- Politiky s vetvou `agency_id IS NULL` v cieľovom rozsahu balíka: už neexistujú (`verify-before.sql`).
- Zostávajúce nálezy (každý vyžaduje samostatné GO, nie súčasť tohto bloku): REVOKE `rls_audit_snapshot` z anon/authenticated; politiky `lead_closing_windows`, `lead_micro_actions`, `lead_rescue_runs`; public-role `IS NULL` politiky na `portal_listings`/`listing_price_history`; SECURITY DEFINER funkcie bez fixného `search_path`; anon cross-tenant riziko `match_leads`/`match_properties`; `activities` 194 riadkov s NULL `agency_id`.
