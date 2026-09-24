# 2026-09-24 — F2B: nácvik proti nameranému PROD tvaru (nahrádza F2)

**Brána:** `GO F2B-PROD-SHAPE-REHEARSAL`. Bez zápisu do PROD, bez Supabase branchu,
bez deploy. Čítanie PROD + lokálna simulácia.

## Prečo nie Supabase branch (pôvodná F2)

Branch sa nevytvoril. Supabase docs hovoria, že preview branch je
**postavený prehratím migračnej histórie proti čistej databáze** a že je to
*„equivalent to running `supabase db reset` locally"*. Čiže by nereprodukoval
PROD, kde tie objekty existujú **mimo migrácií** — a práve to je riziko, ktoré
má F2 merať. Bol by to platený resource za dôkaz, ktorý už máme dvakrát
(lokálny replay 111/111 a CI `Reset DB` na `b38d4a1e`).

Navyše tá istá stránka popisuje náš stav ako typickú príčinu `MIGRATIONS_FAILED`:
migračná história nesedí so živou schémou, lebo sa robili zmeny mimo migrácií.

## Nový nález: `schema_migrations` nepopisuje zostaviteľnú históriu

Pokus postaviť schému **len z 48 migrácií zapísaných v `schema_migrations`**
(bez neaplikovaných) skončil **OK=16, FAILED=32**. Padá na chýbajúcich core
tabuľkách — `leads`, `profiles`, `agencies`, `activities`, `properties`,
`tasks`, `portal_listings`, `lead_scores`, `lead_property_matches`,
`inbound_mailboxes` a na chýbajúcej funkcii `profile_agencies_for_auth()`.

Príčina: baseline `20260310_baseline_core_schema.sql` a
`20260921195500_legalize_inbound_mailboxes.sql` sú **v neaplikovanej dávke**,
hoci ich objekty v PROD existujú. Vznikli mimo migračného systému.

**Nie je to teda len „63 neaplikovaných". Aplikovaná časť sama o sebe je
nekoherentná** — z `schema_migrations` sa táto databáza postaviť nedá.

Po doplnení oboch out-of-band migrácií základ prešiel: **OK=50, FAILED=0**.

## Rozsah odchýlky, ktorú čistý replay nereprodukuje

Z objektov, ktoré tých 63 migrácií vytvára, v základe postavenom z migrácií
chýba (= v PROD vznikli mimo nich alebo ich dodá až neaplikovaná dávka):

| trieda | dotknutých | chýba v základe |
|---|---|---|
| tabuľky | 42 | 32 |
| indexy | 69 | 66 |
| policies | 80 | 70 |
| triggery | 8 | 8 |
| funkcie | 13 | 13 |

## Dve miesta, kde PROD tvar reálne rozhoduje — a obe F1 trafila

Namerané priamo na PROD (`pg_indexes`, `pg_get_triggerdef`,
`pg_get_function_result`), potom odsimulované lokálne v tom istom tvare.

### A) `uq_realsoft_import_logs_dedupe` je v PROD index **vlastnený constraintom**

```
CREATE UNIQUE INDEX uq_realsoft_import_logs_dedupe
  ON public.realsoft_import_logs USING btree (agency_id, action, external_id)
  -- OWNED_BY_CONSTRAINT
```

| | výsledok |
|---|---|
| pred F1 (`DROP INDEX` prvý) | `ERROR: cannot drop index … because constraint … requires it` |
| po F1 (`DROP CONSTRAINT` prvý) | `ALTER TABLE` + `DROP INDEX`, bez chyby |

### B) `get_valuation_tenant` má v PROD **iný návratový typ**, než migrácia deklaruje

```
PROD:            RETURNS TABLE(slug, brand_name, logo_url, primary_color,
                               calendly_url, is_sandbox boolean)   -- 6 stĺpcov
20260720193000:  RETURNS TABLE(slug, brand_name, logo_url, primary_color,
                               calendly_url)                        -- 5 stĺpcov
```

PROD teda nesie tvar z neskoršej `20260722120000`. Pri `db push` by sa
`20260720193000` pokúsila `CREATE OR REPLACE` na existujúcej 6-stĺpcovej funkcii.

| | výsledok |
|---|---|
| pred F1 | `ERROR: cannot change return type of existing function`<br>`HINT: Use DROP FUNCTION get_valuation_tenant(text) first.` |
| po F1 (`DROP FUNCTION IF EXISTS` prvý) | `DROP FUNCTION` + `CREATE FUNCTION`, bez chyby |

Postgres sám navrhol presne to, čo F1 spravila.

**Obe opravy z F1, ktoré statický sken nenašiel a odhalil až dvojitý replay, sú
tým overené proti skutočnému PROD tvaru — nie proti tvaru odvodenému z migrácií.**

## Čo týmto NIE JE overené

Fixture v plnom PROD tvare som nepostavil. Chýbajúce objekty sedia na tabuľkách,
ktoré vytvára až neaplikovaná dávka; vyrobiť ich „v PROD tvare" by znamenalo
rekonštruovať 32 tabuliek zo `information_schema`, čo je samo o sebe zdroj chýb.

Preto **nie je overené**:
- či niektorá z 80 policies nemá v PROD iný výraz, než migrácia vytvára
  (pri `DROP POLICY IF EXISTS` + `CREATE` to push nezhodí, ale zmení správanie),
- či niektorá z 32 tabuliek nemá v PROD stĺpec navyše alebo chýbajúci oproti
  tomu, čo očakáva neskoršia migrácia.

Jediný spôsob, ako toto uzavrieť, je **skutočný klon** — *Restore to a new
project* z PROD zálohy a `db push` proti nemu. To je platené a je to zásah,
ktorý bez samostatného GO nerobím.

## Odporúčanie k F3

Pred `db push` na PROD zostávajú dve otvorené veci:
1. **PITR** — stav add-onu sa cez dostupné nástroje prečítať nedá
   (`archive_mode=on` je nutná, nie postačujúca podmienka; fyzické zálohy
   používajú ten istý WAL-G). Bez PITR je fallback denná záloha, RPO až 24 h.
2. **Klon** — buď ho spravíme (istota, stojí peniaze), alebo F3 ideme
   s vedomím, že policies a stĺpce tabuliek nie sú tvarovo overené.
