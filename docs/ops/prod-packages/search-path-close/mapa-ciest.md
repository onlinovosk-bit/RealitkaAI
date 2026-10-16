# Balík E „search-path-close" — mapa ciest (PROD `ypgajkhqtbriqqmyawyv`, 2026-10-16)

Stav: **SQL NEAPLIKOVANÉ v PROD. Balík vyžaduje explicitné GO foundera.** Odomykacie slová: `GO E-APPLY` / `GO E-ROLLBACK`.
Poradie: `verify-before.sql` → `apply.sql` (jedna transakcia) → `verify-after.sql`. Kód sa NEMENÍ, na Vercel nič nečaká.
Zdroj stavu: READ-ONLY dotazy na `pg_proc` (prosecdef, proconfig, `pg_get_function_identity_arguments`, proacl) z 2026-10-16. Signatúry nižšie sú z PROD, nie z migrácií.

Nález: v schéme `public` je **11** `SECURITY DEFINER` funkcií bez `search_path` (`proconfig` = NULL), vlastník `postgres`. Mimo `public` (okrem systémových schém) žiadna.
Rola `postgres` má `search_path = "$user", public, extensions` — funkcie bez fixného `search_path` ho dedia z volajúceho (hijack cez schému, ktorú volajúci ovláda).

## Rozhodnutie pre každú funkciu

| Funkcia (identity args z PROD) | ACL teraz | Volajúci v kóde (klient) | Rozhodnutie: search_path | Rozhodnutie: EXECUTE |
|---|---|---|---|---|
| `calculate_broker_metrics()` trigger | postgres, service_role | trigger `trg_calculate_broker_metrics` na `broker_events` (DB) | `public, pg_temp` | bez zmeny |
| `compute_motivation_score(p_profile_id uuid, p_listing_id uuid, p_property_id text)` | postgres, service_role | iba DB: volá ju `add_price_point` (SECDEF, vlastník postgres) | `public, pg_temp` | bez zmeny |
| `detect_broker_weakness(target_broker_id uuid)` | postgres, service_role | žiadny v `apps/`, `supabase/functions` | `public, pg_temp` | bez zmeny |
| `get_supply_demand_gap(city_name text)` SQL, STABLE | postgres, **authenticated**, service_role | `api/reports/generate-developer-insights` (session klient = authenticated); edge `data-api-gateway` (service role) | `public, pg_temp` | **NEODOBERAŤ authenticated** — živá cesta |
| `increment_api_usage(key_id text)` | postgres, service_role | edge `data-api-gateway` (service role) | `public, pg_temp` | bez zmeny |
| `log_event(p_profile_id uuid, p_entity_type text, p_entity_id text, p_event_type text, p_payload jsonb)` | postgres, service_role | žiadny v kóde | `public, pg_temp` | bez zmeny |
| `match_leads(query_embedding vector, match_threshold double precision, match_count integer)` | postgres, service_role | `api/search/semantic` (session klient — pozri riziko 1) | **`public, extensions, pg_temp`** | bez zmeny (NEPRIDÁVAŤ authenticated) |
| `match_properties(query_embedding vector, match_threshold double precision, match_count integer)` | postgres, service_role | rovnako ako `match_leads` | **`public, extensions, pg_temp`** | bez zmeny |
| `rate_limit_increment(p_key text, p_window_end timestamptz, p_max integer)` | postgres, service_role | `lib/rate-limit.ts` (service role) | `public, pg_temp` | bez zmeny |
| `recompute_broker_metrics(p_user_id uuid)` | postgres, service_role | iba DB: `calculate_broker_metrics` | `public, pg_temp` | bez zmeny |
| `record_kataster_event(p_profile_id uuid, p_parcel_id text, p_event_type text, p_severity text, p_watched_parcel_id uuid, p_lead_id text, p_old_hash text, p_new_hash text, p_payload jsonb)` | postgres, service_role | žiadny v kóde | `public, pg_temp` | bez zmeny |

EXECUTE: 10 z 11 funkcií je už zavretých (ACL = postgres + service_role, PUBLIC/anon/authenticated nemajú) — apply.sql ACL **nemení** vôbec. `get_supply_demand_gap` ponecháva `authenticated`, lebo ho volá session klient. Preto rollback ACL nerieši, vracia len `proconfig`.

## Prečo `extensions` pri match_*
Typ `vector` aj operátor `<=>` sú v schéme `extensions` (overené v PROD: `pg_type`, `pg_operator`, `pg_extension`). Telá používajú `leads.embedding <=> query_embedding` bez kvalifikácie, takže `search_path = public, pg_temp` by ich rozbilo (`operator does not exist`). Telá ostávajú nezmenené (žiadny `CREATE OR REPLACE`), mení sa iba `proconfig`.
Ostatné telá používajú len `public.*` (alebo `rate_limit_buckets` bez prefixu — je v `public`, apply.sql to kontroluje) a funkcie z `pg_catalog` (`now`, `round`, `jsonb_build_object`…), `extensions` nepotrebujú.

## Riziká
1. **Existujúca chyba mimo balíka E:** `api/search/semantic` volá `match_leads/properties` session klientom, ale `authenticated` už EXECUTE nemá (zavreté balíkom C) → RPC vráti permission denied a route spadne na ILIKE fallback. Balík E to nemení ani nezhoršuje. Neotvárať EXECUTE späť: funkcie sú SECDEF bez filtra tenanta (únik cez RLS). Oprava = samostatná stena (service role v route + filter agency), nie súčasť E.
2. `ALTER FUNCTION … SET` berie krátky zámok na `pg_proc` riadku; `lock_timeout 5s` pri kolízii transakciu zruší celú (nič sa nezmení).
3. Trigger funkcia `calculate_broker_metrics` volá `public.recompute_broker_metrics` s prefixom — fixný `search_path` ju neovplyvní.
4. `get_supply_demand_gap` je jazyka SQL: `SET search_path` na SQL funkcii zakáže inlining; STABLE agregácia nad 2 tabuľkami, výkonový dopad zanedbateľný (funkcia SECDEF sa aj tak neinlinuje).
5. Nové SECDEF funkcie pridané po 2026-10-16 balík nepokryje; `verify-after.sql` kontrola 90 to ukáže (count bez search_path = 0).
6. Premisa: stav PROD sa medzi čítaním a apply nezmenil — apply.sql to overuje vlastným pre-flightom (signatúra + `proconfig IS NULL`), inak RAISE a ROLLBACK.

## Rollback
`rollback.sql` urobí `RESET search_path` (pôvodný `proconfig` bol pri všetkých 11 NULL). ACL sa nemenil, takže ho netreba obnovovať.
