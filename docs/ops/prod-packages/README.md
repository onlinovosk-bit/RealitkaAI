# PROD balíky (WP-6) — na predloženie, nič neaplikované

**Stav:** návrh. Všetko je dokument + SQL súbory v `docs/ops/prod-packages/`. Nič z toho sa nespúšťa automaticky a SQL **nie je** v `apps/crm/supabase/migrations/` (nič sa nemôže aplikovať omylom cez `db push`/CI).
**Autor nemal prístup do PROD** (zákaz Supabase/Vercel nástrojov). Preto je stav PROD **UNVERIFIED** a pred každým zásahom treba zmerať. Čo je overené, a čo nie, je vo vnútri každej `mapa-ciest.md`.

Pravidlo foundera, ktoré balíky plnia: pred PROD/RLS zmenou najprv zmapovať všetky cesty (tabuľky, pohľady, funkcie × anon/authenticated/service_role), potom **jeden balík SQL + jeden overovací skript**, dôkaz pred aj po.

## Obsah

| Balík | Čo rieši | Súbory |
|---|---|---|
| **A `demand-activation`** | schéma `lead_demands` + `demand_property_matches` (DEMAND-D1 + D4); flagy ostávajú vypnuté | `demand-activation/`: `mapa-ciest.md`, `verify-before.sql`, `apply.sql`, `verify-after.sql`, `rollback.sql`, `behavior-test.sql` |
| **B `agency-null-policies-close`** | RLS politiky s vetvou `agency_id IS NULL` + `EXECUTE` na `rls_audit_snapshot`; mapa 12+ SECURITY DEFINER funkcií a poradie ich zatvárania | `agency-null-policies-close/`: `mapa-ciest.md`, `verify-before.sql`, `visibility-probe.sql`, `apply.sql`, `verify-after.sql`, `rollback.sql` |

Balíky sú nezávislé. Odporúčané poradie: **A, potom B** (A je čisto aditívny a nič nezapína; B mení existujúce politiky). Ak chce founder len jeden, B má väčší bezpečnostný prínos, A väčší produktový (odomyká budúce zapnutie flagov, ale samo žiadnemu klientovi nič nepridá).

## Poradie krokov (pre každý balík)

1. **Migrácia pred kódom a pred flagom.** Kód pre A (`lib/demand/*`, route, karta) je už v `main` za vypnutými flagmi. Schéma sa musí aplikovať **pred** akýmkoľvek zapnutím `DEMAND_*` flagov. Pre B sa kód nemení; zmeny `SECURITY DEFINER` funkcií, ktoré volá cron/webhook/e-mailový pixel (fáza 3 v `agency-null-policies-close/mapa-ciest.md`), vyžadujú **najprv PR s úpravou volajúceho a deploy, až potom REVOKE**.
2. `verify-before.sql` (a pri B aj `visibility-probe.sql`) — výstup uložiť. Rozhodne, či sa tvrdenia v mape zhodujú s realitou (najmä rozpor stavu A, mapa A §1, a rozpor repa a PROD pri `activities_tenant_*`, mapa B §2).
3. `apply.sql` — jedna transakcia, jedno spustenie, vyžaduje odomykacie slovo nižšie. Pri akejkoľvek zlyhanej kontrole sa celé vráti späť.
4. `verify-after.sql` (+ `visibility-probe.sql`, resp. `behavior-test.sql`) — výstup uložiť vedľa „pred".
5. P19 (nižšie). Až potom ďalší krok.
6. `rollback.sql` len pri zlyhaní P19 a len s vlastným slovom.

## Čo sa overí po aplikácii (P19)

| Balík | Overenie | Pass kritérium |
|---|---|---|
| A | `verify-after.sql` | 27 kontrol `ok = true`; obe tabuľky 0 riadkov; anon bez práv; authenticated iba SELECT; `profile_agencies_for_auth` stále volateľná |
| A | `behavior-test.sql` (voliteľné) | tenant A 1, tenant B 0, anon denied, authenticated INSERT denied; ROLLBACK |
| A | Vercel/appka (manuálne) | `/leads/[id]` sa načíta, v logu žiadne chyby `lead_demands`/`demand_property_matches` (nemerané autorom) |
| B | `verify-after.sql` | 0 politík s `agency_id IS NULL`; `rls_audit_snapshot` anon/authenticated `false`, service_role `true`; `profile_agencies_for_auth` pre authenticated `true`; záloha existuje |
| B | `visibility-probe.sql` pred/po | počty riadkov na agentúru **bez zmeny** (rozdiel = vysvetliť pred pokračovaním) |
| B | CI `schema-governance-guard` + ručne dashboard feed a `/activities` | zelená; UI sa načíta (decisions: po zúžení doteraz neotvorené) |

## Odomykacie slová (presné)

| Slovo | Odomkne | Poznámka |
|---|---|---|
| `GO VERIFY-PROD` | spustenie **iba** `verify-before.sql` / `verify-after.sql` / `visibility-probe.sql` proti PROD (čítanie) agentom; founder ich môže spustiť aj sám bez slova | `behavior-test.sql` do tohto slova nepatrí (zapisuje v transakcii a vracia) |
| `GO DEMAND-SCHEMA` | `demand-activation/apply.sql` | nezapína žiadny flag |
| `GO DEMAND-ROLLBACK` | `demand-activation/rollback.sql` | zastaví sa pri neprázdnych tabuľkách |
| `GO NULL-POLICIES` | `agency-null-policies-close/apply.sql` | politiky + `rls_audit_snapshot`; nič z fázy 2/3 |
| `GO NULL-ROLLBACK` | `agency-null-policies-close/rollback.sql` | vracia bezpečnostnú dieru, len pri rozbitej prevádzke |

Slová **neodomykajú**: zapnutie `DEMAND_EXTRACTION_ENABLED` / `DEMAND_MATCHING_ENABLED`, fázy 2a/2b/3 REVOKE na funkciách, ani merge tohto PR. Každé je samostatné GO.

## Tabuľka rizík

| Trieda | Čo | Balík | Ako sa to drží |
|---|---|---|---|
| **P0** | Zapnutie `DEMAND_EXTRACTION_ENABLED` pred oznámením referenčnému klientovi o spracovaní cez Anthropic (nové spracovanie osobných údajov) | A | balík flagy nemení; predpoklad zapísaný v mape A §6 a v tejto tabuľke; samostatné GO |
| **P0** | REVOKE `EXECUTE` na `profile_agencies_for_auth()` rozbije celú tenantovú izoláciu | B | funkcia je mimo balíka; `apply.sql` aj `verify-after.sql` kontrolujú, že ostala spustiteľná |
| **P0** | REVOKE `get_valuation_tenant` rozbije verejný odhadový widget | B (fáza 3) | funkcia vynechaná, odporúčanie „nerevokovať" |
| **P1** | PROD obsahuje politiku/objekt, ktorý mapa nepozná; alebo riadky s `agency_id IS NULL` | B | `apply.sql` sa zastaví a nič nezmení |
| **P1** | Tabuľky A už v PROD existujú s dátami | A | `rollback.sql` sa zastaví pri akomkoľvek riadku; `apply.sql` je idempotentný |
| **P1** | REVOKE na funkciách volaných cronom/webhookom/e-mailovým pixelom bez úpravy kódu rozbije beh (`rotate_bri_snapshots`, `expire_arbitrage_matches`, `compute_bri_score_v2`, `record_brief_*`) | B (fáza 3) | nie sú v `apply.sql`; najprv PR + deploy |
| **P1** | `match_leads` / `match_properties` (archívna definícia `SECURITY DEFINER` bez filtra agentúry) môžu vracať `id` naprieč tenantmi; PROD definícia UNVERIFIED | B | `verify-before.sql` r. 43–44 zistí; zásah vo fáze 2b |
| **P1** | UI `/activities` a dashboard feed po zúžení politík neotvorené | B | manuálny krok P19, rollback pripravený |
| **P2** | Typový drift PROD (`leads.id` ≠ text) | A | predpoklady v `apply.sql`, ROLLBACK celej transakcie |
| **P2** | `lock_timeout` 5 s na DDL | A, B | pri timeoute sa vráti späť, zopakovať |
| **P2** | Migrácia nie je v `schema_migrations`; neskorší `db push` ju spustí znova | A | idempotentná |
| **P2** | `rls_audit_snapshot` má neznámeho volajúceho | B | kód: len service role; rollback pripravený |

## Čo bolo overené a čo nie

**Overené lokálne (nie PROD):** replay všetkých 138 migrácií na čistej DB (PostgreSQL 16.14 + stub Supabase) prešiel; `apply.sql` oboch balíkov, `verify-*.sql`, `rollback.sql`, `behavior-test.sql`, `visibility-probe.sql` boli spustené na lokálnych DB (čistej, „PROD-like" s vloženými legacy politikami, a so zámerným zlyhaním predpokladov). Podrobnosti v mapách (A §5, B §7).

**Neoverené / nespustené:** čokoľvek proti PROD; skutočný Supabase (len stub); CI `supabase db reset`; `apps/crm/tests/rls/*`; zhoda lokálneho Postgresu s verziou v PROD; chovanie volajúcich funkcií za behu (rola `anon` pre cron/webhook/pixel je odvodená z kódu, nemeraná); Vercel a premenné prostredia.

**Neznáme (pomenované, nie domyslené):** skutočný stav PROD v oboch balíkoch; či `activities_tenant_*` v PROD nesú vetvu NULL (repo áno, decisions tvrdí 0); PROD definícia `match_leads`/`match_properties`; retencia `lead_demands.demand`; `search_path` SECURITY DEFINER funkcií v PROD.

## Zdroje v repe

`docs/STATUS.md`, `memory/decisions.md` (záznamy 2026-10-01 TENANT-ISOLATION-WALL, PROD-MIGRATION-AUDIT, ACTIVITIES-INSERT-AGENCY-KEY, 2026-09-23 P-3, DEMAND-D1/D4), `docs/architecture/demand-contract-v1.md`, `docs/architecture/matching-input-contract-v1.md`, `docs/reports/2026-09-29-llm-callsite-pii-audit.md`, `docs/legal/2026-10-05-anthropic-subprocesor-tlacivo.md`, migrácie v `apps/crm/supabase/migrations/`.
