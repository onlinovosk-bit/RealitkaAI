# Balík C „rls-rest-close" — mapa ciest (PROD `ypgajkhqtbriqqmyawyv`, 2026-10-13, iba SELECT)

Stav: **NEAPLIKOVANÉ.** Odomykacie slová: `GO REST-CLOSE` (apply), `GO REST-ROLLBACK` (návrat).
Poradie na spustenie: `verify-before.sql` → `apply.sql` → `verify-after.sql` (všetko `ok = true`, riadok 40 je info).
**Skripty neboli spustené ani na lokálnej DB** (lokálny test bol zamietnutý v tomto prostredí) — overené len čítaním a
proti PROD metadátam (`activities.id` existuje, `lead_id`/`leads.id` sú `text`, `vector` je v schéme `extensions` a rozlišuje sa). Apply je jedna transakcia, chyba = ROLLBACK.

## 1. Funkcie SECURITY DEFINER (33 v `public`) × anon/authenticated

| Funkcia | anon / auth EXECUTE (PROD) | Volanie v kóde | Rozhodnutie |
|---|---|---|---|
| `match_leads`, `match_properties` | áno / áno | **žiadne** `rpc()` | C: REVOKE (cross-tenant čítanie embeddingov), GRANT service_role |
| `rls_audit_snapshot` | áno / áno | len `schema-governance-guard.mjs`, `rls-schema-parity-audit-once.mjs`, `tests/rls` cez service role | C: REVOKE, GRANT service_role |
| `calculate_broker_metrics`, `trg_activities_platform_events`, `trg_leads_platform_events`, `ai_triage_feedback_set_agency` | áno / áno | triggery (EXECUTE sa pri spustení triggera nekontroluje) | C: REVOKE |
| `get_valuation_tenant` | áno / áno | verejná valuačná stránka | ostáva (zámerne verejné, má `search_path`) |
| `profile_agencies_for_auth` | áno / áno | základ všetkých RLS politík | ostáva (nesmie sa dotknúť) |
| `add_price_point`, `compute_bri_score`, `compute_bri_score_v2` | áno / áno | session klient (`createClient()`) | **D** — berú `p_profile_id` od volajúceho, treba kontrolu `auth.uid()` v tele + kód |
| `record_brief_click/open` | áno / áno | verejné odkazy z e-mailu (anon) | **D** — UPDATE podľa uuid bez vlastníctva; treba podpísaný token |
| `expire_arbitrage_matches`, `rotate_bri_snapshots` | áno / áno | cron route cez `createClient()` (anon/session) | **D** — presunúť na admin klienta, potom REVOKE |
| `get_supply_demand_gap` | nie / áno | route + edge function | ostáva (rozhodnúť v D) |
| ostatné (apply_credit_purchase, spend_credits, …) | nie / nie | service | bez zmeny |

Bez fixného `search_path` (D, nie C — telá volajú objekty mimo `public`, treba prejsť jednotlivo):
add_price_point, calculate_broker_metrics, compute_bri_score(_v2), compute_motivation_score, detect_broker_weakness,
expire_arbitrage_matches, get_supply_demand_gap, increment_api_usage, log_event, match_*, rate_limit_increment,
recompute_broker_metrics, record_brief_*, record_kataster_event, rotate_bri_snapshots.

## 2. Tabuľky a pohľady
- Všetky tabuľky v `public` majú RLS zapnuté (0 výnimiek).
- `lead_closing_windows`, `lead_micro_actions`, `lead_rescue_runs`: jedna politika `ALL` pre `authenticated` cez `profile_agencies_for_auth()`, bez `IS NULL`, anon bez práv → **v poriadku, bez zmeny.**
- `activities`: anon mal všetky granty (RLS ho blokuje, lebo politiky sú pre `authenticated`) → C: REVOKE ALL pre anon.
- `portal_listings`, `listing_price_history`: grant na zápis pre anon aj authenticated, zápisové politiky len `service_role` → C: REVOKE zápisu (mŕtvy grant).
  **Otvorené rozhodnutie:** politiky „users see own or public listings" a „users see own price history" dovoľujú čítať riadky s `profile_id IS NULL` aj anon. Tabuľky majú 0 riadkov, takže dnes nič nevyteká; či sú inzeráty verejné zámerne, rozhodne founder pred prvým importom.
- Pohľady: `b2b_price_intelligence` bez `security_invoker`, ale bez práv pre anon/authenticated (OK); `ai_cost_daily` je čitateľný pre anon (invoker) — kandidát do D.
- Politiky s `IS NULL` vetvou, ktoré ostávajú (nie `agency_id`): `buyer_events` (`lead_id IS NULL`), `demand_signals` (`profile_id IS NULL`), `portal_listings` (viď vyššie) → D / samostatné GO.
- Politiky na rolu `public` namiesto `authenticated` (anon sa vyhodnotí na `auth.uid() = NULL` → nič nevidí): niet nálezu, ale `developer_api_key_requests` povoľuje INSERT `WITH CHECK (true)` anon-ovi (zámerná verejná žiadosť o API kľúč; potrebuje rate-limit v kóde).

## 3. `activities.agency_id`
- 194 riadkov, **všetky** `agency_id IS NULL`. Pripojiteľných na existujúci lead: **7** (2 agentúry), **187 sirotských** (lead neexistuje).
- C: backfill 7 riadkov (so zálohou `_bak_rls_rest_activities`). 187 sirotských sa **nemaže** — dnes ich nevidí nik (každá politika vyžaduje agentúru alebo existujúci lead). Zmazanie = samostatné rozhodnutie.

## 4. Čo C nerobí a prečo
Nemení kód ani aplikačné cesty. Všetko, čo volá session/anon klient (`add_price_point`, `compute_bri_*`, `record_brief_*`, cron RPC), ostáva funkčné — `verify-after.sql` riadok 32 to overuje.
