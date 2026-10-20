# PROD migrácie: BRI ON CONFLICT + tenantový unique na `properties.source_id`

**Dátum:** 2026-10-20 · **GO:** founder „GO PROD-MIGRACIE" · **Projekt:** `ypgajkhqtbriqqmyawyv`
(identita overená v tom istom spojení: 7 agentúr, 524 leadov, 164 ponúk)

Zhrnutie jednou vetou: **migrácia A je celá na PROD a dokázateľne funguje**, z migrácie B
prešlo všetko okrem jediného príkazu `DROP INDEX`, ktorý zablokovala bezpečnostná brána
nástroja — ten ostáva na foundera.

---

## 1. Mapa ciest (pred zápisom)

### Migrácia A — `20261020050000_bri_onconflict_lead_id.sql`

| cesta | zistenie |
|---|---|
| `compute_bri_score(text, uuid)` | `ON CONFLICT (profile_id, lead_id)` — **1× výskyt**, `DO UPDATE SET` **1×** |
| `compute_bri_score_v2(text, uuid, text)` | to isté, 1× a 1× |
| `lead_scores` constraints | `PRIMARY KEY (id)`, `UNIQUE (lead_id)`, 2× FK, 1× CHECK — **composite neexistuje** |
| volajúci v1 | `src/lib/events/bri-score.ts:72` (cron `recompute-bri`, `/api/leads/bri-recompute`) |
| volajúci v2 | `src/lib/bri/engine.ts:28` |
| **tretí zapisovateľ** | `src/lib/db/enterprise-intelligence-store.ts:94` — `upsert(..., { onConflict: "lead_id" })` z `/api/ai/process-lead` |
| čitatelia | `bri-score.ts:110/130`, `use-bri-score.ts`, `use-bri-live.ts`, `dashboard/summary` — čítajú `.eq('lead_id').eq('profile_id')` |
| RLS `lead_scores` | 3 politiky (`lead_scores_agency`, `lead_scores_tenant` pre `authenticated`, `users see own scores`) — migrácia ich **nemení** |

Z čitateľov vyplýva, prečo patch musí obsahovať aj `profile_id = EXCLUDED.profile_id`:
bez toho by po prepise leadu na iného makléra riadok ostal pod starým `profile_id`
a čítanie `.eq(lead_id).eq(profile_id)` by ho nenašlo.

Zachovanie práv: `pg_get_functiondef` vracia `CREATE OR REPLACE FUNCTION`, takže
`EXECUTE` grant pre `service_role`, `SECURITY DEFINER` aj vlastník ostávajú.

### Migrácia B — `20260617120000_uc_export_mapper.sql`

| kontrola | výsledok | dôsledok |
|---|---|---|
| je `idx_properties_source_id_unique` krytý constraintom? | **nie, samostatný index** | `DROP INDEX` by prešiel |
| duplicity na `(agency_id, source_system, source_id)` | **0 skupín** | nový unique sa dá založiť |
| riadky `source_id NOT NULL` **a** `agency_id NULL` | **0** | nový (čiastočný) index nestráca pokrytie |
| hodnoty v `import_jobs.source_system` | iba `realvia` (1 riadok) | rozšírený CHECK validuje |
| `realsoft_import_logs.result_code` | **už existuje** | no-op |
| `profiles.import_*` | **neexistovali** | aditívne pridané |
| `properties.*` stĺpce z migrácie | **všetky už existovali** | no-op |
| RLS `properties` | 1 politika (`properties_tenant`, `authenticated`) | nedotknuté |

Kód je na tenantový index napísaný už dnes — `processQueue.ts:217–224` robí
`.eq('agency_id').eq('source_system','realvia').eq('source_id')` a potom
INSERT/UPDATE. **Nikde v `apps/crm/src` neexistuje `onConflict` na `source_id`.**
Zrušenie globálneho indexu teda nerozbije žiadnu zapisovaciu cestu; odstraňuje
príčinu septembrových `duplicate key` pádov (11. 9.: 24 z 25 pokusov).

---

## 2. Čo sa zapísalo

Oproti súboru migrácie je jedna zmena poradia: **nový index sa zakladá PRED zrušením
starého**, aby ani na okamih neexistovalo okno bez ochrany proti duplicitám.
Výsledný stav je identický.

| krok | stav |
|---|---|
| `profiles` + 5× `import_*` stĺpec, komentáre | ✅ |
| `uq_profiles_uc_import_source` | ✅ založený |
| `properties` ADD COLUMN ×18 | ✅ (no-op, už existovali) |
| `realsoft_import_logs.result_code` | ✅ (no-op) |
| `import_jobs_source_check` + `uc`, `realvia-json` | ✅ |
| `idx_properties_tenant_source_unique` | ✅ **založený** |
| `DROP INDEX idx_properties_source_id_unique` | ❌ **neprešlo — viď §4** |
| migrácia A (patch oboch funkcií) | ✅ |

---

## 3. Dôkaz PO — funkcie naozaj bežia

Nie „text funkcie sa zmenil", ale skutočné volanie v PROD:

```
compute_bri_score('rm-20260826-06', 7e2b9c4a-…)   → 12      (1. volanie, INSERT)
compute_bri_score('rm-20260826-06', 7e2b9c4a-…)   → 12      (2. volanie, vetva ON CONFLICT)
compute_bri_score_v2('rm-20260826-07', …)          → new_score 16, old_score 0,  delta 16
compute_bri_score_v2('rm-20260826-07', …)          → new_score 16, old_score 16, delta 0
```

Druhé volanie je ten test, o ktorý ide: presne vetva `ON CONFLICT` predtým padala na
`there is no unique or exclusion constraint matching the ON CONFLICT specification`.

`lead_scores`: **0 → 2 riadky**. `bri_score_history`: **2 záznamy**.
Za celú existenciu tabuľky dovtedy nevzniklo ani jedno BRI skóre.

Zachované: `secdef=true`, `owner=postgres`, `service_role=X/postgres` na oboch funkciách;
signatúry nezmenené.

---

## 4. Jediný krok, ktorý ostáva founderovi

`DROP INDEX` cez MCP nástroj **nejde** — nástroj deštruktívne príkazy púšťa cez
potvrdenie, ktoré sa do tejto session nedostane, takže volanie po 60 s vyprší a
transakcia sa vráti späť. Overené trikrát; každý iný krok (vrátane `DROP CONSTRAINT`)
prešiel okamžite. **Bránu som neobchádzal** — dá sa to obísť dynamickým SQL v `DO`
bloku a to je presne to, čo sa robiť nemá.

V Supabase SQL editore (jeden riadok):

```sql
DROP INDEX IF EXISTS public.idx_properties_source_id_unique;
```

Overenie, že je hotovo (má vrátiť iba tenantový index):

```sql
SELECT indexname FROM pg_indexes
WHERE schemaname='public' AND tablename='properties' AND indexdef LIKE '%UNIQUE%';
```

**Kým sa to nespustí, dve agentúry stále nemôžu mať tú istú inzerátovú id** —
pôvodná príčina septembrových pádov trvá, hoci nový index už existuje vedľa.

---

## 5. Zámerne nezapísané do ledgera

`supabase_migrations.schema_migrations` dostalo **len** `20261020050000`.
`20260617120000` tam **nie je** a nemá tam byť, kým nedobehne `DROP INDEX` — inak by
ledger tvrdil niečo, čo nie je pravda. Celá migrácia je idempotentná
(`IF NOT EXISTS` / `DROP … IF EXISTS`), takže po doplnení `DROP INDEX` ju možno
prehnať znova bez vedľajších účinkov a až potom zapísať.

---

## 6. Vedľajší nález (nič sa s ním nerobilo)

`realvia_schema_health()` v PROD existuje a hlási kľúč
`partial_unique_index_properties_source_id` podľa **starého** názvu indexu
(`20260512174500_realvia_schema_health_rpc.sql:69–75`). Po dokončení §4 sa preklopí na
`false`, hoci schéma bude správna. Funkciu **nikto nevolá** — v celom repozitári nie je
ani jeden TS/MJS volajúci ani test. Je to teda zastaralý signál, nie porucha; oprava je
mimo rozsah tohto GO.
