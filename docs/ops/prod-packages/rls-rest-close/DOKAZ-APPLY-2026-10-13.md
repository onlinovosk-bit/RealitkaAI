# Dôkaz: balík C aplikovaný v PROD (`GO REST-CLOSE`, 2026-10-13)

Projekt `ypgajkhqtbriqqmyawyv`. Poradie: `verify-before` → `apply.sql` (jedna transakcia, bez chyby) → `verify-after`.

- **Pred:** 11 kontrol `ok = false` (7 funkcií s EXECUTE pre anon/authenticated, `activities` anon granty, zápis na `portal_listings` a `listing_price_history`, 7 nepriradených `activities`), 3 predpoklady `ok = true`.
- **Po:** 19 z 19 kontrol `ok = true`, riadok 40 (info): `activities` 194 celkom / 187 bez `agency_id` / 187 sirotských.
  - 7 funkcií bez EXECUTE pre anon a authenticated, `service_role` ho má na `match_leads`, `match_properties`, `rls_audit_snapshot`.
  - `activities`: anon bez práv, authenticated si ponechal SELECT; zápis na `portal_listings` a `listing_price_history` zrušený.
  - Záloha `_bak_rls_rest_activities`: 7 riadkov, RLS zapnuté, bez grantov pre authenticated.
  - Regresia: `profile_agencies_for_auth`, `add_price_point`, `compute_bri_score_v2` (authenticated) a `record_brief_open` (anon) ostávajú volateľné.
- **Neoverené:** správanie aplikácie po zmene (nevolal som žiadnu route); `rls_audit_snapshot` volá len service role (podľa čítania kódu).
- Návrat: `rollback.sql` (`GO REST-ROLLBACK`).
