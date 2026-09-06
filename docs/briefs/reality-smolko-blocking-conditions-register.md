# Reality Smolko — register blokujúcich podmienok

**Status:** ACTIVE / CONTROL DOCUMENT  
**Dátum:** 2026-09-04  
**Produkcia:** `https://app.revolis.ai`  
**Supabase project ref:** `ypgajkhqtbriqqmyawyv`  
**Súvisiaca architektúra:** [Property Revenue System v1](../architecture/reality-smolko-property-revenue-system-v1.md)  
**Súvisiaca roadmapa:** [Production roadmap](./reality-smolko-production-roadmap-2026-09-03.md)

> Tento dokument poskytuje bezpečné vstupy do nástrojov, nie Founder GO. Kliknutie na Dashboard je read-only krok; aplikovanie migrácie, manuálny cron, OAuth consent, deploy alebo externý zápis vyžaduje príslušné schválenie a preflight.

## 1. Pravidlo dôkazu

**Audit kódu nie je audit dát.** Tvrdenie „toto už máme“ je prípustné až vtedy, keď sú oddelene doložené obe vrstvy:

1. **CODE evidence:** konkrétny súbor/commit, kontrakt a test.
2. **PROD evidence:** projekt/environment, čas SQL kontroly, počet riadkov alebo dôkaz schémy/RLS a výsledok produkčného smoke.

Existencia súboru znamená `CODE_PRESENT`, nie `PROD_READY`. Nulový počet riadkov znamená, že výpočtová schopnosť môže existovať, ale nemá živý dátový substrát.

## 2. Produkčný snapshot použitý v tomto registri

Snapshot bol oznámený reviewerom po kontrole produkčnej databázy 2026-09-04. Pred každým GO sa musí zopakovať a uložiť s časom vykonania.

| Objekt | Oznámený produkčný stav | Interpretácia |
|---|---:|---|
| `properties` | 133 riadkov | inventory existuje |
| Reality Smolko `properties` | 132 riadkov | Concierge má relevantný Smolko korpus |
| `portal_listings` | 0 riadkov | price-trail sync nemá vstup |
| `property_price_trail` | 0 riadkov | historická cena a days-on-market nemajú produkčný dôkaz |
| `scheduled_events` | tabuľka neexistuje | booking nemá produkčné CRM úložisko |

**Klikateľný produkčný vstup:** [Supabase Table Editor](https://supabase.com/dashboard/project/ypgajkhqtbriqqmyawyv/editor) · [Supabase SQL Editor](https://supabase.com/dashboard/project/ypgajkhqtbriqqmyawyv/sql/new)

Bezpečný read-only snapshot dotaz:

```sql
select 'properties' as object_name,
       to_regclass('public.properties') is not null as exists,
       (select count(*) from public.properties) as row_count
union all
select 'portal_listings',
       to_regclass('public.portal_listings') is not null,
       (select count(*) from public.portal_listings)
union all
select 'property_price_trail',
       to_regclass('public.property_price_trail') is not null,
       (select count(*) from public.property_price_trail);

select
  to_regclass('public.scheduled_events') as scheduled_events_table,
  exists (
    select 1
    from supabase_migrations.schema_migrations
    where version = '20260527143000'
  ) as migration_recorded;
```

Ak niektorá z prvých troch tabuliek neexistuje, jednotlivý vnorený `count(*)` zlyhá. Vtedy najskôr použiť iba `to_regclass(...)` a chýbajúci objekt zaznamenať ako `ABSENT`.

## 3. Riadiaca tabuľka

| ID | Blokuje | Podmienka | Aktuálny stav | Vlastník | Odblokovací dôkaz |
|---|---|---|---|---|---|
| SMO-B01 | Launch Studio pilot | 5 reálnych ponúk + brand/screenshots | `OPEN` | p. Smolko | sample pack prijatý a anonymizovaný |
| SMO-B02 | Pricing automation | zdroj porovnaní, histórie a days-on-market | `BLOCKED` | Founder + Product | schválený zdroj, licencia, mapovanie, nenulový ingest alebo manual-only decision |
| SMO-B03 | Provider adapter | právo použiť RealityMap/Valuo/Realitná únia dáta | `BLOCKED` | Founder + vendor | zmluva/API/export scope a retention |
| SMO-B04 | Concierge public preview | Realvia tenant scope + freshness | `BLOCKED` | Engineering | cross-tenant negative test + active/freshness contract |
| SMO-B05 | Verejný chatbot | AI disclosure, privacy a schválené FAQ | `BLOCKED` | Founder + Privacy + Smolko | schválené texty a human fallback |
| SMO-B06 | Callback handoff | broker routing a minimálny PII kontrakt | `OPEN` | p. Smolko + Product | routing matrix + 10 E2E testov |
| SMO-B07 | Booking preview/produkcia | `scheduled_events` nie je v produkcii | `BLOCKED` | Founder + DB operator | DB GO + migrácia + RLS/index/history evidence |
| SMO-B08 | Booking | Google Calendar scopes a pravidlá dostupnosti | `BLOCKED` | Google admin + Smolko | OAuth, free/busy, duration/buffer/timezone test |
| SMO-B09 | Potvrdený booking | idempotency, retry a notifikácie | `OPEN` | Engineering | conflict/provider-failure E2E evidence |
| SMO-B10 | Inbound e-mail pilot | bezpečný mailbox prístup bez hesla | `OPEN` | p. Smolko + mail admin | forwarding/OAuth + 24–48 h dual-run |

## 4. Detail blokátorov a akčné linky

### SMO-B01 — Customer evidence pack

**Blokuje:** Gate A / overenie kvality Launch Studia.  
**Chýba:** 5 reálnych ponúk, 3 cenové prípady, printscreeny ValuoProfi, anonymizované reporty, presný názov nástroja Realitnej únie a Smolko brand podklady.

**Akcie:**

- [Otvoriť živú aplikáciu Revolis](https://app.revolis.ai)
- [Otvoriť existujúci Inzerát generátor](https://app.revolis.ai/inzerat-generator)
- [Otvoriť ValuoProfi](https://valuo.sk/valuo-profi)
- [Otvoriť RealityMap](https://realitymap.sk/)

**PASS:** päť anonymizovaných vstupov je reprodukovateľných a pokrýva predaj/prenájom aj slabý/priemerný/prémiový prípad.  
**Fallback:** manuálny intake; bez sample packu sa nesľubuje kvalita ani termín.

### SMO-B02 — Zdroj price-trail dát

**Blokuje:** automatické porovnania, dobu na trhu, „čo sa nepredalo“, cenové poklesy a seller motivation.  
**Aktuálny dôkaz:** `portal_listings = 0`, `property_price_trail = 0`. Cron teda môže byť technicky zdravý a stále oprávnene vytvoriť nula bodov.

**Blokujúca otázka:** Odkiaľ získame legálne a spoľahlivo porovnateľné ponuky, cenové zmeny a dobu na trhu?

**Existujúci engine — nález 3:**

- [Price Trail engine — lokálne](../../apps/crm/src/lib/price-trail/engine.ts)
- [Price Trail engine — GitHub snapshot](https://github.com/onlinovosk-bit/RealitkaAI/blob/4a01a46a1/apps/crm/src/lib/price-trail/engine.ts)
- [Price-trail SQL migrácia](../../apps/crm/supabase/migrations/20260426121525_price_trail.sql)
- [Sync cron route](../../apps/crm/src/app/api/cron/price-trail-sync/route.ts)
- [Negotiation script](../../apps/crm/src/lib/price-trail/negotiation-script.ts)
- [PriceChart](../../apps/crm/src/components/price-trail/PriceChart.tsx)
- [PriceTrailPanel](../../apps/crm/src/components/price-trail/PriceTrailPanel.tsx)
- [Price-trail API](../../apps/crm/src/app/api/price-trail/route.ts)

**Produkčné vstupy:**

- [Skontrolovať tabuľky v Supabase](https://supabase.com/dashboard/project/ypgajkhqtbriqqmyawyv/editor)
- [Spustiť read-only row-count SQL](https://supabase.com/dashboard/project/ypgajkhqtbriqqmyawyv/sql/new)
- [Otvoriť produkčný cron endpoint](https://app.revolis.ai/api/cron/price-trail-sync) — obyčajné kliknutie má bezpečne vrátiť `401`; autorizované spustenie patrí do runbooku a nesmie niesť secret v URL.

**Povolené riešenia:**

1. manuálny evidence input — okamžitý pilot,
2. licencovaný export/API,
3. nový overený ingest do `portal_listings`.

**PASS pre automatizáciu:** zvolený zdroj + licencia + mapovanie + freshness + aspoň dva pozorované cenové body pre testovaciu property + správny tenant.  
**Fallback:** manual-only Pricing Evidence Report; price-trail claims sú `DO_NOT_PUBLISH`.

### SMO-B03 — Licencia externých dát

**Blokuje:** automatický provider adapter a verejné tvrdenia o porovnaniach, kriminalite alebo lokalite.

**Akcie:**

- [Valuo API rozsah/cenník](https://valuo.sk/cennik-api)
- [ValuoProfi verejný opis](https://valuo.sk/valuo-profi)
- [RealityMap](https://realitymap.sk/)

**PASS:** písomne potvrdený rozsah dát, slovenské coverage, právo ukladať/zobrazovať výstup, freshness, retention, cena a failure behavior.  
**Fallback:** zákazníkom zadané alebo exportované porovnania s explicitným zdrojom; žiadny scraping.

### SMO-B04 — Realvia tenancy a freshness

**Blokuje:** verejný property matcher.  
**Dôvod:** 132 Smolko properties odrizikuje objem inventory, nie izoláciu tenantov ani aktuálnosť aktívneho statusu.

**Akcie:**

- [Realvia onboarding kontrakt](../REALVIA_ONBOARDING.md)
- [Realvia webhook v produkcii](https://app.revolis.ai/api/webhooks/realvia) — read/open slúži iba na bezpečnú kontrolu route; neposielať testovací payload bez runbooku.
- [Realvia worker v produkcii](https://app.revolis.ai/api/cron/realvia-process) — bez autorizácie má vrátiť `401`.
- [Supabase Table Editor](https://supabase.com/dashboard/project/ypgajkhqtbriqqmyawyv/editor)

**PASS:** každý lookup/update je viazaný na `agency_id`; negatívny test nedokáže čítať ani meniť cudziu property; aktívny stav a freshness majú kontrakt.  
**Fallback:** interné preview alebo callback bez zobrazenia neoverenej ponuky.

### SMO-B05 — Verejná AI, privacy a FAQ

**Blokuje:** akýkoľvek public traffic na Website Concierge.

**Akcie:**

- [Revolis Trust Center](https://app.revolis.ai/trust-center)
- [EU AI Act — čl. 50](https://eur-lex.europa.eu/eli/reg/2024/1689/oj?locale=en)
- [GDPR](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32016R0679)

**PASS:** viditeľné AI disclosure, controller/purpose/retention text, minimum PII, samostatný marketingový consent, schválený FAQ snapshot a cesta k človeku.  
**Fallback:** neverejný interný preview bez reálnych kontaktov.

### SMO-B06 — Broker routing a callback

**Blokuje:** spoľahlivé odovzdanie záujemcu.

**Akcie:**

- [Otvoriť produkčný lead workspace](https://app.revolis.ai/leads)
- [Scheduled-events API kontrakt](../../apps/crm/src/app/api/scheduled-events/route.ts)

**Potrebné rozhodnutia:** listing broker, zákazníkom zvolený broker, fallback broker, neprítomnosť, pracovné hodiny a SLA bez falošného sľubu.  
**PASS:** routing matrix + 10 E2E callbackov bez duplicitného leadu.  
**Fallback:** všeobecný inbox/telefón schválený p. Smolkom.

### SMO-B07 — `scheduled_events` produkčná migrácia

**Blokuje:** Fázu 5. Booking dnes nemá kam bezpečne zapísať CRM udalosť.

**Kód a migrácia:**

- [Migrácia — lokálne](../../apps/crm/supabase/migrations/20260527143000_event_scheduler_phase1.sql)
- [Migrácia — GitHub commit](https://github.com/onlinovosk-bit/RealitkaAI/blob/0e47413beb0e01949e9920eb86e90ee734b9df5e/apps/crm/supabase/migrations/20260527143000_event_scheduler_phase1.sql)
- [Pôvodný PR #70](https://github.com/onlinovosk-bit/RealitkaAI/pull/70)
- [Implementation guide](../../apps/crm/docs/event-scheduler-implementation-guide.md)
- [Scheduled-events API](../../apps/crm/src/app/api/scheduled-events/route.ts)

**Produkčné akcie:**

1. [Otvoriť produkčný SQL Editor](https://supabase.com/dashboard/project/ypgajkhqtbriqqmyawyv/sql/new).
2. Pred vložením SQL overiť v hlavičke Dashboardu project ref `ypgajkhqtbriqqmyawyv`.
3. Spustiť preflight nižšie a uložiť výsledok.
4. Získať samostatné Founder DB `GO` s presným názvom migrácie a checksumom.
5. Skopírovať presný obsah migračného súboru do Dashboard SQL Editora a aplikovať ho ako jednu transakciu.
6. Spustiť postflight, RLS negative test a zapísať čas/výsledok do migračného reportu.
7. Samostatne zosúladiť Dashboard run s migračnou evidenciou schváleným postupom. SQL Editor sám osebe nie je dôkazom záznamu v `supabase_migrations.schema_migrations`; nevkladať ručne riadok do internej histórie bez osobitne schváleného postupu.

Preflight:

```sql
select
  current_database() as database_name,
  to_regclass('public.scheduled_events') as existing_table,
  to_regprocedure('public.profile_agencies_for_auth()') as tenant_helper,
  to_regclass('public.agencies') as agencies_table,
  to_regclass('public.profiles') as profiles_table,
  to_regclass('public.leads') as leads_table,
  to_regclass('public.properties') as properties_table,
  exists (
    select 1
    from supabase_migrations.schema_migrations
    where version = '20260527143000'
  ) as migration_recorded;
```

Postflight:

```sql
select
  c.oid::regclass as table_name,
  c.relrowsecurity as rls_enabled
from pg_class c
where c.oid = to_regclass('public.scheduled_events');

select policyname, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename = 'scheduled_events';

select indexname, indexdef
from pg_indexes
where schemaname = 'public'
  and tablename = 'scheduled_events'
order by indexname;
```

**PASS:** tabuľka existuje; RLS je zapnuté; policy `scheduled_events_agency` existuje; indexy existujú; tenant A nečíta ani nezapisuje tenant B; Dashboard run má časovo označený report a migračná evidencia je zosúladená alebo explicitne evidovaná ako otvorený drift.  
**Dôležité:** manuálne spustenie SQL a migračná história sa musia zosúladiť samostatne schváleným postupom. Nevytvoriť stav „objekt existuje, história tvrdí opak“ a neoznačiť ho bez vysvetlenia ako `DONE`.  
**Fallback:** callback handoff bez booking.

### SMO-B08 — Google Calendar pripravenosť

**Blokuje:** zobrazovanie a potvrdenie reálnych termínov.

**Akcie:**

- [Google Cloud credentials](https://console.cloud.google.com/apis/credentials)
- [Google Calendar scopes](https://developers.google.com/workspace/calendar/api/auth)
- [Google free/busy API](https://developers.google.com/workspace/calendar/api/v3/reference/freebusy/query)
- [Google events.insert API](https://developers.google.com/workspace/calendar/api/v3/reference/events/insert)
- [Existujúci OAuth route](../../apps/crm/src/app/api/integrations/google/auth/route.ts)

**PASS:** najužšie scopes, platný redirect URI, refresh flow, Europe/Bratislava, duration/buffer/minimum lead time a test kolízie. OAuth consent je externá zmena a spúšťa sa až po schválení.  
**Fallback:** callback request s preferovaným časom, bez potvrdeného slotu.

### SMO-B09 — Idempotency a notifikácie

**Blokuje:** tvrdenie „termín je potvrdený“.

**Akcie:**

- [Produkčný health endpoint](https://app.revolis.ai/api/healthz)
- [Scheduled-events store](../../apps/crm/src/lib/scheduled-events/store.ts)
- [Produkčný lead workspace](https://app.revolis.ai/leads)

**PASS:** opakovaný request nevytvorí druhý event; free/busy konflikt sa odmietne; Google failure neodošle falošné potvrdenie; broker/customer notification má retry a viditeľný failure.  
**Fallback:** uložený callback + ľudské potvrdenie.

### SMO-B10 — Bezpečný inbound e-mail

**Blokuje:** automatický e-mailový intake, nie Launch Studio ani hosted concierge preview.

**Akcie:**

- [Websupport administrácia](https://admin.websupport.sk/)
- [Websupport delegované oprávnenia](https://www.websupport.sk/podpora/kb/sprava-opravneni-uzivatelov/)
- [Websupport presmerovanie](https://www.websupport.sk/podpora/kb/aliasy-a-presmerovania-e-mailov/)
- [Gmail pull setup runbook — aktuálny main](https://github.com/onlinovosk-bit/RealitkaAI/blob/eeba38af1025a8264ea7f324f259717d3921c11e/docs/runbooks/gmail-pull-setup.md)

**PASS:** bez zdieľania hesla; named/revocable access alebo screenshare; forwarding; Gmail label; OAuth `gmail.readonly`; smoke; 24–48 hodín dual-run s deduplikáciou.  
**Fallback:** manuálny intake. Stará IMAP integrácia a heslo v `profile_integrations.config` sú `DO_NOT_USE`.

## 5. Povinný zápis po odblokovaní

Každý uzatvorený blocker musí mať tento záznam:

```text
Blocker ID:
Environment/project:
Code commit/path:
Production checked at (UTC):
Schema/object evidence:
Row count before/after:
Tenant/RLS result:
Smoke result:
Approved by:
Rollback/fallback:
Status: PASS | FAILED | REOPENED
```

Bez tohto dôkazu sa položka nesmie označiť `DONE` iba na základe existencie kódu, zelenej CI alebo úspešného SQL bez produkčného smoke.

## 6. Odporúčané poradie odblokovania

1. `SMO-B01` — customer sample pack.
2. `SMO-B04` — Realvia tenancy/freshness, paralelne so sample packom.
3. `SMO-B02` + `SMO-B03` — manual-only decision alebo licencovaný dátový zdroj.
4. `SMO-B05` + `SMO-B06` — verejný concierge a callback.
5. `SMO-B07` — DB migrácia až tesne pred booking implementáciou, nie preventívne.
6. `SMO-B08` + `SMO-B09` — kalendár, idempotency a notifikácie.
7. `SMO-B10` — môže bežať paralelne; neblokuje prvú produktovú hodnotu.
