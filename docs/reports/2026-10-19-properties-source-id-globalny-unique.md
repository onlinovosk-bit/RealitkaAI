# PROD vynucuje globálnu jednoznačnosť `properties.source_id` — dve agentúry nemôžu mať tú istú inzerátovú id

**Dátum:** 2026-10-19 · **PROD:** `ypgajkhqtbriqqmyawyv` · **Zápis do PROD:** nie (iba čítanie). **Oprava si vyžaduje migráciu → founder GO.**

Toto som našiel pri kroku „pin na `idx_properties_source_id_unique`" z #882.
**Zmenilo to premisu toho kroku:** nejde o chýbajúci pin, ale o rozpor medzi
schémou v PROD a tým, čo kód aj repozitár predpokladajú.

---

## 1. Čo je v PROD (ZMERANÉ dnes)

```sql
SELECT indexname, indexdef FROM pg_indexes
WHERE schemaname='public' AND tablename='properties'
  AND (indexname LIKE '%source_id%' OR indexdef LIKE '%source_id%');
```

| indexname | indexdef |
|---|---|
| `idx_properties_source_id_unique` | `CREATE UNIQUE INDEX … ON public.properties USING btree (source_id) WHERE (source_id IS NOT NULL)` |
| `idx_properties_broker_source_id` | `CREATE INDEX … (broker_source_id) WHERE …` (nie unique, nehrá rolu) |

`idx_properties_tenant_source_unique` **v PROD neexistuje** (ten istý dotaz by ho
zachytil — jeho `indexdef` obsahuje `source_id`).

**Dôsledok:** `source_id` je jednoznačné **globálne, cez všetkých tenantov**.
Keď agentúra A naimportuje inzerát s `source_id = X`, agentúra B ten istý
inzerát naimportovať **nemôže** — dostane `duplicate key value violates unique
constraint "idx_properties_source_id_unique"`.

## 2. Čo predpokladá kód a repozitár

`apps/crm/src/lib/realvia/processQueue.ts` (riadky 187–188), komentár v kóde:

> `Idempotent per tenant: unique key is (agency_id, source_system, source_id).`
> `Never look up / mutate by source_id alone — that rewrites another agency's row.`

Migrácia `apps/crm/supabase/migrations/20260617120000_uc_export_mapper.sql`
(riadky 61–64) presne toto zavádza:

```sql
DROP INDEX IF EXISTS public.idx_properties_source_id_unique;
CREATE UNIQUE INDEX IF NOT EXISTS idx_properties_tenant_source_unique
  ON public.properties (agency_id, source_system, source_id)
  WHERE source_id IS NOT NULL AND agency_id IS NOT NULL;
```

**Tá migrácia na PROD nie je** (ZMERANÉ):

```sql
SELECT version FROM supabase_migrations.schema_migrations
WHERE version LIKE '2026061%' OR version LIKE '2026062%';
```
→ `20260612000000, 20260614213000, 20260615000000, 20260615102500, 20260615104000`.
**`20260617120000` chýba.**

## 3. Toto je zmeraná príčina septembrových zlyhaní

Vlna A (#882) uvádzala, že september má iný text chyby než máj, a že tá chyba je
`duplicate key … idx_properties_source_id_unique` (riadok fronty z 2026-09-11,
deň s 24 zlyhaniami z 25 pokusov). Teraz je jasné **prečo**: ten index v PROD
stále platí, hoci kód upsertuje per tenant.

To je prvá **zmeraná** príčina časti zlyhaní. Májových 1 189 tým vysvetlené nie je.

## 4. Širší nález: schéma v PROD a repozitár sa rozišli

| | počet |
|---|---|
| migrácií v `apps/crm/supabase/migrations/` | **138** |
| záznamov v `supabase_migrations.schema_migrations` na PROD | **78** |
| najnovšia aplikovaná | `20261006120000` (= najnovšia v repe) |

Nie je to „PROD je pozadu": najnovšia je aplikovaná, chýbajú veci v strede.
Migrácie sa teda aplikovali **výberovo**, nie v poradí. Časť z tých 60 rozdielov
bude pokrytá staršími číslovanými súbormi v `apps/crm/supabase/*.sql`
(napr. `22_realvia_webhook_infrastructure.sql`, ktorý globálny index zakladá),
ale **ktoré presne, je NEZMERANÉ** a tento report to netvrdí.

## 5. Pre-flight: je oprava bezpečná?

Áno, a dá sa to dokázať bez spustenia. Nový index je
`(agency_id, source_system, source_id)`; dnes platí unique na `source_id`
samotnom. Jednoznačnosť na `source_id` **implikuje** jednoznačnosť na trojici,
takže `CREATE UNIQUE INDEX` nemôže naraziť na existujúce dáta. Riziko je
v opačnom smere: po oprave bude povolené to, čo dnes padá — teda presne to,
čo chceme.

Pozor: `20260617120000` **nerobí len index**. Pridáva stĺpce do `profiles`,
`properties`, `realsoft_import_logs` a mení `import_jobs_source_check`. Všetko
`IF NOT EXISTS` / `ADD COLUMN`, žiadne `DROP COLUMN`, žiadne mazanie dát —
ale je to viac než jeden index a treba to zmapovať celé, nie aplikovať naslepo.

## 6. Čo tento PR robí a čo nie

**Robí:** pripína v `realvia-failure-cause.verification.test.ts`, že žiadna
novšia migrácia globálny unique index na `properties (source_id)` nezaloží,
a že `20260617120000` ten tenantový skutočne zakladá. Klasifikátor zlyhaní pozná
`duplicate_source_id` a zachytáva starý aj nový názov indexu, aby po oprave
neoslepol.

**Nerobí:** nič na PROD. Aplikovanie migrácie je samostatný krok a čaká na GO.
