# Balík B `agency-null-policies-close` — mapa ciest

**Stav dokumentu:** návrh na predloženie, nič neaplikované. Autor nemal žiadny prístup do PROD, preto **každé tvrdenie o stave PROD je UNVERIFIED**, kým founder nespustí `verify-before.sql` a `visibility-probe.sql`. Tvrdenia o repe sú overené čítaním migrácií a replayom na čistej DB (§1).

## 1. Metóda (ako vznikol zoznam)

1. Všetkých **138** súborov `apps/crm/supabase/migrations/**` som aplikoval po jednom v poradí na čistý PostgreSQL 16.14 so stubom Supabase rolí a `auth` schémy. Po **každom** súbore som uložil `pg_policies` (14 866 riadkov snímok) a z diferencií zostavil životný cyklus každej politiky: kedy vznikla, kedy ju prepísala/zrušila neskoršia migrácia, aký je jej stav na konci. Výstup: repo po všetkých migráciách = „stav HEAD".
2. Z toho plynie dôležitý limit: **replay ukazuje, čo repo deklaruje, nie čo je v PROD.** PROD zaostáva za repom a obsahuje objekty, ktoré v repe nie sú (zdroje: `memory/decisions.md` — PROD-MIGRATION-AUDIT 2026-10-01, P-3 2026-09-23). Preto je každá politika, ktorú repo neskôr prepísalo, v PROD „možno živá, UNVERIFIED", a `apply.sql` ju hľadá dynamicky, nie podľa zoznamu.
3. Textové vyhľadanie `agency_id IS NULL` v migráciách: 58 výskytov v 16 súboroch; všetky zahrnuté v tabuľke nižšie alebo sú komentáre/DO-guardy (`20260904150000`, `20260923070000`, `20260928070000`, `20261001160500`, `20261001170000`).

## 2. Politiky s vetvou `agency_id IS NULL` — životný cyklus

Vetva znamená: riadok bez vlastníka (alebo cez `leads.agency_id IS NULL`) je viditeľný/zapisovateľný **každému prihlásenému** používateľovi, nielen tenantovi (RLS politiky sa OR-ujú, takže bezpečná politika ju neprebije).

Stĺpec „Stav HEAD" = repo po všetkých migráciách (replay). Stĺpec „PROD" = tvrdenie z `memory/decisions.md`, **UNVERIFIED**.

| Tabuľka.politika | NULL-vetva vznikla | Neskôr prepísaná / zrušená v repe | Stav HEAD | PROD (UNVERIFIED) | Akcia `apply.sql` |
|---|---|---|---|---|---|
| `activities.activities_tenant_select` | `20260507160000_rls_leads_activities` (cez podselect `leads.agency_id IS NULL`) | **nikdy** | **STÁLE ŽIVÁ** v repe | decisions 2026-10-01: „politík s agency_id IS NULL v celom public = 0" → **rozpor s repom**, príčina NEZNÁMA | prepíše bez vetvy |
| `activities.activities_tenant_write` | `20260507160000` | **nikdy** | **STÁLE ŽIVÁ** v repe | ako vyššie | prepíše |
| `activities.activities_insert_agency` | mimo aktívnych migrácií (archív) | zrušená v `20261001170000_activities_agency_key` | zrušená | zadanie: „zostáva v PROD"; decisions 2026-10-01: zrušená | zruší, **ak** existuje náhrada (stĺpec + trigger + `activities_agency_insert`), inak zastaví |
| `activities.activities_select_agency` | mimo aktívnych migrácií (archív) | zrušená v `20261001130000` | zrušená | decisions: zrušená 2026-10-01 | `DROP IF EXISTS` |
| `leads.leads_tenant` | `20260507160000` | `20260616124500_rls_wave_a_leak_closure` | bez vetvy | možno živá s vetvou | dynamicky |
| `properties.properties_tenant` | `20260508180000_rls_properties` | `20260616124500` | bez vetvy | decisions (starší záznam): nesie `agency_id IS NULL` | dynamicky |
| `lead_closing_windows.closing_windows_tenant` | `20260507140000_rls_decision_tables` (rola `public`) | `20260616123000_rls_wave_a_hardening` | bez vetvy | možno živá | dynamicky |
| `lead_micro_actions.micro_actions_tenant` | `20260507140000` | `20260616123000` | bez vetvy | možno živá | dynamicky |
| `lead_rescue_runs.rescue_runs_tenant` | `20260507140000` | `20260616123000` | bez vetvy | možno živá | dynamicky |
| `lead_action_scores.lead_action_scores_tenant` | `20260613000000_rls_credit_ledger_action_scores` | `20260616123000` | bez vetvy | možno živá | dynamicky |
| `ai_actions.ai_actions_tenant` | `20260418_enterprise_ai_intelligence` (r. 85–149) | `20260419_enterprise_rls_profile_link` (stále s vetvou), `20260616123000` | bez vetvy | možno živá | dynamicky |
| `client_dna.client_dna_tenant` | `20260418_…` | `20260419_…` (stále), `20260616123000` | bez vetvy | možno živá | dynamicky |
| `deal_moments.deal_moments_tenant` | `20260418_…` | `20260419_…` (stále), `20260616123000` | bez vetvy | možno živá | dynamicky |
| `deal_risk.deal_risk_tenant` | `20260418_…` | `20260419_…` (stále), `20260616123000` | bez vetvy | možno živá | dynamicky |
| `lead_events.lead_events_tenant` | `20260418_…` | `20260419_…` (stále), `20260616123000` | bez vetvy | možno živá | dynamicky |
| `lead_scores.lead_scores_tenant` | `20260418_…` | `20260419_…` (stále), `20260616123000` | bez vetvy | možno živá | dynamicky |
| `ai_action_audit.ai_action_audit_insert_tenant` / `_select_tenant` | `20260610000001_ai_action_audit` | zrušené `20260616123000`, znovu bez vetvy `20260928070000_rls_null_escapes`; v PROD guardovaná oprava `20260923070000` | bez vetvy | decisions 2026-09-23: v PROD 186 riadkov, 0 NULL; `20260616123000` v PROD vtedy neaplikovaná | dynamicky |
| `bri_history.bri_history_tenant` | `20260925210000_baseline_prod_only_tables` (~r. 921) | `20260928070000` | bez vetvy | zadanie/audit: možno živá | dynamicky |
| `priority_alerts.priority_alerts_tenant` | `20260925210000` (~r. 951–959) | `20260928070000` | bez vetvy | zadanie/audit: možno živá | dynamicky |
| `pipeline_moves.pipeline_moves_tenant_select` / `_write` | `20260925210000` | `20261001160500_tenant_isolation_wall` | bez vetvy | decisions 2026-10-01: prepísané v PROD | dynamicky |
| `platform_events.platform_events_select_tenant` | `20260921000000_legalize_platform_events_ai_jobs` | `20260923070000_p3_drop_null_agency_branch`, `20261001160500` | bez vetvy | decisions: prepísaná v PROD | dynamicky |
| `lead_property_matches.matches_*_agency` (4×) | **nie sú v repe** (PROD-only) | – | repo ich nemá | decisions 2026-10-01: zrušené v PROD (8/9) | neznáme → ak existujú, `apply.sql` **zastaví** (nie sú v mape) |

**Čo nie je v repe, ale mohlo by byť v PROD:** politiky z ručných `execute_sql` zásahov (príklad: `matches_*_agency`). Preto `apply.sql` nevychádza zo zoznamu: nájde každú živú politiku s `agency_id IS NULL` a **neznámu nechá zastaviť celú transakciu** (nič sa nezmení, výstup pomenuje politiku, mapu treba doplniť na základe `verify-before.sql` riadok 11).

### Čo robí `apply.sql` (v jednej transakcii)

0. Predpoklad: `profile_agencies_for_auth()` existuje a `authenticated` ju smie volať.
1. Záloha do schémy `wp6_backup` (mimo `public`, mimo API, RLS zapnutá bez politík): `policies_before`, `function_acl_before`. Najstaršia záloha sa neprepisuje.
2. `activities`: `DROP POLICY IF EXISTS activities_select_agency`; `activities_insert_agency` sa zruší len ak existuje náhrada z `20261001170000`, inak `RAISE EXCEPTION` (zrušenie bez náhrady by ticho zlyhalo zápisy `matching` bez leadu — decisions 2026-10-01).
3. Dynamický cyklus: každá politika v `public` s `agency_id IS NULL` v `USING`/`WITH CHECK` sa nahradí definíciou z mapy (21 položiek = stav HEAD, tenant cez `profile_agencies_for_auth()`, rola `authenticated`). Pred každým prepísaním sa overí, že v príslušnej tabuľke (alebo v `leads` pri lead-viazaných) **nie sú riadky s `agency_id IS NULL`**; ak sú, transakcia sa zastaví (prepísanie by ich skrylo tenantom — 193 riadkov `activities` s `agency_id = NULL` zostáva viditeľných len pre service role, tak ako dnes).
4. `REVOKE EXECUTE … FROM PUBLIC, anon, authenticated` + `GRANT … TO service_role` na `rls_audit_snapshot()` (ak existuje).
5. Kontrola v tej istej transakcii: 0 politík s `agency_id IS NULL`, `rls_audit_snapshot` nespustiteľná pre anon/authenticated, `profile_agencies_for_auth` stále spustiteľná pre authenticated. Chyba = ROLLBACK.

Zmena správania, ktorú treba poznať: pôvodné politiky na `lead_closing_windows`, `lead_micro_actions`, `lead_rescue_runs` mali v `20260507140000` rolu `public` (teda aj `anon`); nové majú `authenticated`. Granty pre `anon` sú už zrušené (`20260925110000_rls_anon_lockdown`, UNVERIFIED v PROD), takže praktický dopad je nulový; ak by anon právo ešte malo, po zmene stratí prístup — to je zamýšľané.

### Čo `apply.sql` NEROBÍ (zámerne)

- nemení politiky s inou NULL-vetvou (§4),
- nemení `SECURITY DEFINER` funkcie okrem `rls_audit_snapshot` (§3),
- nemaže ani nepriraďuje 193 historických riadkov `activities` s `agency_id = NULL` (vlastník neznámy),
- nemení kód aplikácie.

## 3. SECURITY DEFINER funkcie so zostávajúcim EXECUTE pre anon/authenticated

`memory/decisions.md` (2026-10-01) uvádza 12 funkcií: `record_brief_click`, `record_brief_open`, `add_price_point`, `compute_bri_score`, `compute_bri_score_v2`, `expire_arbitrage_matches`, `rotate_bri_snapshots`, `get_valuation_tenant`, `match_leads`, `match_properties`, `profile_agencies_for_auth`, `rls_audit_snapshot`. Replay HEAD potvrdzuje 10 z nich ako `SECURITY DEFINER` s EXECUTE pre anon aj authenticated (v replayi je to dôsledok default privileges, rovnako ako v Supabase); `match_leads`/`match_properties` v aktívnych migráciách **nie sú** (len `migrations-archive/20260411_semantic_search.sql`), takže ich PROD definícia je UNVERIFIED. Replay navyše ukázal ďalšie spustiteľné cez anon: `detect_broker_weakness`, `get_supply_demand_gap`, `increment_api_usage` (podľa auditov 2026-09-25 a 2026-10-01 sú „len v migráciách", v PROD neexistovali; dnes UNVERIFIED) a štyri trigger funkcie (`ai_triage_feedback_set_agency`, `calculate_broker_metrics`, `trg_activities_platform_events`, `trg_leads_platform_events`; návratový typ `trigger`, cez RPC sa volať nedajú — REVOKE zbytočný). **Žiadna z funkcií v repe nemá `SET search_path`** (`verify-before.sql` riadok 42 to zmeria v PROD) — samostatná trieda rizika (hijack), tento balík ju nerieši.

Dôležité: `REVOKE … FROM PUBLIC` nestačí; Supabase default privileges dávajú `anon` a `authenticated` explicitný grant, preto treba `REVOKE … FROM anon, authenticated`.

Rola volajúceho vychádza z kódu. `createClient()` z `lib/supabase/server.ts` je klient s cookies a **anon/publishable kľúčom** — bez prihlásenej session (cron, webhook, e-mailový pixel) ide požiadavka ako rola `anon`. `createAdminClient()` je `service_role`. Toto je dôkaz z kódu; skutočné správanie za behu **nemerané** (UNVERIFIED).

| Funkcia | Kto ju volá (súbor) | Rola volajúceho | REVOKE bez zmeny kódu | Navrhovaný krok | Riziko |
|---|---|---|---|---|---|
| `rls_audit_snapshot()` | `scripts/schema-governance-guard.mjs`, `scripts/rls-schema-parity-audit-once.mjs`, `tests/rls/isolation-helpers.ts` | service_role (kľúč `SCHEMA_GUARD_SUPABASE_SERVICE_ROLE_KEY`) | bezpečné | **v `apply.sql`** | P2 |
| `increment_api_usage(text)` | `supabase/functions/data-api-gateway/index.ts` | service_role (`SUPABASE_SERVICE_ROLE_KEY`) | bezpečné, ak existuje | fáza 2a, vlastné GO | P2 |
| `detect_broker_weakness(uuid)` | žiadny volajúci v kóde nenájdený | – | bezpečné, ak existuje; DB-side cron (`pg_cron`) nemeraný | fáza 2a | P2 |
| `get_supply_demand_gap(text)` | edge `data-api-gateway` (service), `api/reports/generate-developer-insights/route.ts` (session) | service_role + authenticated | len `anon` bezpečne | fáza 2b: REVOKE len z `anon` | P2 |
| `add_price_point(...)` | `api/price-trail/route.ts` (session), `lib/price-trail/engine.ts` (admin klient pre sync) | authenticated + service_role | `anon` bezpečne; telo funkcie berie `p_profile_id` od volajúceho — tenantová kontrola v tele **neaudítovaná** | fáza 2b: REVOKE `anon`; audit tela zvlášť | P1 |
| `compute_bri_score(text,uuid)` | `lib/events/bri-score.ts`: `api/events` (session), cron `recompute-bri` (admin) | authenticated + service_role | `anon` bezpečné | fáza 2b: REVOKE `anon` | P1 |
| `compute_bri_score_v2(text,uuid,text)` | `lib/bri/engine.ts` `computeBRI` (session klient; volajúce trasy v `app/api/leads/*` som nerozlíšil jednotlivo), **`lib/inbound/process-lead.ts` ← webhook `inbound-lead` a `api/ai/process-lead`** (`computeBRI` používa `createClient()` bez session ⇒ rola `anon`) | authenticated + **anon (webhook)** | **ROZBIJE** BRI pri príchode leadu z webhooku | fáza 3: najprv PR, ktorý `computeBRI` v `process-lead` pustí cez service klienta; deploy; potom REVOKE `anon`. Samotný REVOKE nerieši tenantovú kontrolu v tele (INSERT do `lead_scores` je nepodmienený — decisions) | P1 |
| `expire_arbitrage_matches()` | cron `api/cron/arbitrage-scan/route.ts` (`createClient()` bez session) | **anon** (cron s `CRON_SECRET` je len ochrana HTTP vrstvy) | **ROZBIJE** expiráciu (chyba sa len zaloguje `console.error`, potichu) | fáza 3: cron na `createAdminClient()`, deploy, REVOKE `anon`+`authenticated` | P1 |
| `rotate_bri_snapshots()` | cron `api/cron/bri-snapshot/route.ts` (`createClient()`) | **anon** | **ROZBIJE** rotáciu BRI snapshotov (cron vráti 500) | fáza 3 ako vyššie | P1 |
| `record_brief_click(uuid,text)`, `record_brief_open(uuid)` | `api/morning-brief/track/click` a `/open` — verejné odkazy/pixel z e-mailu | **anon** (príjemca e-mailu nie je prihlásený) | **ROZBIJE** meranie otvorení/klikov brífu | fáza 3: route na service klienta + validácia `brief_id`, potom REVOKE | P1 |
| `get_valuation_tenant(text)` | `lib/valuation/tenant.ts` ← verejná stránka `app/(marketing)/odhad/[agencySlug]/page.tsx` (`createClient()`), `api/valuation/*` | **anon** (verejný widget) | **ROZBIJE** verejný odhadový widget (zdroj leadov) | **nerevokovať.** `20260720193000` dáva anon/authenticated/service_role EXECUTE zámerne; vracia len branding povolených tenantov | P0 pri zásahu |
| `profile_agencies_for_auth()` | evaluácia RLS na desiatkach tabuliek v kontexte volajúceho | authenticated (+ anon pri verejných čítaniach) | **ROZBIJE VŠETKO** (každé čítanie tenantových tabuliek padne) | **nikdy nerevokovať**; `apply.sql` to po zmene kontroluje | P0 pri zásahu |
| `match_leads(vector,float,int)`, `match_properties(...)` | `api/search/semantic/route.ts` (session, route vyžaduje `auth.getUser()`) | authenticated | `anon` bezpečne | fáza 2b ak existujú. **Pozor:** archívna definícia je `SECURITY DEFINER` bez filtra `agency_id` ⇒ ktokoľvek s EXECUTE a embeddingom dostane `id` + podobnosť naprieč všetkými agentúrami; návratový typ `uuid` nesedí s `leads.id text` (PROD definícia pravdepodobne iná). `verify-before.sql` riadky 43–44 zistia existenciu a `secdef` | P1 (možný únik, UNVERIFIED) |

**Navrhované poradie (od najbezpečnejšieho):** `apply.sql` (politiky + `rls_audit_snapshot`) → fáza 2a (funkcie bez volajúceho/len service) → fáza 2b (REVOKE iba z `anon` tam, kde volá session/service) → fáza 3 (každá po PR s úpravou volajúceho na service klienta, deploy, až potom REVOKE). Každý krok má vlastné GO; po každom `verify-after.sql` a test volajúceho (cron: ručné spustenie s `CRON_SECRET`; webhook: testovací lead; pixel: otvorenie odkazu).

**Fáza 2a/2b — návrh SQL (NEPOUŽITÉ, nie je v `apply.sql`; pred použitím overiť existenciu a volajúcich výstupom `verify-before.sql`):**

```sql
-- 2a: bez volajúceho alebo len service_role (každá guardovaná na existenciu)
DO $$ DECLARE f text; BEGIN
  FOREACH f IN ARRAY ARRAY['public.increment_api_usage(text)', 'public.detect_broker_weakness(uuid)'] LOOP
    IF to_regprocedure(f) IS NOT NULL THEN
      EXECUTE format('revoke execute on function %s from public, anon, authenticated', f);
      EXECUTE format('grant execute on function %s to service_role', f);
    END IF;
  END LOOP;
END $$;
-- 2b: len anon (session a service dalej fungujú)
DO $$ DECLARE f text; BEGIN
  FOREACH f IN ARRAY ARRAY['public.get_supply_demand_gap(text)', 'public.add_price_point(uuid,numeric,text,uuid,text,text,text)',
                           'public.compute_bri_score(text,uuid)'] LOOP
    IF to_regprocedure(f) IS NOT NULL THEN
      EXECUTE format('revoke execute on function %s from public, anon', f);
    END IF;
  END LOOP;
END $$;
```

Rollback fázy 2: `GRANT EXECUTE ON FUNCTION <sig> TO anon, authenticated;` (pôvodný stav z `verify-before.sql` riadok 41 a `proacl`).

## 4. Súvisiace NULL-vetvy mimo rozsahu (len hlásenie)

Replay HEAD ukázal politiky s vetvou iného stĺpca; v PROD UNVERIFIED (`verify-before.sql` riadok 50 ich vypíše, riadok 51 spočíta tabuľky, kde má `anon` akékoľvek právo):

- `buyer_events.buyer_events_agency` — `ALL TO authenticated`, vetva `lead_id IS NULL`: riadky bez leadu čitateľné/zapisovateľné každému prihlásenému tenantovi.
- `competitor_monitoring`, `competitor_activity_logs`, `demand_signals`, `portal_listings`, `listing_price_history`, `strategic_alerts` — politiky pre rolu `public` s vetvou `profile_id IS NULL`; `competitor_monitoring` a `competitor_activity_logs` sú `ALL` (aj zápis). Či `anon` má na tieto tabuľky právo, závisí od `20260925110000_rls_anon_lockdown` (UNVERIFIED).

Odporúčanie: samostatný balík C po P19 balíka B (iný tvar opravy: tieto tabuľky nemajú `agency_id`, kľúčom je `profile_id`).

## 5. Čo sa overí po aplikácii (P19)

1. `verify-after.sql`: 0 politík s `agency_id IS NULL`; `activities_insert_agency`/`_select_agency` neexistujú; 4 politiky na `activities`; RLS zapnutá na tabuľkách z mapy; `rls_audit_snapshot` anon/authenticated `false`, service_role `true`; `profile_agencies_for_auth` pre authenticated `true`; záloha existuje.
2. `visibility-probe.sql` pred aj po: počty riadkov na agentúru v 19 tabuľkách/pohľadoch + `ANON`. Očakávanie: **bez zmeny**. Rozdiel = riadok viditeľný len cez vetvu NULL (zamýšľané zúženie, zapísať) alebo rozbitá prevádzka (rollback).
3. Ručne: dashboard feed a `/activities` (decisions: po zúžení doteraz neotvorené), ranný brief, `schema-governance-guard` v CI (potrebuje `rls_audit_snapshot` so service role).
4. Test volajúceho `rls_audit_snapshot`: spustiť guard s service-role kľúčom (dnes `.github` workflow je mimo write-setu; autor ho nemenil ani nespúšťal).

## 6. Riziká balíka B

| # | Riziko | Trieda | Zmiernenie |
|---|---|---|---|
| B1 | PROD obsahuje politiku, ktorú mapa nepozná | P1 | `apply.sql` sa zastaví, nič sa nezmení; doplniť mapu |
| B2 | V PROD sú riadky s `agency_id IS NULL`; prepísanie by ich skrylo tenantom | P1 | `apply.sql` sa zastaví s názvom tabuľky a počtom; rozhodnutie foundera (priradiť / nechať len service role) |
| B3 | Prepísanie politiky zmení pôvodnú rolu `public` → `authenticated` (3 tabuľky) | P2 | granty pre `anon` už zrušené (UNVERIFIED); `visibility-probe.sql` ANON riadky |
| B4 | UI `/activities` a dashboard feed po zúžení neotvorené (decisions) | P1 | ručný test v P19; rollback pripravený |
| B5 | Zálohu `wp6_backup` zachytáva len `apply.sql`; ak bežal neúplne, rollback sa zastaví | P2 | transakcia je atomická (buď všetko, alebo nič) |
| B6 | REVOKE na `rls_audit_snapshot` rozbije volajúceho, ktorého autor nenašiel (napr. externý skript s anon kľúčom) | P2 | rollback pripravený; guard/CI používajú service role |
| B7 | Fáza 3 (cron, webhook, pixel, widget) — zásah bez úpravy kódu rozbije prevádzku | P0/P1 | **v `apply.sql` nie je**; len po PR + deploy + vlastné GO |
| B8 | `lock_timeout` 5 s na DDL politík | P2 | pri timeoute sa vráti späť; zopakovať |
| B9 | Rollback obnoví bezpečnostnú dieru | P1 | používať len pri rozbitej prevádzke; po oprave nasledujúci pokus |
| B10 | Rozpor repo vs PROD pri `activities_tenant_*` (repo vetvu má, decisions tvrdí 0) | P1 | `verify-before.sql` riadky 11–12 rozhodnú |

## 7. Čo som spustil (lokálne, nie PROD)

Replay 138 migrácií (0 chýb po oprave stubu), snímka politík po každej migrácii, `apply.sql` na čistom HEAD (prepísal presne 2 politiky `activities`), na „PROD-like" klone s vloženými legacy politikami (5 prepísaných, `activities_insert_agency`+`_select_agency` zrušené, `verify-after.sql` všetko `true`), `rollback.sql` vrátil politiky **bajt na bajt** (porovnanie md5 `qual`+`with_check`+`roles` pred a po: IDENTICAL) aj EXECUTE, zastavenie pri neznámej politike a pri riadku s `agency_id IS NULL` (obe overené), `visibility-probe.sql` (beží, nič nezapíše). **Nespustené:** CI `supabase db reset`, `tests/rls/*`, čokoľvek proti PROD.
