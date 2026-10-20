# Balík A `demand-activation` — mapa ciest

**Stav dokumentu:** návrh na predloženie, nič neaplikované. Autor nemal žiadny prístup do PROD (zákaz Supabase/Vercel nástrojov), preto **každé tvrdenie o stave PROD je UNVERIFIED**, kým founder nespustí `verify-before.sql`. Tvrdenia o repe sú overené čítaním súborov a replayom migrácií (pozri §5).

## 1. Rozpor v stave PROD (rozhodne meranie, nie dohad)

| Zdroj | Tvrdenie | Stav |
|---|---|---|
| zadanie WP-6 (odkaz na `docs/STATUS.md:32`) | `lead_demands` a `demand_property_matches` v PROD chýbajú | UNVERIFIED |
| `docs/STATUS.md` (riadky 50 a 95 na `main` e9ece0f) | „PROD migrácie D1 + D4 overené 2026-10-02: tabuľky existujú, 0 riadkov" | UNVERIFIED (zápis z inej session, nie z tejto) |
| `memory/decisions.md` | staršie zápisy: „sú zámerne neaplikované"; mladší stav v STATUS.md hovorí opak | UNVERIFIED |

`apply.sql` je napísaný tak, aby bol bezpečný v oboch prípadoch (idempotentný: `IF NOT EXISTS`, `DROP POLICY IF EXISTS`, opakované `REVOKE/GRANT`). `verify-before.sql` riadky 10–13 povedia, ktorý prípad nastal. Ak tabuľky už existujú, balík slúži len na zosúladenie politík/grantov s repom a na dôkaz „pred/po".

## 2. Objekty, ktoré balík vytvára (z repa)

Zdroj: `apps/crm/supabase/migrations/20260929120000_lead_demands.sql` (D1) a `20260930120000_demand_property_matches.sql` (D4). `apply.sql` obsahuje ich text doslova + predpoklady a kontrolu po aplikácii.

| Objekt | Detail |
|---|---|
| `public.lead_demands` | `id uuid PK`, `agency_id uuid NOT NULL → agencies(id) ON DELETE CASCADE`, `lead_id text NOT NULL → leads(id) ON DELETE CASCADE`, `contract_version`, `status CHECK (ok/no_text/llm_error/invalid_output/disabled)`, `demand jsonb NOT NULL`, `known_fields`, `core_complete`, `extractor`, `input_chars`, `extracted_at`, `created_at` |
| `public.demand_property_matches` | `id uuid PK`, `agency_id NOT NULL → agencies`, `lead_id → leads`, `demand_record_id uuid NOT NULL → lead_demands(id) ON DELETE CASCADE`, `property_id text → properties(id)`, `score numeric(4,3) CHECK 0..1`, `fields jsonb`, `engine`, `UNIQUE (demand_record_id, property_id)` |
| Indexy | `lead_demands_lead_latest_idx (lead_id, created_at DESC)`, `lead_demands_agency_created_idx`, `demand_property_matches_lead_idx`, `demand_property_matches_agency_idx` (+ 2× PK, 1× UNIQUE = spolu 7) |
| RLS | `ENABLE ROW LEVEL SECURITY` na oboch (nie FORCE) |
| Politiky | po jednej: `lead_demands_select_tenant`, `demand_property_matches_select_tenant`; `FOR SELECT TO authenticated USING (agency_id IN (SELECT public.profile_agencies_for_auth()))`. Žiadna INSERT/UPDATE/DELETE politika, žiadna vetva `IS NULL` (`agency_id NOT NULL`) |
| Pohľady, funkcie, triggery, sekvencie, realtime | **žiadne** (UUID kľúče, nič v `supabase_realtime`) |
| Odchýlka balíka od migrácií | jediná: explicitný `GRANT ALL … TO service_role` (repo to rieši plošne cez `ALTER DEFAULT PRIVILEGES` v `20260613000002`; či to platí v PROD, je UNVERIFIED) + `NOTIFY pgrst, 'reload schema'` |

## 3. Matica ciest: objekt × rola (stav PO aplikácii)

| Objekt | anon | authenticated | service_role | Kto to reálne používa (kód) |
|---|---|---|---|---|
| `lead_demands` | žiadne právo (REVOKE ALL) | iba SELECT, len riadky vlastnej agentúry | všetko (obchádza RLS) | zápis: `lib/demand/store.ts` (`admin.from("lead_demands").insert`), volané z `api/acquire/email/route.ts` cez `scheduleDemandExtraction` a zo skriptu; čítanie: `api/leads/[id]/demand-matches/route.ts` (session klient) |
| `demand_property_matches` | žiadne právo | iba SELECT, vlastná agentúra | všetko | zápis: `lib/demand/match-store.ts`, `scripts/demand-match-run.ts` (service); čítanie: `api/leads/[id]/demand-matches/route.ts` |
| `profile_agencies_for_auth()` (existujúca) | EXECUTE (Supabase default) | **EXECUTE nevyhnutné** — politiky ju volajú v kontexte volajúceho | EXECUTE | RLS na desiatkach tabuliek. **V tomto balíku sa nemení a NESMIE sa zúžiť** (balík B ju výslovne vynecháva) |
| Nepriame cesty | – | PostgREST embed `properties(title, location, price)` v route `demand-matches` ide cez RLS `properties_tenant` | – | – |

Tenantová hranica: `agency_id` je `NOT NULL` od prvého dňa, takže vetva `agency_id IS NULL`, ktorú balík B zatvára inde, tu nemôže vzniknúť. `ON DELETE CASCADE` z `leads` znamená, že zmazanie leadu zmaže aj jeho demand záznamy (výhoda pre výmaz podľa GDPR; naopak mazanie leadu v prevádzke zmaže dôkazy extrakcie).

## 4. Závislosti a poradie

Musia existovať v PROD **pred** aplikáciou (`apply.sql` ich overuje a pri nesúlade sa celá transakcia vráti späť):

1. `public.agencies (id uuid)` — baseline `20260310_baseline_core_schema.sql`.
2. `public.leads (id text)` — baseline; v PROD je typ `leads.id` UNVERIFIED (repo viackrát hlási drift PROD vs repo).
3. `public.properties (id text, agency_id, …)` + stĺpce, ktoré číta `match-store.ts`: `type, location, price, rooms_count, usable_area, transaction_type, status` (`verify-before.sql` riadok 30 vypíše chýbajúce).
4. `public.profile_agencies_for_auth()` — `20260419_enterprise_rls_profile_link.sql`, neskôr prepísaná v `20260925210000` a `20261006120000`.

Poradie migrácií: D1 (`20260929120000`) **pred** D4 (`20260930120000`), lebo D4 má FK na `lead_demands`. V `apply.sql` je to tak. Žiadna iná neaplikovaná migrácia z repa nie je pre tieto dve nutná (inak by CI replay nepreišiel; pozri §5).

Poradie voči kódu: migrácia **pred** zapnutím flagov. Kód (`lib/demand/*`, route, karta na leade) je v `main` už teraz a je za flagmi. Pozor na ticho: ak tabuľky chýbajú, `GET /api/leads/[id]/demand-matches` ignoruje chybu čítania `lead_demands` a vráti `reason: "no_demand"` (nespadne), takže chýbajúca tabuľka sa v UI neprejaví — preto je potrebný explicitný dôkaz z `verify-*.sql`, nie „UI funguje".

## 5. Prejde migrácia na čistej DB? — ÁNO (s obmedzením)

Meranie: PostgreSQL 16.14 (lokálny), čistá DB, stub Supabase (roly `anon/authenticated/service_role`, schéma `auth` s `auth.uid()/role()/jwt()` a `auth.users`, schéma `extensions` s `pgcrypto`, publikácia `supabase_realtime`, default privileges ako Supabase). Všetkých **138** súborov z `apps/crm/supabase/migrations/` aplikovaných v lexikálnom poradí, každý samostatne s `ON_ERROR_STOP`: **138/138 prešlo**, vrátane oboch demand migrácií. Prvý beh hlásil 3 chyby, všetky boli nedostatkom môjho stubu (chýbajúca publikácia, `gen_salt` v schéme `extensions`, `auth.users.email_confirmed_at`), nie chybou migrácií.

Z `apply.sql` (s predpokladmi a kontrolou) som na lokálnej DB overil: čisté vytvorenie (0 chýb), `verify-after.sql` 27/27 `true`, opakované spustenie (idempotencia, 0 chýb), `rollback.sql` zastaví pri riadku v tabuľke a pri prázdnych tabuľkách ich zruší, opätovné `apply.sql` po rollbacku prejde, `behavior-test.sql` (tenant A vidí 1, tenant B 0, anon denied, authenticated INSERT denied). Repo má navyše vlastný test `apps/crm/tests/rls/lead-demands-rls.test.ts` a `demand-matches-rls.test.ts`, ktoré som nespúšťal.

Čo to NEDOKAZUJE: skutočný Supabase (len môj stub), verziu Postgresu v PROD, skutočné typy stĺpcov v PROD (to zmeria `verify-before.sql`, predpoklady v `apply.sql`), a že CI `supabase db reset` prejde (ten som nespúšťal).

## 6. Čo sa po aplikácii musí zapnúť — a čo NIE

**Tento balík nezapína nič.** Obe tabuľky ostanú prázdne, kým sú flagy vypnuté.

| Flag (Vercel env, nie SQL) | Podmienka zapnutia | Stav po balíku |
|---|---|---|
| `DEMAND_EXTRACTION_ENABLED=true` (vyžaduje aj `ANTHROPIC_API_KEY`) | **Predpoklad: referenčný klient dostal oznámenie o spracovaní cez Anthropic** (čl. 6 DPA, `docs/legal/2026-10-05-anthropic-subprocesor-tlacivo.md`, `docs/architecture/demand-contract-v1.md` §Zapnutie), backfill gate = PASS, audit volaní LLM bez otvorených PATCH (`docs/reports/2026-09-29-llm-callsite-pii-audit.md`), právny základ čl. 6 ods. 1 písm. f) s testom proporcionality (GDPR brána, CLAUDE.md pravidlo 5) | **VYPNUTÝ** |
| `DEMAND_MATCHING_ENABLED=true` | najprv zmerať D1; samostatný prepínač | **VYPNUTÝ** |

Vyžadované poradie (z `memory/decisions.md`, D4 záznam): migrácie D1+D4 → `DEMAND_EXTRACTION_ENABLED` → zmerať → `DEMAND_MATCHING_ENABLED` → `demand-match-run --apply` na históriu. Každý krok je samostatné GO foundera. Stav oznámenia klientovi je v repe **UNVERIFIED** (STATUS.md: „Anthropic v DPA + /legal/sub-processors" nezaškrtnuté).

Dáta: `demand` jsonb nesie doslovné citáty z textu záujemcu = osobné údaje. Retencia pre tieto tabuľky v repe **nie je definovaná** (NEZNÁME) — nie je blokér pre prázdne tabuľky, ale musí sa rozhodnúť pred zapnutím flagu.

## 7. Čo sa overí po aplikácii (P19)

1. `verify-after.sql` — všetky riadky `ok = true` (27 kontrol: RLS, 1 politika/tabuľka, granty anon/authenticated/service_role, NOT NULL `agency_id`, FK počty, indexy, 0 riadkov, `profile_agencies_for_auth` stále volateľná).
2. `behavior-test.sql` (voliteľné, s GO) — viditeľnosť pre tenanta A/B a anon, zápis authenticated zablokovaný, na konci ROLLBACK.
3. Vercel: žiadna zmena env; po aplikácii overiť, že `/leads/[id]` sa načíta (karta zhôd ukáže „bez dopytu"), a v logu chýbajú chyby `lead_demands`/`demand_property_matches`. Nemerané autorom.
4. Porovnať výstupy `verify-before.sql` a `verify-after.sql` a uložiť oba do dôkazov.

## 8. Rizika balíka A

| # | Riziko | Trieda | Zmiernenie |
|---|---|---|---|
| A1 | Typový drift PROD (`leads.id` ≠ text apod.) → `CREATE TABLE` zlyhá | P2 | predpoklady v `apply.sql`, celá transakcia sa vráti späť, nič sa nezmení |
| A2 | Tabuľky v PROD už existujú s inými politikami (z ručného `execute_sql`) | P1 | `DROP POLICY IF EXISTS` + `CREATE` zosúladí; `verify-before.sql` riadok 45 ukáže pôvodné politiky pred zásahom (uložiť) |
| A3 | Tabuľky v PROD už existujú s riadkami → `rollback.sql` by zmazal dáta | P1 | rollback sa zastaví pri akomkoľvek riadku |
| A4 | Zapnutie flagu pred oznámením klientovi (nové spracovanie osobných údajov cez Anthropic) | P0 (právne) | tento balík flagy nemení; zapnutie je samostatné GO s predpokladom oznámenia |
| A5 | `lock_timeout` 5 s: DDL na `agencies/leads/properties` (FK) potrebuje krátky zámok | P2 | pri timeoute sa transakcia vráti, zopakovať mimo špičky |
| A6 | Migrácia sa nezapíše do `supabase_migrations.schema_migrations`; neskorší `db push` ju spustí znova | P2 | je idempotentná, druhé spustenie je bezpečné (otestované) |
| A7 | Retencia a obsah `demand` (citáty) nerozhodnuté | P1 | pred zapnutím flagu, nie pred aplikáciou schémy |
