# Zmierenie histórie migrácií s produkciou (AP-024)

**Dátum:** 2026-09-27
**Brána:** `GO MIGRATION-HISTORY-RECONCILE`
**Rozsah:** iba meranie. Na produkcii sa týmto dokumentom nič nemenilo.
**Nadväzuje na:** `docs/reports/2026-09-25-schema-drift-inventory.md` (AP-023), ktorý
zmeral drift na úrovni **tabuliek**. Tento dokument ide na úroveň **objektu**:
politika, stĺpec, index, trigger, funkcia, constraint, oprávnenie.

---

## Prečo to nebolo účtovné cvičenie

`supabase_migrations.schema_migrations` je **záznam o účtovaní, nie meranie**.
Migrácia, ktorá v ňom chýba, mohla dobehnúť v plnom rozsahu. Migrácia, ktorá v ňom
je, mohla po sebe nenechať nič. Oboje sa na tejto databáze potvrdilo v ten istý deň:

| prípad | v histórii | efekt na PROD |
|---|---|---|
| `20260728140000_profiles_platform_admin` | nie | **áno** — stĺpec, index, trigger aj funkcia existujú |
| `20260827214500_leads_revoke_anon_table_privileges` | nie | **nie** — `anon` má na `public.leads` stále všetkých 7 oprávnení |

Preto sa tu nič neodvodzuje z názvu súboru ani z prítomnosti riadku v histórii.
Každý objekt sa dotazoval na katalógu produkcie.

## Metóda

1. Z každej z 65 nezaznamenaných migrácií sa vyextrahovali **objekty, ktoré súbor
   tvrdí** (alebo tvrdí, že majú zmiznúť). Nástroj je v repozitári:
   `scripts/ops/reconcile-migration-history.mjs` — meranie je zopakovateľné, nie
   jednorazové tvrdenie.
2. `DROP POLICY IF EXISTS x; CREATE POLICY x` v jednom súbore **nie je** požiadavka,
   aby `x` neexistovala — je to idempotentná predohra. Takéto negatívne tvrdenia sú
   z merania vylúčené (inak by 117 z nich vyrobilo falošné nálezy).
3. Výsledok: **784 tvrdení o objektoch**, každé zmerané dotazom na `pg_class`,
   `pg_policies`, `pg_attribute`, `pg_indexes`, `pg_trigger`, `pg_constraint`,
   `pg_proc` a `has_table_privilege` na produkcii.
4. Chýbajúci objekt sa ďalej triedil: **zrušila ho neskoršia migrácia** (chýba
   správne), alebo **nie** (chýba, pretože migrácia nedobehla).

### Čo metóda nevie, a priznáva to

- **6 tvrdení sa nepodarilo rozparsovať** a sú vypísané menovite pri behu nástroja:
  4× `ALTER DEFAULT PRIVILEGES ... ON TABLES/SEQUENCES` (názov triedy objektov, nie
  relácie) a 2× viacpríkazový `REVOKE`, kde regex pohltil pokračovanie súboru.
  Nie sú započítané ako „v poriadku" — sú započítané ako neoverené.
- **Prvé kolo merania malo moju vlastnú chybu.** Extraktor prevádzal názvy politík
  na malé písmená, čo je správne pre necitovaný identifikátor a nesprávne pre
  citovaný. `"Enterprise BRI access"` tak vyšla ako chýbajúca. Sedem „nálezov" na
  baseline súbore bolo takto falošných; po oprave (`unquote()` zachováva veľkosť
  citovaného identifikátora) je ich **nula**. Zvyšok merania to nezmenilo — dotknutých
  bolo presne 10 tvrdení a všetky sú v tomto dokumente preverené so správnou
  veľkosťou písmen. Uvádzam to, lebo výsledok bez tohto odseku by bol tvrdší
  a nepravdivý.
- Meranie hovorí, či objekt **existuje**, nie či má rovnaké *telo*. Politika s tým
  istým menom a iným `USING` výrazom sa tu javí ako prítomná. (Presne takto vznikol
  nález o `outreach_logs` z 2026-09-26 — tam sa telo porovnávalo zvlášť.)

---

## Výsledok, v číslach

| | počet |
|---|---|
| migrácií v repozitári | 120 |
| riadkov v histórii PROD | 61 |
| v repozitári, nie v histórii | **65** |
| v histórii, bez súboru v repozitári | **6** |
| tvrdení o objektoch zmeraných na PROD | 784 |
| z 65 nezaznamenaných migrácií: **nechýba po nich nič** | **46** |
| z 65 nezaznamenaných migrácií: niečo chýba | **19** |

Z 120 jednotlivých nálezov na tých 19 migráciách:

| trieda | počet | čo to znamená |
|---|---|---|
| chýba správne (zrušila neskoršia migrácia) | 33 | nie je to nález |
| **odstránenie, ktoré PROD nedostal** | **10** | objekt tam je, hoci migrácia hovorí, že nemá byť |
| **objekt, ktorý PROD nemá** | **77** | migrácia ho tvorí, produkcia ho nemá |

Tých 77 sa zbieha do malého počtu **chýbajúcich tabuliek**, ktoré už pomenoval
AP-023 (`enrichment_log`, `credit_redemption_codes`, `ai_generations`,
`acquisition_*` ×4, `demo_bookings`, `demo_prospects`, `lead_action_scores`) —
s ich indexmi, politikami a oprávneniami, ktoré s nimi padli.

### Tých 6 „duchov" nie je záhada

Spárované podľa **názvu**, nie verzie:

| verzia v histórii | názov | súbor v repozitári |
|---|---|---|
| 20260802134100 | `valuation_estimates` | `20260731210000_valuation_estimates.sql` |
| 20260802134104 | `system_usage_agency` | `20260731220000_system_usage_agency.sql` |
| 20260904184236 | `drop_open_anon_policies` | `20260904150000_drop_open_anon_policies.sql` |
| 20260924193624 | `ai_cost_daily_view` | `20260924200000_ai_cost_daily_view.sql` |
| 20260923113535 | `repair_scheduled_events_phase1_20260923` | **žiadny** |
| 20260923120358 | `repair_scheduled_events_phase1_20260923` | **žiadny** |

Štyri z nich sú **ten istý súbor zapísaný pod inou verziou**: migrácia aplikovaná
cez Supabase MCP nástroj si razí vlastnú časovú pečiatku, takže sa v repozitári javí
ako nezaznamenaná a v histórii ako duch. To je mechanizmus, nie nehoda — a vysvetľuje
podstatnú časť driftu. **Kto aplikuje migráciu cez MCP, musí počítať s tým, že
v histórii bude pod iným číslom, než má súbor.**

Dva zvyšné sú oprava, ktorá sa nikdy necommitla. Tu je dobrá správa: `scheduled_events`
na produkcii sa **presne zhoduje** s tým, čo tvorí `20260527143000_event_scheduler_phase1.sql`
— 20 stĺpcov, tie isté typy a `NOT NULL`, 5 indexov, jedna politika
`scheduled_events_agency` pre `authenticated`. Oprava teda obnovila stav, ktorý
repozitár popisuje. Nie je to nepopísaná zmena; je to nezapísaná náprava.

### Kontrola baseline súboru

`20260925210000_baseline_prod_only_tables.sql` je zvláštny prípad: má popisovať to,
čo PROD už má, takže na PROD nikdy dobehnúť nemá. Použil som ho ako kontrolu merania:
63 tvrdení (29 tabuliek, 2 funkcie, 2 triggery, 29 politík, 1 negatívne) —
**0 nezhôd**. Baseline je verný.

Jedna vec na ňom stojí za pozornosť. Baseline vytvára `"Allow anon access"` na
`onboarding_sessions` (`FOR ALL TO anon USING (true)`), pretože v deň generovania to
na produkcii tak bolo. Neskorší `20260926090000_onboarding_sessions_anon_lockdown.sql`
ju ruší. Overil som, že sa mená vrátane veľkosti písmen zhodujú — na čistej databáze
teda baseline dieru otvorí a lockdown ju o hodinu neskôr zavrie, koncový stav je
správny. Drží to len poradím súborov, čo je krehké, ale drží.

---

## Čo z toho je bezpečnostný nález

Toto je jediná časť dokumentu, ktorá si zaslúži pozornosť dnes.

### 1. `anon` má na `public.leads` stále plné oprávnenia (511 riadkov)

`20260827214500_leads_revoke_anon_table_privileges` nedobehol. Zmerané:
`has_table_privilege('anon', 'public.leads', …)` je `true` pre **select, insert,
update, delete, truncate, references aj trigger**.

Netečie nič: `leads` má presne jednu politiku, `leads_tenant`, viazanú na
`authenticated`, a RLS je zapnutá. Ale vrstva, ktorú tá migrácia mala pridať,
tam nie je. **Jedna nešťastná politika na `leads` a `anon` čítal celú databázu klienta.**
Toto nie je hypotéza — tá istá kombinácia (grant + otvorená politika) bola presne
tým, čo sa zatváralo 25. a 26. septembra na `tasks`, `saas_leads`, `outreach_logs`
a `onboarding_sessions`.

Šírka problému: **107 zo 111 tabuliek** dáva `anon` select, insert, update aj delete.
RLS je všade jediná brána. To je v Supabase bežné nastavenie, ale znamená, že
každá jedna politika je jednobodová porucha.

> **VYRIEŠENÉ 2026-09-28** (`GO RLS-LEADS-REVOKE`). Príkazy zo súboru
> `20260827214500` dobehli na produkcii, vrátane zápisu histórie pod **verziou
> súboru**, nie novo razenou — teda bez toho, aby vznikol ďalší duch.
> Zmerané po zmene: `anon` nedrží na `public.leads` ani jedno zo 7 oprávnení,
> `authenticated` a `service_role` bez zmeny, 511 riadkov a 0 s `agency_id IS NULL`
> nedotknutých, politika `leads_tenant` nedotknutá. Overené aj z pohľadu `anon`,
> nie len z katalógu: `SELECT` aj `INSERT` vracajú **42501 permission denied**
> (pred zmenou `SELECT` vracal prázdny úspech — presne to, čo komentár v tej
> migrácii chcel odstrániť). Šírka problému však platí ďalej: ostáva **106 zo 111
> tabuliek** s plným DML pre `anon`.

Zmena bola bezpečná preukázateľne, nie odhadom: `leads` má jedinú politiku
`leads_tenant` viazanú na `authenticated`, takže **žiadna politika sa nevzťahovala
na `anon`** a každá jeho operácia bola už dnes odmietnutá RLS. Revoke odobral
vrstvu, ktorá bola prítomná, ale nedosiahnuteľná. Overené aj na volajúcich: všetky
verejné cesty, ktoré zapisujú leady (`api/valuation/submit`, `api/leads/inbound`,
`api/concierge/callback`, `api/acquire/email`, server action
`(public)/buyer-onboarding`), používajú service role, ktorá oprávnenia aj RLS
obchádza.

### 2. 26 politík nesie `IS NULL` únik — a 10 tabuliek ho má na zápise

Vzor, ktorý sa našiel 25. 9. na `bsm_reforma_leads`, nie je výnimka. Na produkcii
je **26 politík v 16 tabuľkách** s telom v tvare
`agency_id IS NULL OR agency_id IN (…moja agentúra…)`. Čo číta ako kontrola
nájomníka, ale pripúšťa každý riadok, ktorý sa nedá priradiť.

Rozdelené podľa toho, či sa dá zneužiť:

- **Mŕtve (11 politík).** Únik vedie cez `leads.agency_id`, a ten je na produkcii
  `NOT NULL` — `20260921200000_legalize_leads_agency_id_not_null` dobehol. Sem patria
  `activities`, `lead_property_matches`, `buyer_events`, `pipeline_moves`.
- **Dosiahnuteľné (10 tabuliek).** `ai_action_audit`, `ai_actions`, `bri_history`,
  `client_dna`, `deal_moments`, `deal_risk`, `lead_events`, `lead_scores`,
  `priority_alerts`, `properties` majú vlastný `agency_id`, ktorý **je nullable**,
  a únik majú na `INSERT` alebo `ALL` pre rolu `authenticated`. Doslovne z katalógu:

  ```
  ai_action_audit_insert_tenant [INSERT]
    WITH CHECK ((agency_id IS NULL) OR (agency_id IN (SELECT p.agency_id FROM profiles p
                 WHERE p.auth_user_id = auth.uid() AND p.agency_id IS NOT NULL)))
  ```

  `WITH CHECK` pripúšťa `agency_id IS NULL`. Ktokoľvek s účtom teda môže vyrobiť
  nepriradený riadok — a `USING` tej istej politiky ho potom zobrazí **všetkým
  ostatným nájomníkom**. Nie je to latentné v zmysle „nedosiahnuteľné"; je to
  dosiahnuteľné a nevyužité.
- **Dnes neuniká nič.** Počet riadkov s `agency_id IS NULL` vo všetkých jedenástich
  tabuľkách: **0**. `properties` 133/0, `ai_action_audit` 222/0, `platform_events` 1420/0,
  `leads` 511/0.

Zápisovú sondu (vložiť riadok ako `authenticated` a vrátiť transakciu) som
**nespúšťal** — brána bola na meranie, nie na zápis do produkcie. Dôkaz je textový,
z tela politiky, a je jednoznačný.

Ďalšie dvom politikám únik dosahuje aj `anon`: `portal_listings."users see own or
public listings"` a `listing_price_history."users see own price history"`. Obe
tabuľky sú prázdne (0 riadkov), takže latentné.

### 3. 27 tabuliek má RLS zapnutú a nula politík

Medzi nimi `credit_ledger` (účtovná pamäť kreditov), `decisions`,
`exclusivity_outcomes`, `ai_sourced_deals`. Pri zapnutej RLS a žiadnej politike
neuvidí `authenticated` ani `anon` nič.

**Nie je to dnes funkčná chyba, a nebudem z toho robiť poplach.** Dotrasoval som
všetkých volajúcich: `credits-billing.ts`, `metrics/fetch.ts`,
`agents/followup/outcomeWriter.ts` a `predictionWriter.ts` používajú výhradne
`createServiceRoleClient()`, ktorý RLS obchádza. Chybou sa to stane v momente,
keď niekto pridá prvý dotaz s tokenom používateľa — a nič ho pred tým nevaruje.

### 4. `lead_scores_agency` je zrušenie, ktoré sa nikdy nestalo

`20260616123000_rls_wave_a_hardening` ju ruší; na produkcii je. Žiadna neskoršia
migrácia ju netvorí, takže jej prítomnosť nie je nahradenie — je to nedobehnuté
zrušenie. (Ďalšie dve z tej istej migrácie, `ai_action_audit_select_tenant`
a `ai_action_audit_insert_tenant`, prítomné sú **správne** — tvorí ich neskorší
`20260923070000_p3_drop_null_agency_branch`.)

Dobrá správa z tej istej kontroly: `20260904150000_drop_open_anon_policies` dobehol
(pod verziou 20260904184236) — všetkých 15 anon politík, ktoré ruší, je naozaj pryč.

---

## Čo to znamená pre tvrdenie „CI je zelené"

CI prehráva migrácie na čistú Postgres 15 a testuje **inú databázu**, než na ktorej
beží klient. Konkrétne, k dnešnému dňu:

- Na čistej DB `anon` **nemá** oprávnenia na `leads`; na produkcii má.
- Na čistej DB existuje `enrichment_log`, `credit_redemption_codes`, `ai_generations`
  a 4 `acquisition_*` tabuľky; na produkcii neexistujú.
- Na produkcii existuje 30 tabuliek, ktoré až do `20260925210000` nezakladala žiadna
  migrácia (AP-023, časť A).

Zelené CI teda hovorí „tieto migrácie idú za sebou bez chyby". Nehovorí „produkcia
je v tomto stave". Rozdiel je meratelný a je vyššie.

## Čo tento dokument nerobí

Nič neopravuje a nič neodporúča hromadne dopísať. Každý zo štyroch nálezov je
samostatná zmena s vlastným rizikom a patrí pod vlastnú bránu.

## Ďalší krok, podľa hodnoty

1. ~~**`leads` revoke** — dobehnúť `20260827214500` na produkcii.~~ **HOTOVO
   2026-09-28**, viď vsuvku pri náleze 1. Zostáva otvorená všeobecnejšia otázka:
   106 ďalších tabuliek stále dáva `anon` plné DML a RLS je na nich jediná brána.
2. **`IS NULL` úniky na zápise** (10 tabuliek). Buď `agency_id NOT NULL` tam, kde to
   dáta unesú, alebo prepísať politiky bez disjunkcie. Pred zmenou treba každú
   tabuľku premerať zvlášť — presne to sa robilo pri `leads` v `20260921200000`.
3. **Statický ratchet v CI** proti regresii: test, ktorý zlyhá, keď nová migrácia
   pridá politiku s `true` alebo s `IS NULL` únikom pre `public`/`anon`, s povolenkou
   pre historické súbory (ako `typecheck-baseline`). Bez neho sa vzor vráti.
   **Nie je to duplikát existujúceho guardu.** `apps/crm/scripts/schema-governance-guard.mjs`
   kontroluje **mená tabuliek** proti allowlistu cez RPC `rls_audit_snapshot` — čo je
   presne ten rozmer, ktorý by tieto štyri nálezy neodhalil, lebo ani jeden z nich
   nie je tabuľka navyše či chýbajúca. Ratchet by pokrýval telo politík a oprávnenia.
   (Vedľajšie potvrdenie: `rls_audit_snapshot` na PROD existuje, hoci
   `20260613000001_rls_audit_snapshot_rpc.sql` v histórii nie je — ďalší prípad
   „chýba v histórii, efekt je tam".)
4. **RLS bez politík**: buď doplniť tenant politiku, alebo do registra tabuliek
   napísať „service_role only" tak, aby to CI vedelo skontrolovať.

---

*Zmerané cez Supabase MCP (`execute_sql`, iba čítanie) na projekte produkcie,
2026-09-27. Nástroj na zopakovanie: `scripts/ops/reconcile-migration-history.mjs`.*
