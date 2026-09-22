# N04 — SMO-B04 PROD evidence (tenancy + freshness)

## S2 TASK

Dodaj **PROD** dôkaz pre B04. Kód je CODE_PRESENT (#569 + #573). Status v registri
zostáva BLOCKED, kým nie sú tri PROD kritériá doložené.

Worker **nepíše do prod**. Ak nemá read-only SQL prístup → výstup `HUMAN`
so zoznamom príkazov pre ops/foundera.

## S3 TERRITORY

**Write:** `docs/reports/YYYY-MM-DD-smo-b04-prod-evidence.md` (NOVÝ)  
Voliteľne: **jeden** riadok/status update v registri **až keď** report obsahuje
výstupy SQL s časom UTC — inak register nemeň.

**Forbidden:** app kód, migrácie, apply DDL, service role v commite

## S4 ACCEPTANCE

Report obsahuje pre každé kritérium `PASS|FAIL|unknown` + raw výstup:

1. existencia `properties.realvia_updated_at` v prod
2. rozdelenie veku `realvia_updated_at` (napr. ≤7d / >7d / NULL)
3. negatívny cross-tenant dôkaz (alebo prečo unknown + čo treba)

Bez (1)(2)(3) nie je B04 PASS.

## S5 VALIDATION

Lokálne (vždy):

```bash
git fetch origin main
rg -n "realvia_updated_at|public-visibility|agency_id" apps/crm/src/lib/properties apps/crm/src/lib/properties-store.ts | head
gh pr view 573 --json state,mergedAt,mergeCommit,url
```

Prod (len read-only; spúšťa ten, kto má prístup — výstup vložiť do reportu):

```sql
select count(*) as has_col
from information_schema.columns
where table_schema='public' and table_name='properties' and column_name='realvia_updated_at';

select
  count(*) filter (where realvia_updated_at is null) as null_ts,
  count(*) filter (where realvia_updated_at >= now() - interval '7 days') as fresh_7d,
  count(*) filter (where realvia_updated_at <  now() - interval '7 days') as stale_7d
from public.properties;
```

Cross-tenant: postup z registra / negative test — **žiadny zápis**.

## S6 FAILURE

- Žiadny prod prístup → `HUMAN` + GO-B04-PROD checklist
- Stĺpec chýba → `BLOCKED` (fail-closed skryje ponuky) + návrh ďalšieho uzla (migrácia = samostatné GO, nie ticho)

## S7 HANDOFF

```text
NODE: N04
RESULT: DONE|BLOCKED|HUMAN
B04_PROD: PASS|FAIL|unknown
COL_realvia_updated_at: yes|no|unknown
FRESHNESS_SUMMARY: ...
CROSS_TENANT: PASS|FAIL|unknown
GO_REQUIRED: GO-B04-PROD | none
REPORT: ...
```
