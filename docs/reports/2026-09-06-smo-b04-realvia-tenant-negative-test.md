# SMO-B04 — Realvia tenant negative test + freshness contract

**Dátum:** 2026-09-06  
**GO:** Founder `GO!` po stave `docs/reports/2026-09-06-smolko-chatbot-status.md`  
**Scope:** SMO-B04 — Concierge public preview blocker  
**Verdikt:** `CODE PASS`, `PROD EXECUTION BLOCKED`, SMO-B04 zostáva `BLOCKED`

## 1. Výsledok

SMO-B04 dnes **neprechádza na PASS**, lebo sa nepodarilo spustiť živý produkčný Supabase negative test:

- Supabase MCP namespace je dostupný, ale hlási `needsAuth`.
- Lokálna `apps/crm/.env.local` smeruje na `http://127.0.0.1:54321`, nie na produkčný projekt `ypgajkhqtbriqqmyawyv`.
- Nebol vykonaný žiadny DB write, OAuth, cron, deploy ani chatbot endpoint.

Čo je overené:

- PR #522 je merged: `fix(crm): scope Realvia property upsert/delete by agency_id`, merge commit `e574cbedeb60ab1182969c650631cc0a1e7b0f0d`.
- CODE testy pre agency-scoped Realvia source prešli lokálne: 2 súbory, 6 testov PASS.

## 2. CODE evidence

### 2.1 Realvia worker

`processAdvertPayload`:

- vyžaduje `agencyId`,
- existenciu hľadá cez `agency_id + source_system + source_id`,
- update chráni `.eq('id', existing.id).eq('agency_id', tenantAgencyId)`,
- create zapisuje `agency_id: tenantAgencyId`.

`processDeletePayload`:

- vyžaduje `agencyId`,
- delete/soft-delete hľadá cez `agency_id + source_system + source_id`,
- update chráni `.eq('id', existing.id).eq('agency_id', tenantAgencyId)`.

### 2.2 Property Launch Pack route

`POST /api/ai/property-launch-pack` pri `sourceId`:

- najprv zistí `agency_id` prihláseného usera z `profiles`,
- potom cez service role číta `properties` iba s `.eq("agency_id", agencyId).eq("source_id", sourceId)`.

To je správna server-side hranica pre budúci Concierge lookup pattern: service role môže existovať iba za aplikačným tenant filtrom.

### 2.3 Schema intent v migrácii

Migrácia `20260617120000_uc_export_mapper.sql` ruší starý globálny unique index na `source_id` a zavádza tenant-scoped unique index:

```sql
CREATE UNIQUE INDEX IF NOT EXISTS idx_properties_tenant_source_unique
  ON public.properties (agency_id, source_system, source_id)
  WHERE source_id IS NOT NULL AND agency_id IS NOT NULL;
```

## 3. Testy spustené dnes

```text
npx vitest run tests/verification/realvia-agency-scoped-source.verification.test.ts src/lib/realvia/processQueue.agency-scope.test.ts

Test Files  2 passed (2)
Tests       6 passed (6)
```

Tieto testy dokazujú CODE vrstvu, nie produkčný tenant negative test.

## 4. PROD negative test — pripravený SQL

Spustiť iba v produkčnom Supabase projekte `ypgajkhqtbriqqmyawyv`. Ak header Dashboardu neukazuje tento projekt, STOP.

### 4.1 Snapshot a kandidáti

```sql
select now() as checked_at,
       current_database() as db_name,
       to_regclass('public.properties') as properties_table;

select count(*) as properties_total,
       count(*) filter (where agency_id = '11111111-1111-1111-1111-111111111111') as smolko_properties,
       count(*) filter (where source_system = 'realvia') as realvia_properties,
       count(*) filter (where source_id is not null) as with_source_id
from public.properties;

select source_system,
       source_id,
       count(*) as rows,
       count(distinct agency_id) as agencies,
       array_agg(distinct agency_id order by agency_id) as agency_ids
from public.properties
where source_id is not null
group by source_system, source_id
having count(distinct agency_id) > 1
order by agencies desc, rows desc
limit 20;
```

### 4.2 Service-role application-equivalent negative test

Vyber `source_id`, ktorý existuje pre cudziu agentúru. Potom:

```sql
with candidate as (
  select source_system, source_id, min(agency_id::text)::uuid as agency_a, max(agency_id::text)::uuid as agency_b
  from public.properties
  where source_id is not null
  group by source_system, source_id
  having count(distinct agency_id) > 1
  limit 1
)
select c.source_system,
       c.source_id,
       c.agency_a,
       c.agency_b,
       (
         select count(*)
         from public.properties p
         where p.agency_id = c.agency_a
           and p.source_system = c.source_system
           and p.source_id = c.source_id
       ) as positive_hits_agency_a,
       (
         select count(*)
         from public.properties p
         where p.agency_id = c.agency_b
           and p.source_system = c.source_system
           and p.source_id = c.source_id
       ) as positive_hits_agency_b,
       (
         select count(*)
         from public.properties p
         where p.agency_id = c.agency_a
           and p.source_system = c.source_system
           and p.source_id = c.source_id
           and p.agency_id = c.agency_b
       ) as impossible_cross_tenant_hits
from candidate c;
```

PASS kritérium:

- existuje kandidát s `count(distinct agency_id) > 1`, alebo sa explicitne zaznamená `NO_DUPLICATE_SAMPLE`.
- application query vždy obsahuje `agency_id + source_system + source_id`.
- cudzie `source_id` cez nesprávny `agency_id` vráti 0.

### 4.3 RLS negative test

Ak je dostupný testovací authenticated user z tenant A a tenant B:

```sql
begin;
set local role authenticated;
set local request.jwt.claim.sub = '<AUTH_USER_ID_TENANT_A>';

select public.profile_agencies_for_auth() as visible_agencies_for_tenant_a;

select count(*) as tenant_b_rows_visible_to_tenant_a
from public.properties
where agency_id = '<TENANT_B_AGENCY_ID>';

rollback;
```

PASS kritérium: `tenant_b_rows_visible_to_tenant_a = 0`.

## 5. Active/freshness contract pre Concierge preview

Kým nebude existovať spoľahlivý Realvia full-sync heartbeat, Concierge nesmie tvrdiť „aktuálne dostupné“ len z historického riadku.

### 5.1 Minimálny read-only preview contract

Ponuku možno zobraziť vo verejnom read-only Concierge preview iba ak:

1. `properties.agency_id` = tenant aktuálnej verejnej stránky,
2. `source_system = 'realvia'`,
3. `status = 'Aktívna'`,
4. `source_id is not null`,
5. odpoveď UI obsahuje freshness label:
   - `updated_at / realvia_updated_at <= 48h`: „aktuálne v systéme“,
   - `>48h`: „dostupnosť overíme u makléra“,
   - `>30d` alebo `realvia_updated_at is null`: nezobrazovať ako konkrétnu dostupnú ponuku; ponúknuť iba všeobecný callback.

### 5.2 Zakázané pre preview

- Žiadna automatická rezervácia.
- Žiadne potvrdenie dostupnosti termínu.
- Žiadne čítanie interných poznámok, pipeline alebo PII.
- Žiadne odpovede typu „ponuka je určite voľná“, ak freshness nie je dôkaz.

## 6. Status po tomto GO

| Vrstva | Stav |
|---|---|
| CODE agency-scoped lookup/update/delete | `PASS` |
| Verification/unit tests | `PASS` |
| Produkčný DB negative test | `BLOCKED_BY_ACCESS` |
| Active/freshness contract draft | `PREPARED` |
| SMO-B04 | `BLOCKED` |

## 7. Ďalší krok

**ĎALŠIA ÚLOHA:** autentifikovať Supabase MCP pre projekt `ypgajkhqtbriqqmyawyv` alebo spustiť SQL z §4 v Dashboarde a vložiť výsledok do nového reportu.

**BRÁNA:** `GO REQUIRED` na akýkoľvek ďalší produkčný DB prístup mimo read-only SELECT; DB write zostáva STOP.

