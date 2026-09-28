# GHOST-MIGRATIONS-RECONCILE — čo je v PROD zapísané a nemá to v repe zdroj

**Brána:** `GO GHOST-MIGRATIONS-RECONCILE`. **Žiadny zápis do PROD.** Čítanie
`supabase_migrations.schema_migrations` + lokálna simulácia.
**Dátum merania:** 2026-09-24, ~19:40 UTC. Projekt `ypgajkhqtbriqqmyawyv`.
**Stav repa:** `main` @ `ebb55b1f`, 114 migračných súborov. Audit dáva na tomto
commite rovnaký výsledok ako pri meraní.

---

## 1. Oprava môjho vlastného tvrdenia

Bránu som navrhol vetou, že v PROD je *5 duchov — verzií bez súboru v repe* —
a že ich treba **zrekonštruovať ako 5 nových migrácií**.

Tie súbory som **nevytvoril, lebo meranie ukázalo, že by boli duplicitné.**

Predchádzajúce číslo vzniklo porovnaním **reťazcov verzií**. To je tá istá
trieda chyby, akú som v tejto session spravil dvakrát predtým (`ADD CONSTRAINT`,
BOM): záver z porovnávania textu tam, kde rozhodnúť mohol len obsah. Správny
test je **md5 uloženého SQL proti md5 súboru** — Supabase text migrácie ukladá.

---

## 2. Dôkaz: 4 zo 6 nepriradených verzií sú to isté SQL pod iným razítkom

| verzia v PROD | meno | md5 uloženého SQL | súbor v repe | zhoda |
|---|---|---|---|---|
| `20260802134100` | valuation_estimates | `9ee5698c…` | `20260731210000_valuation_estimates.sql` | ✅ bajt na bajt (bez koncového `\n`) |
| `20260802134104` | system_usage_agency | `2db81c28…` | `20260731220000_system_usage_agency.sql` | ✅ bajt na bajt (bez koncového `\n`) |
| `20260923113535` | repair_scheduled_events_phase1 | `f1af8cde…` | `20260527143000_event_scheduler_phase1.sql` | ✅ bajt na bajt (**s** koncovým `\n`) |
| `20260923120358` | repair_scheduled_events_phase1 | `8ccd9dbd…` | `20260527143000_event_scheduler_phase1.sql` | ✅ bajt na bajt (bez koncového `\n`) |

Tie dve „opravy" z 23. 9. sú **ten istý súbor spustený dvakrát**, raz cez cestu,
ktorá odsekla koncový newline. Nepridali ani jeden objekt: nameraný tvar
`scheduled_events` v PROD (20 stĺpcov, 8 constraintov, 5 indexov + pkey, RLS on,
1 policy, 0 triggerov) sa **presne** rovná tomu, čo vytvára
`20260527143000_event_scheduler_phase1.sql`.

Zvyšné dve:

| verzia | meno | stav |
|---|---|---|
| `20260904184236` | drop_open_anon_policies | **priradené ručne** — je to nechránený variant `20260904150000_drop_open_anon_policies.sql`. Rovnaká množina príkazov, repo verzia má navyše `to_regclass` guardy a `BEGIN/COMMIT`. Overené v PROD: všetky `demo_*` a `*anon*` policies sú preč, `pipeline_moves_tenant_select/write` existujú v tvare, aký vytvárajú obe verzie. |
| `20260924193624` | ai_cost_daily_view | **skutočne bez zdroja v repe.** Aplikované do PROD dnes o 19:36 UTC, ~20 minút pred týmto meraním. |

**Chýbajúce DDL teda nie je päť. Je jedno.**

---

## 3. 🔴 To jedno chýbajúce DDL je blokant F3

`20260924193624` vytvorilo v PROD nový `ai_cost_daily`:

```sql
CREATE VIEW public.ai_cost_daily WITH (security_invoker = true) AS
SELECT agency_id, …::date AS day_utc, count(*)::integer AS action_count,
       coalesce(sum(cost_eur),0)::numeric(12,4) AS cost_eur
FROM public.ai_action_audit WHERE agency_id IS NOT NULL GROUP BY …;
```

V repe je `20260611000004_ai_cost_daily.sql` — a je **v neaplikovanej dávke**,
takže `db push` ho spustí. Jeho `CREATE OR REPLACE VIEW` má na 3. mieste
`credits_spent`, nie `action_count`.

Odsimulované lokálne (PostgreSQL 16) proti fixture v **nameranom PROD tvare**:

```
$ psql -v ON_ERROR_STOP=1 -f 20260611000004_ai_cost_daily.sql
NOTICE:  column "model" of relation "ai_action_audit" already exists, skipping
NOTICE:  column "latency_ms" of relation "ai_action_audit" already exists, skipping
ALTER TABLE
ERROR:  cannot change name of view column "action_count" to "credits_spent"
HINT:  Use ALTER VIEW ... RENAME COLUMN ... to change name of view column instead.
psql exit = 3
```

**`db push` by sa na tomto súbore zastavil.** Nie tichý rozpad — tvrdý stop
uprostred dávky.

### Prečo to F1 ani CI nemohli nájsť

Ten istý súbor proti tvaru, aký vidí replay postavený **z migrácií** (tam má
`ai_cost_daily` starý tvar):

```
1. beh  exit = 0
2. beh (dvojitý replay)  exit = 0
```

Zelená. F1 dokazovala idempotenciu proti základu z migrácií — a proti nemu je
tento súbor idempotentný. Zlyhá len proti **skutočnému PROD**, kde ten pohľad
medzičasom niekto prepísal do iného tvaru. Presne diera, ktorú F2B pomenovala
ako neoverenú; toto je jej prvý doložený prípad.

### Čo je na tom dobré

Nový pohľad v PROD je **vecne lepší** než ten v repe: nesie iba skutočný náklad,
tržbu a maržu necháva TypeScriptu, a má `security_invoker = true` (repo verzia
nemá, čiže by bežala s právami vlastníka a obišla RLS `ai_action_audit`).
Repo je pozadu za PROD, nie naopak. Migrácia sa má prepísať na PROD tvar —
to je samostatná brána, nie táto.

Ostatné dva pohľady z neaplikovanej dávky som overil tiež:
`genome_decision_open` — 11 stĺpcov, mená aj poradie sedia s PROD, `CREATE OR
REPLACE` prejde; `ai_action_daily_agency` — v PROD neexistuje, vznikne.

---

## 4. Skutočný rozsah `db push`

| | počet | dôkaz |
|---|---|---|
| súborov v repe | 114 | `ls` |
| verzií registrovaných v PROD | 57 | `schema_migrations` |
| súborov, ktoré `db push` spustí | **61** | verzia nie je v PROD |
| z toho už v PROD pod iným razítkom (spustia sa zbytočne) | 2 | md5 |
| ďalší, kde je to isté platné ručne | 1 | `drop_open_anon_policies` |
| **nesúcich naozaj nové DDL** | **~58** | |

Tie tri sú idempotentné, takže opakovanie je neškodné — ale číslo „63
neaplikovaných", ktoré nesie F2B aj plán nasadenia, **nadhodnocuje skutočnú
zmenu**. Správne číslo je 61 spustení / ~58 s novým obsahom.

---

## 5. Prečo som nevytvoril žiadnu novú migráciu

Päť súborov, ktoré brána žiadala, by znamenalo:

- druhý `valuation_estimates`, druhý `system_usage_agency`, tretí
  `event_scheduler_phase1` — duplicitná línia pre objekty, ktoré repo už má,
- a nový súbor pre `drop_open_anon_policies`, ktorý by prepísal chránený
  variant nechráneným.

To by parity nezlepšilo, zhoršilo. Jediné chýbajúce DDL (`ai_cost_daily`)
nemá byť nový súbor, ale **oprava existujúceho** `20260611000004` — a tá mení
správanie merania nákladov, takže patrí pod vlastné GO.

---

## 6. Pravidlo (platí od teraz)

> **Každý zápis do PROD musí mať v repe súbor s tým istým razítkom.**
>
> Kto aplikuje migráciu cez MCP alebo Dashboard, v tom istom PR pridá
> `apps/crm/supabase/migrations/<to isté razítko>_<to isté meno>.sql`
> s presne tým SQL, ktoré spustil. Nie „ekvivalentné", nie „upratané".
>
> Spustiť existujúci súbor pod novým razítkom je tiež porušenie: vznikne
> alias, ktorý `db push` zopakuje a ktorý každé počítanie odchýlky pokazí.
> Opraviť sa to má zápisom pôvodného razítka, nie novým.
>
> Prepísať v PROD objekt, ktorý vytvára neaplikovaná migrácia, bez opravy tej
> migrácie, je najhorší prípad — `db push` sa na ňom zastaví. Viď §3.

---

## 7. Nástroj

`scripts/db/migration-ledger-audit.mjs` — bez závislostí. Vstup je JSON výpis
`schema_migrations` (dotaz je v hlavičke súboru), výstup klasifikácia
MATCH / ALIAS / GHOST a zoznam neaplikovaných. Exit 1, ak je GHOST.

```
$ node scripts/db/migration-ledger-audit.mjs --ledger scripts/db/fixtures/prod-ledger-2026-09-24.json
repo súborov:        114
v PROD registrované: 57
  MATCH:  51
  ALIAS:  4  (to isté SQL pod iným razítkom)
  GHOST:  2
…
neaplikované (db push ich spustí):        61
z toho už v PROD pod iným razítkom:       2
FAIL: 2 verzií v PROD sa nedá priradiť k súboru v repe.
exit=1
```

Reprodukuje ručné meranie z §2 do posledného riadku.

**Hranica nástroja, priznaná v kóde aj v testoch:** Supabase ukladá
`statements` ako pole príkazov. Pri jednopríkazovej migrácii je to celý súbor
a md5 sedí na bajt — tam je ALIAS dôkaz. Pri viacpríkazovej je text rozsekaný
a znovu poskladaný, takže md5 na súbor nesadne; 5 záznamov má `stmts = 0`
(registrované úplne bez textu). **GHOST je preto podnet na ručné dohľadanie,
nie rozsudok** — presne ako `20260904184236` v §2, ktorý nástroj označí GHOST
a ktorý som priradil ručne.

Testy: `node scripts/db/migration-ledger-audit.test.mjs` → 12/12.
Mutačne overené: odstránenie tvaru bez koncového newline zhodí 5 testov,
pripustenie md5 zhody pri `stmts > 1` zhodí 1. Harness teda meria.

---

## 8. Čo ostáva otvorené

- **`20260611000004_ai_cost_daily.sql` vs PROD** — blokant F3, vlastná brána.
- **`pipeline_moves_tenant_select/write`** nesú v PROD vetvu
  `leads.agency_id IS NULL OR …` — tú istú, ktorú P-3 zavrela inde. Backlog.
- **`stmts = 0`** pri 5 záznamoch: `20260811220000`, `20260817220000`,
  `20260903070000`, `20260924060000`, `20260924120000`. Súbory k nim existujú,
  takže dnes nič neskrývajú, ale md5 ich potvrdiť nevie.
- Dve rozhodnutia pred F3 stále nezodpovedané: **PITR add-on** a **klon áno/nie**.
