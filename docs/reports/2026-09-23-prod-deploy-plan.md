# 2026-09-23 — PROD deploy plán: audit 63 neaplikovaných migrácií

**Brána:** `GO PROD-DEPLOY-PLAN` — READ ONLY. Žiadny push, žiadny deploy, žiadna
zmena migrácie. Výstup je zistenie + poradie + rollback.

## Hlavný záver

**`supabase db push` dnes neprejde.** Nespadne na dátach — spadne na DDL, ktoré
sa pokúsi vytvoriť objekt, čo v PROD už existuje. Prvé zlyhanie je **druhá**
neaplikovaná migrácia v poradí.

Riziko teda **nie je strata dát**. Riziko je **čiastočná aplikácia**: Supabase
migruje po jednej v transakcii a pri prvej chybe skončí. To, čo prešlo predtým,
ostane zapísané v `schema_migrations`; zvyšok nie. Výsledok je stav, ktorý
nezodpovedá ani repu, ani dnešnému PROD — a `schema_migrations` bude tvrdiť,
že časť prebehla.

## Nameraný stav

| | počet |
|---|---|
| migrácií v repe | 111 |
| záznamov v `supabase_migrations.schema_migrations` | 51 |
| **neaplikovaných** | **63** |
| „duchovia" — v `schema_migrations`, ale **nie v repe** | 3 |

Duchovia: `20260802134100 valuation_estimates`, `20260802134104 system_usage_agency`,
`20260904184236 drop_open_anon_policies`. PROD nesie zmeny bez zdroja v repe.
Pozn.: repo má `20260904150000_drop_open_anon_policies.sql` (neaplikovaná) —
tá istá intencia pod iným timestampom.

## Body zlyhania — 16 príkazov v 4 súboroch

Každý z nich vytvára objekt bez guardu a **ten objekt v PROD overene existuje**
(merané `pg_class` / `pg_policies` / `pg_trigger` / `pg_proc`).

| # | súbor | príkazov | typ |
|---|---|---|---|
| 1 | `20260527120000_stealth_recruiter_prospects.sql` | 1 | `CREATE POLICY stealth_recruiter_prospects_tenant` |
| 2 | `20260608120000_universal_crm_import.sql` | 13 | 9× `CREATE INDEX`, 3× `CREATE POLICY`, 1× `CREATE TRIGGER` |
| 3 | `20260629120000_acquire_dedup_keys.sql` | 1 | `CREATE POLICY service_role_only` |
| 4 | `20260722120000_sandbox_gdpr_consent.sql` | 1 | `CREATE FUNCTION` bez `OR REPLACE` |

**Prvé zlyhanie:** súbor č. 1, riadok 31 — `42710 policy ... already exists`.
Pred ním prejde len `20260310_baseline_core_schema.sql`.

Deväť indexov zo súboru č. 2 (riadky 136–144, `idx_import_jobs_*`,
`idx_import_rows_*`, `idx_migration_cases_*`) — všetkých 9 v PROD existuje.

## Čo naopak riziko NIE JE

- **`CREATE TABLE`:** 44 výskytov, **všetky** `IF NOT EXISTS`. Ani jeden neguardovaný.
- **`ADD CONSTRAINT`:** 5 výskytov, **všetky** majú pred sebou
  `DROP CONSTRAINT IF EXISTS` → idempotentné. (Prvotne som ich označil ako riziko;
  po prečítaní súborov to neplatí.)
- **`ADD COLUMN`:** 0 neguardovaných. **`CREATE TYPE`:** 0.
- **Jediná deštruktívna operácia** — `DROP COLUMN realsoft_export_pass`
  (`20260616103500_realsoft_auth_hash_hardening.sql`) — je `ALTER TABLE IF EXISTS`
  + `DROP COLUMN IF EXISTS`, a v PROD je ten stĺpec **už dávno zhodený**
  (`information_schema.columns` = 0, hash stĺpec existuje). No-op, žiadna strata dát.

## Navrhované poradie

**F1 — spraviť tých 16 príkazov idempotentnými.** Jeden PR, 4 súbory,
mechanická zmena: `CREATE INDEX IF NOT EXISTS`, `DROP POLICY IF EXISTS` pred
`CREATE POLICY`, `DROP TRIGGER IF EXISTS` pred `CREATE TRIGGER`,
`CREATE OR REPLACE FUNCTION`. Overenie: `supabase db reset` v CI musí naďalej
postaviť identický substrát, plus lokálny replay celého setu 2× za sebou
(druhý beh dokazuje idempotenciu).

**F2 — nácvik na Supabase branch, nie na PROD.** Supabase branching vytvorí
kópiu; `db push` proti nej je jediný dôkaz, že celá dávka prejde. Bez tohto
kroku je F3 hádanie. *Otvorená otázka pre vlastníka: či je branching na tomto
pláne dostupný a čo stojí.*

**F3 — `db push` na PROD**, až keď F2 prešla načisto.

**F4 — parity verifikácia po pushi** — md5 fingerprint nad `pg_catalog`
(stĺpce, constrainty, indexy, RLS, policies, funkcie) CI vs PROD, rovnakou
metódou ako pri legalizačných bránach #619/#625/#628.

## Rollback

- **F1** je čistý revert PR — nič sa nedotklo PROD.
- **F3** rollback **neexistuje ako jedno tlačidlo.** Pred pushom treba PITR
  bod alebo `pg_dump`. *Otvorená otázka: či je na tomto Supabase pláne PITR
  zapnuté a aké má okno.* Bez odpovede F3 nespúšťať.
- Väčšina dávky je additívna (`CREATE ... IF NOT EXISTS`, policies), takže
  praktický rollback je skôr „zhoď, čo pribudlo" než „vráť dáta" — ale to je
  tvrdenie o dnešnom obsahu dávky, nie záruka.

## Čo tento dokument NEROBÍ

Nemení ani jednu migráciu, nespúšťa push, nerozhoduje o F2/F3. Dve otvorené
otázky (branching, PITR) sú pre vlastníka; bez nich sa F3 nedá zodpovedne
naplánovať.
