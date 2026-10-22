# Rozhodnutie 2026-10-16 — portal_listings (verejné vs. tenant-private) a 187 sirotských `activities`

Stav: **NÁVRH NA ROZHODNUTIE FOUNDERA. Nič z toho nebolo spustené** (DB len SELECT, žiadny commit/push).
Súvisí s: `docs/ops/prod-packages/rls-rest-close/` (balík C, aplikovaný 2026-10-13, dôkaz `DOKAZ-APPLY-2026-10-13.md`).
PROD projekt: `ypgajkhqtbriqqmyawyv`. Dôkazy zozbierané 2026-10-16, iba agregáty, žiadne osobné údaje v tomto memo.

## 0. TL;DR

| # | Otázka | Odporúčanie | GO slovo |
|---|---|---|---|
| 1 | `portal_listings` / `listing_price_history`: verejné alebo tenant-private? | **Možnosť B** — zdieľaná trhová cache čitateľná len pre prihlásených (`authenticated`), anon nie; osobné údaje predajcu sa do tabuľky nikdy neukladajú (stĺpce `seller_*` sa vyprázdnia/zakážu). | `GO PORTAL-B` |
| 2 | 187 sirotských `activities` | **Možnosť B** — archivovať do zamknutej tabuľky a z `activities` zmazať; archív zmazať po retencii (90 dní). | `GO ORPHAN-ARCHIVE` |

Oba kroky sú malé, reverzibilné a nezvyšujú tržby. Podľa PRIME DIRECTIVE ide o hygienu rizika, nie o feature — preto nič väčšie než jedna transakcia.

## 1. Evidencia (všetko READ-ONLY, `mcp__Supabase__execute_sql`)

### 1.1 Politiky a granty (dotaz: `pg_policies` + `information_schema.role_table_grants`)
- `portal_listings`: `users see own or public listings` — SELECT, rola `public`, `USING (profile_id IS NULL OR profile_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid()))`; `service role listings full access` — ALL, len `service_role`.
- `listing_price_history`: `users see own price history` — SELECT, rola `public`, rovnaká `IS NULL` vetva cez `listing_id`; `service role price history` — ALL, len `service_role`.
- Granty po balíku C: `anon` = SELECT, `authenticated` = SELECT, `service_role` = všetko (obe tabuľky). Zápis pre anon/authenticated je zrušený (potvrdené).
- Dôsledok: **anon dnes cez REST číta každý riadok s `profile_id IS NULL`.** Politika je rola `public`, nie `authenticated`.

### 1.2 Počty (dotaz: `select count(*)` nad tabuľkami)
- `portal_listings` = **0**, `listing_price_history` = **0** → dnes nič nevyteká.
- `activities` = 194 celkom, **187** s `agency_id IS NULL`, `_bak_rls_rest_activities` = **7**.
- Z 187 sirotských: 0 je v zálohe, 0 má `lead_id`, 0 má `profile_id` (nie je ako ich priradiť), 173 má neprázdne `meta`.

### 1.3 Schéma `portal_listings` — dôležité zistenie
Tabuľka má stĺpce `seller_name`, `seller_phone`, `seller_email`, `description`, `street`, `lat`, `lng`. Teda **štruktúra dovoľuje uložiť osobné údaje predajcu**, a politika by ich pri `profile_id IS NULL` ukázala aj neprihlásenému. Mapa zdrojov (`master-data-sourcing-map.md`, Zhluk 5) hovorí: fakty inzerátu (cena, plocha, lokalita, dátum) sú obhájiteľné, **osobné údaje predajcu = GDPR NIE**, ToS + právo na databázu = riziko, preferovať oficiálne partnerstvo/API.

### 1.4 Kód (grep `apps/`)
Čítanie `portal_listings` / `listing_price_history` ide výhradne cez **session klienta `createClient()`** (rola `authenticated` alebo anon bez session), nie cez service role:
- `apps/crm/src/lib/hub/competition-radar.ts` (r. 16 `createClient()`), `apps/crm/src/lib/arbitrage/scan.ts` (r. 38, 193, 226, 288), `apps/crm/src/lib/arbitrage/price-history.ts` (r. 28, 49, 94), `apps/crm/src/lib/price-trail/engine.ts` (r. 79–283).
- `createAdminClient()` sa používa len na zápis z cronu (`scan.ts` r. 162, `engine.ts` r. 46).
- Žiadny anon/verejný route nečíta tieto tabuľky (neoverené pre `apps/` mimo `apps/crm/src`; grep cez `src` a `supabase` nenašiel iný konzument).
- Migrácia `20260426120111_arbitrage_engine.sql` r. 11: `-- null profile_id = public/shared cache (Bazoš public feed)` — pôvodný zámer je zdieľaná cache.
- `apps/crm/docs/audit/AUDIT-OPEN-QUESTIONS.md` r. 52: `arbitrage-scan` cron beží nad prázdnou tabuľkou, feed bridge je POST-V1.

### 1.5 Sirotské `activities` — rozdelenie (dotaz: group by type/entity_type/source/severity, bez `agency_id`, mimo zálohy)
| type / entity_type / source | n | rozsah created_at |
|---|---|---|
| Používateľ / profile / team | 127 | 2026-03-20 … 2026-04-29 |
| Sales Funnel / saas_lead / sales | 22 | 2026-03-20 … 2026-07-07 |
| Matching / matching | 10 | 2026-03-17 … 2026-09-29 |
| AI / ai_recommendations | 7 | 2026-03-17 … 2026-03-27 |
| Nehnuteľnosť / property (inventory) | 9 | 2026-03-17 … 2026-04-13 |
| Matching / property | 4 | 2026-03-18 … 2026-04-13 |
| Lead / lead / crm | 5 | 2026-05-26 … 2026-05-27 |
| AI Scoring / scoring | 2 | 2026-03-25 … 2026-04-19 |
| Úloha / task | 1 | 2026-03-18 |

Po mesiacoch: marec 56, apríl 110, máj 7, jún 1, júl 11, september 2 (spolu 187). 183 z 187 je staršie než 2026-07-08, teda ide o staré demo/seed/pred-RLS záznamy. Všetky riadky majú vyplnené `actor_name` (osobné údaje: meno aktéra), preto sa nesmú len tak ponechať bez účelu (čl. 5(1)(e) GDPR, minimalizácia uchovávania).
Pozn.: 2 záznamy zo septembra (Matching) znamenajú, že niečo **stále zapisuje bez `agency_id`** — zdroj zápisu nebol zistený (otvorená neznáma, viď 4).

## 2. Rozhodnutie 1 — `portal_listings` a `listing_price_history`

### Možnosti
**A — Verejné trhové dáta (status quo).** Politiky sa nemenia; anon aj authenticated čítajú `profile_id IS NULL`.
- Pre: nulová práca, sedí na pôvodný zámer „public/shared cache".
- Proti: anon číta cez REST celú databázu inzerátov = hotový scrapovateľný dataset aj pre konkurenciu, a presne to je „právo na databázu" riziko z mapy; stĺpce `seller_*` by sa po prvom importe odhalili svetu (GDPR). Rozhodnutie „je to verejné" by malo byť vedomé, nie dedičstvo defaultu.

**B — Zdieľaná trhová cache, len pre prihlásených + zákaz osobných údajov (ODPORÚČANÉ).**
- Politiky na `TO authenticated`; `profile_id IS NULL` = zdieľané fakty inzerátu čitateľné každým prihláseným tenantom (to je to, čo kód potrebuje: radar, arbitráž, price-trail čítajú cez session klienta). Riadky s `profile_id = <môj>` zostávajú moje.
- `anon` stráca SELECT (REVOKE).
- `seller_name/phone/email` sa nesmú plniť: CHECK constraint (`... IS NULL`) alebo REVOKE stĺpcov; fakty-only ingest. `description` a `street` ostávajú len ak zdroj/ToS dovolí — pri ingeste prejsť `gdpr-advisor` (skill v tomto repo nie je dostupný, balancing test treba zdokumentovať ručne, 6(1)(f) + čl. 14).
- Pre: zachová funkčnosť kódu (nič sa nezmení, tabuľky sú prázdne), zavrie anon cestu, zakóduje pravidlo „žiadne osobné údaje" do schémy, nie do dobrej vôle. Cena: 1 transakcia.
- Proti: zdieľaná cache sa stále tvorí z portálov (ToS/DB-right riziko ostáva, kým nie je partnerstvo); authenticated tenant môže prečítať všetky zdieľané riadky (zámer).

**C — Plne tenant-private.** `profile_id NOT NULL`, politika len „vlastné".
- Pre: najčistejšia izolácia, žiadna zdieľaná cache.
- Proti: rozbije zámer zdieľanej Bazoš cache (každý tenant by si musel skenovať sám a duplikovať dáta/náklady), `ALTER ... SET NOT NULL` je zmena schémy, a kód, ktorý by zapisoval s `profile_id = NULL` (cron cez admin klient), by prestal fungovať. Najvyššia cena, nízky úžitok pri 0 riadkoch.

### Odporúčanie: **B**
Dôvod: kód čerpá cez session klienta, takže `authenticated` stačí; anon nemá legitímny dôvod čítať trhovú databázu; GDPR riziko leží v `seller_*` stĺpcoch, ktoré treba zablokovať teraz, kým sú tabuľky prázdne (zmena je najlacnejšia pri 0 riadkoch).

### SQL pre B (NESPUSTENÉ)
```sql
BEGIN;
-- predpoklad: tabuľky prázdne, inak ABORT
DO $$ BEGIN
  IF (SELECT count(*) FROM public.portal_listings) <> 0 THEN
    RAISE EXCEPTION 'PREDPOKLAD: portal_listings nie je prazdna';
  END IF;
END $$;

DROP POLICY "users see own or public listings" ON public.portal_listings;
CREATE POLICY "authenticated see own or shared listings" ON public.portal_listings
  FOR SELECT TO authenticated
  USING (profile_id IS NULL
         OR profile_id IN (SELECT p.id FROM public.profiles p WHERE p.auth_user_id = auth.uid()));

DROP POLICY "users see own price history" ON public.listing_price_history;
CREATE POLICY "authenticated see own or shared price history" ON public.listing_price_history
  FOR SELECT TO authenticated
  USING (listing_id IN (
    SELECT l.id FROM public.portal_listings l
    WHERE l.profile_id IS NULL
       OR l.profile_id IN (SELECT p.id FROM public.profiles p WHERE p.auth_user_id = auth.uid())));

REVOKE SELECT ON public.portal_listings        FROM anon;
REVOKE SELECT ON public.listing_price_history  FROM anon;

-- osobné údaje predajcu sa neukladajú (fakty-only)
ALTER TABLE public.portal_listings
  ADD CONSTRAINT portal_listings_no_seller_pii
  CHECK (seller_name IS NULL AND seller_phone IS NULL AND seller_email IS NULL);
COMMIT;

-- ROLLBACK (GO PORTAL-ROLLBACK):
-- BEGIN;
-- ALTER TABLE public.portal_listings DROP CONSTRAINT portal_listings_no_seller_pii;
-- GRANT SELECT ON public.portal_listings, public.listing_price_history TO anon;
-- DROP POLICY "authenticated see own or shared listings" ON public.portal_listings;
-- DROP POLICY "authenticated see own or shared price history" ON public.listing_price_history;
-- CREATE POLICY "users see own or public listings" ON public.portal_listings FOR SELECT TO public
--   USING (profile_id IS NULL OR profile_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()));
-- CREATE POLICY "users see own price history" ON public.listing_price_history FOR SELECT TO public
--   USING (listing_id IN (SELECT id FROM public.portal_listings WHERE profile_id IS NULL
--     OR profile_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid())));
-- COMMIT;
```
Po aplikovaní: `verify` = `select policyname, roles from pg_policies where tablename in ('portal_listings','listing_price_history')` (všetko `{authenticated}`) a `has_table_privilege('anon','public.portal_listings','SELECT') = false`.

SQL pre A: žiadne (status quo). SQL pre C (NESPUSTENÉ):
```sql
BEGIN;
DROP POLICY "users see own or public listings" ON public.portal_listings;
CREATE POLICY "own listings" ON public.portal_listings FOR SELECT TO authenticated
  USING (profile_id IN (SELECT p.id FROM public.profiles p WHERE p.auth_user_id = auth.uid()));
DROP POLICY "users see own price history" ON public.listing_price_history;
CREATE POLICY "own price history" ON public.listing_price_history FOR SELECT TO authenticated
  USING (listing_id IN (SELECT l.id FROM public.portal_listings l
         WHERE l.profile_id IN (SELECT p.id FROM public.profiles p WHERE p.auth_user_id = auth.uid())));
REVOKE SELECT ON public.portal_listings, public.listing_price_history FROM anon;
ALTER TABLE public.portal_listings ALTER COLUMN profile_id SET NOT NULL;  -- tabuľka musí byť prázdna
COMMIT;
```

## 3. Rozhodnutie 2 — 187 sirotských `activities`

Fakt: záznamy nemajú `agency_id`, `lead_id` ani `profile_id`, takže **nejestvuje dôkaz, komu patria**. Žiadna politika ich neukáže nikomu okrem service role. Nie sú teda bezpečnostná diera (nič nevyteká), ale sú nevyužité osobné údaje (`actor_name`) bez účelu.

### Možnosti
**A — Zmazať.** `DELETE ... WHERE agency_id IS NULL`. Najjednoduchšie, nevratné (okrem PITR). Pre: čistá DB, minimalizácia. Proti: strata možného auditného/ladiaceho kontextu (127 z nich sú udalosti tímu z marca–apríla).

**B — Archivovať do zamknutej tabuľky, z `activities` zmazať, archív po retencii zmazať (ODPORÚČANÉ).** Pre: reverzibilné, `activities` je čistá (po tom možno neskôr pridať `agency_id SET NOT NULL`, čo zabráni opakovaniu), archív bez grantov pre klientov (rovnaký vzor ako `_bak_rls_rest_activities`), retencia 90 dní naplní čl. 5(1)(e). Proti: jedna tabuľka navyše na čas retencie.

**C — Priradiť tenantovi.** Pre: nič sa nestratí. Proti: **bez dôkazu vlastníctva** (0 riadkov s lead/profile) by išlo o vymyslené priradenie — porušuje dôkazovú bránu (CLAUDE.md pravidlo 8) a riskuje, že cudzia agentúra uvidí cudzie záznamy. Nepriraďovať, kým to niekto nezávisle nepotvrdí. Neodporúčam.

### Odporúčanie: **B**
Skombinované s vyšetrením, **kto stále zapisuje riadky bez `agency_id`** (2 záznamy zo septembra 2026, typ Matching). Bez opravy zdroja sa siroty budú znova tvoriť; archivácia je potom len jednorazové čistenie.

### SQL pre B (NESPUSTENÉ)
```sql
BEGIN;
DO $$ BEGIN
  IF (SELECT count(*) FROM public.activities WHERE agency_id IS NULL) <> 187 THEN
    RAISE EXCEPTION 'PREDPOKLAD: pocet sirotskych <> 187 (stav sa zmenil, over znova)';
  END IF;
END $$;

CREATE TABLE public._arch_orphan_activities AS
  SELECT a.*, now() AS archived_at
  FROM public.activities a
  WHERE a.agency_id IS NULL;
ALTER TABLE public._arch_orphan_activities ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public._arch_orphan_activities FROM PUBLIC, anon, authenticated;
COMMENT ON TABLE public._arch_orphan_activities IS
  'Siroty z activities (agency_id NULL, 2026-10-16). Retencia 90 dni, zmazat po 2027-01-14. Rozhodnutie docs/decisions/2026-10-16-portal-orphans.md';

DO $$ BEGIN
  IF (SELECT count(*) FROM public._arch_orphan_activities) <> 187 THEN
    RAISE EXCEPTION 'archiv nema 187 riadkov';
  END IF;
END $$;

DELETE FROM public.activities a
USING public._arch_orphan_activities o
WHERE a.id = o.id AND a.agency_id IS NULL;
COMMIT;

-- ROLLBACK (GO ORPHAN-ROLLBACK), do vypršania retencie:
-- INSERT INTO public.activities
--   SELECT (a).* FROM (SELECT o::public.activities AS a FROM public._arch_orphan_activities o) s;
--   -- ak cast zlyhá, vymenovať stĺpce explicitne (archív má navyše archived_at)

-- Po retencii (>= 2027-01-14), samostatné GO:
-- DROP TABLE public._arch_orphan_activities;
```
Pozn.: `activities` má trigger `trg_activities_platform_events` (SECURITY DEFINER); či sa spúšťa aj na DELETE, **nebolo overené** — pred GO skontrolovať `pg_trigger` pre `activities`.

SQL pre A (NESPUSTENÉ): `DELETE FROM public.activities WHERE agency_id IS NULL;` (očakávaný počet 187, over predtým).
SQL pre C: zámerne neuvedené (nemá dôkaz, viď vyššie).

Voliteľne po B (samostatné GO, až po oprave zdroja zápisu): `ALTER TABLE public.activities ALTER COLUMN agency_id SET NOT NULL;`

## 4. Otvorené neznáme (nevymýšľať)
1. Ktorý kód/trigger zapisuje `activities` bez `agency_id` (2 riadky zo septembra 2026) — nezistené, treba grep zápisov + `pg_trigger`.
2. Či `trg_activities_platform_events` reaguje na DELETE — neoverené.
3. Zdroj dát pre `portal_listings`: v mape je Zhluk 5 stále SIVÁ, partnerstvo s portálmi neoverené; ingest nemá schválený zdroj.
4. Existuje `gdpr-advisor` skill? V tomto repo (`.claude/skills`) sú len `kontrolor`, `rau`, `strategic-analysis`, `task-loop` — GDPR lens je tu aplikovaný ručne podľa `master-data-sourcing-map.md`; formálny balancing test pre portálový ingest chýba.

## 5. Constitution v2 (skrátený 12-otázkový check)
- **Rozhodnutie 1 (B):** Q1 (zaplatí klient?) — nie priamo; Q8 (timing) — ingest portálov je „príliš skoro" (feed bridge POST-V1, zdroj nie je schválený) → **ingest = BACKLOG (veto)**. Samotná úprava politík/CHECK (jedna transakcia, riziková hygiena pred prvým importom, MVP < 1 deň, Q9 áno) = **BUILD (hygiena, nie feature)**.
- **Rozhodnutie 2 (B):** Q1 nie, Q2 nie, Q3 nie → žiadna tržbová hodnota; ale znižuje GDPR expozíciu (mesiace starých osobných údajov bez účelu) a zabraňuje budúcemu leaku. **BUILD ako malá hygiena**, odporúčam spojiť s balíkom D, aby to nebol samostatný cyklus.
- Zápis do `memory/decisions.md` po GO: „BUILD hygiena / BACKLOG ingest portálov" + dôvod vyššie.

## 6. Čo od foundera potrebujem
Jedna odpoveď: `GO PORTAL-B` a/alebo `GO ORPHAN-ARCHIVE` (alebo iné písmeno pri každej otázke). Žiadne ďalšie vstupy; nespustí sa nič bez explicitného GO a bez zelených `verify` dotazov pred aj po.
