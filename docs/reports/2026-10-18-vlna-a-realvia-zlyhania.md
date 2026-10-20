# Vlna A — Realvia fronta: čo je zmerané a čo stále nie je príčina

**Dátum:** 2026-10-18 · **PROD:** Supabase `ypgajkhqtbriqqmyawyv` · **Zápis do PROD:** nie, iba čítanie.

Všetky čísla nižšie som dotazoval **v tomto turne**, nie prebral z workera ani
z pamäte. Vlnu A (6 workerov, 87 agentov, 729,5 k tokenov) som zastavil na pokyn
foundera; z nej som použil len *smer*, kam sa pozerať — nie jej závery.
Každé nosné tvrdenie som premeral sám.

---

## 1. Celková miera zlyhaní: 83,41 % (ZMERANÉ)

```sql
SELECT count(*) AS metric_rows, sum(jobs_processed), sum(jobs_succeeded), sum(jobs_failed),
       sum(jobs_succeeded) + sum(jobs_failed) AS ok_plus_fail,
       round(100.0*sum(jobs_failed)/nullif(sum(jobs_processed),0), 2) AS fail_pct,
       min(recorded_at), max(recorded_at)
FROM realvia_metrics;
```

| metric_rows | processed | succeeded | failed | ok+fail | fail % | od | do |
|---|---|---|---|---|---|---|---|
| 1 077 | **1 543** | **256** | **1 287** | **1 543** | **83,41** | 2026-05-21 08:05 | 2026-10-14 18:35 |

Identita `256 + 1287 = 1543 = processed` je dôkaz, že `jobs_processed` **už zlyhania
obsahuje**. Staré číslo v matici — „z 2 830 pokusov 1 287 zlyhalo (45 %)" — bolo
dvojité započítanie (`1543 + 1287 = 2830`). To číslo som tam dal ja a bolo
označené ako „zmerané", hoci bolo odvodené. Opravené v tomto PR.

## 2. Nie je to jeden trvalý stav — a nie je to ani „všetko máj" (ZMERANÉ)

| mesiac | dávok | processed | ok | fail | fail % |
|---|---|---|---|---|---|
| 2026-05 | 982 | 1 286 | 97 | **1 189** | **92,5** |
| 2026-06 | 9 | 25 | 16 | 9 | 36,0 |
| 2026-07 | 18 | 48 | 48 | 0 | 0,0 |
| 2026-08 | 7 | 17 | 17 | 0 | 0,0 |
| 2026-09 | 53 | 151 | 62 | **89** | **58,9** |
| 2026-10 | 8 | 16 | 16 | **0** | **0,0** |

**Opravujem tu aj svoje vlastné predchádzajúce zhrnutie.** V #864 som napísal
„jún – dnes: 38,1 %" ako jeden riadok. Ten agregát **zakrýval september**:
v septembri bolo 89 zlyhaní pri 58,9 %. Veta „92,4 % zlyhaní padá do rozbehového
týždňa v máji" je číselne pravdivá, ale ako obraz zavádzajúca — máj a september
spolu nesú 1 278 z 1 287 zlyhaní (99,3 %), pričom september je **samostatná,
novšia udalosť**, nie dozvuk mája.

**Október: 16 pokusov, 0 zlyhaní.** To je jediné čerstvé meranie a je čisté.

## 3. Denný rozpad dní so zlyhaním (ZMERANÉ)

| deň | dávok | processed | ok | fail |
|---|---|---|---|---|
| 2026-05-21 | 186 | 186 | 0 | 186 |
| 2026-05-22 | 288 | 325 | 0 | 325 |
| 2026-05-23 | 178 | 356 | 0 | 356 |
| 2026-05-26 | 187 | 235 | 48 | 187 |
| 2026-05-27 | 132 | 132 | 0 | 132 |
| 2026-05-28 | 3 | 6 | 3 | 3 |
| 2026-06-19 | 1 | 10 | 9 | 1 |
| 2026-06-25 | 6 | 13 | 5 | 8 |
| 2026-09-11 | 8 | 25 | 1 | **24** |
| 2026-09-21 | 3 | 3 | 0 | 3 |
| 2026-09-22 | 2 | 5 | 1 | 4 |
| 2026-09-23 | 4 | 8 | 0 | 8 |
| 2026-09-24 | 15 | 36 | 8 | **28** |
| 2026-09-25 | 6 | 14 | 2 | 12 |
| 2026-09-28 | 3 | 6 | 0 | 6 |
| 2026-09-30 | 4 | 34 | 30 | 4 |

Májové dni majú tvar **1 dávka ≈ 1 job**: 186 dávok / 186 jobov za jeden deň.
To je stopa po ére „externý cron každých 5 minút", nie po dnešnom dennom crone.

---

## 4. Príčina: NIE JE ZISTENÁ. Toto je dôležitejšie než percentá.

### 4.1 Nikde nie je uložená príčina jedného pokusu (ZMERANÉ)

```sql
SELECT count(*) AS vsetky_riadky,
       count(*) FILTER (WHERE meta IS NOT NULL AND meta::text NOT IN ('{}','null')) AS s_meta
FROM realvia_metrics;
```

→ `1077 / 0`. **Ani jeden** z 1 077 riadkov metrík nenesie `meta`. Neexistuje
stĺpec s HTTP stavom, ani s typom chyby. Z `realvia_metrics` sa teda príčina
**principiálne nedá** zistiť — iba počty.

Jediné textové chyby sú vo fronte, a je ich päť:

```sql
SELECT count(*) AS riadkov,
       count(*) FILTER (WHERE error_message IS NOT NULL AND btrim(error_message) <> '') AS s_chybou,
       count(*) FILTER (WHERE retry_count > max_retries) AS nad_limit,
       max(retry_count) AS max_retry,
       count(*) FILTER (WHERE status='pending')  AS pending,
       count(*) FILTER (WHERE status='failed')   AS failed,
       count(*) FILTER (WHERE status='completed') AS completed
FROM realvia_processing_queue;
```

| riadkov | s chybou | nad limit | max retry | pending | failed | completed |
|---|---|---|---|---|---|---|
| 253 | **5** | **2** | **518** | 0 | 1 | 252 |

| status | retry | max | vytvorené | spracované | chyba |
|---|---|---|---|---|---|
| completed | **518** | 3 | 2026-05-21 19:36 | 2026-05-23 14:45 | `Unknown payload structure` |
| completed | **215** | 3 | 2026-05-22 20:52 | 2026-05-23 14:45 | `Unknown payload structure` |
| failed | 3 | 3 | 2026-05-25 11:11 | 2026-09-30 12:00 | `Agency resolution failed` |
| completed | 1 | 3 | 2026-09-11 12:12 | 2026-09-30 11:55 | `duplicate key value violates unique constraint "idx_properties_source_id_unique"` |
| completed | 0 | 3 | 2026-05-21 08:04 | 2026-05-21 19:10 | `Unknown payload structure` |

**5 textov chyby na 1 287 zlyhaní.** Pokrytie 0,4 %.

### 4.2 Retry-slučka je REÁLNY BUG, ale NEVYSVETĽUJE tie zlyhania

Čo **obstálo**: `retry_count` 518 a 215 pri `max_retries = 3` je zmerané.
Strop retry naozaj nedržal — `replay_failed` vracal job do fronty a nuloval
počítadlo. To je skutočná chyba a oprava (`planQueueFailure` ponechá
`failed` po vyčerpaní, terminálna hláška pre probe payload, `replay_failed`
ju preskočí) je vo vetve bodu 4.

Čo **neobstálo** — a preto to v matici nie je:

1. **Počty nesedia.** 518 + 215 = **733** retry pokusov. Zlyhaní je **1 287**.
   Aj keby každý jediný retry zapísal presne jedno zlyhanie, chýba 554.
2. **Časy nesedia.** Oba poison riadky sú `completed` s `processed_at`
   **2026-05-23 14:45**. Po tom dni ich počítadlá už nerastú. Zlyhania však
   pokračujú: **26. 5. (187), 27. 5. (132), 28. 5. (3) = 322 zlyhaní** po tom,
   ako boli oba riadky zavreté.
3. **September je iná udalosť.** 89 zlyhaní v septembri, s jediným textom chyby
   `duplicate key … idx_properties_source_id_unique` (11. 9., deň s 24 zlyhaniami).
   To je kolízia na `source_id`, nie neznámy payload. Retry-slučka to nevysvetľuje
   vôbec.

**Záver:** retry-slučka je oprava, ktorú treba zmergovať, ale ako *príčina* 83 %
miery zlyhaní je vyvrátená. Kto by ju tam napísal, opakuje presne chybu
s číslom 45 %: odvodené tvrdenie v šate zmeraného.

---

## 5. Čo by príčinu skutočne zistilo (poradie podľa ceny)

1. **Jeden `.xlsx` / export z Realvie od dodávateľa.** Čaká sa na neho už od
   bodu 4. Bez skutočného payloadu je `Unknown payload structure` nediagnostikovateľný.
   To je jediný krok, ktorý stojí 0 h práce na našej strane.
2. **Stĺpec s príčinou v `realvia_metrics`** (`meta jsonb` sa už nepíše; buď ho
   začať písať, alebo pridať `last_error text`). Bez toho bude každá budúca
   analýza opäť končiť pri „5 textov na 1 287 zlyhaní". **Migrácia → founder GO.**
3. **Pin na `idx_properties_source_id_unique`:** import, ktorý narazí na existujúce
   `source_id`, má skončiť „už je v CRM", nie zlyhaním. Toto je jediná septembrová
   chyba, ktorú máme čiernobielu.

## 6. Čo sa do matice ZÁMERNE nedostalo

Príčina. V matici je po tomto PR iba zmerané: 83,41 % celkovo, rozpad máj /
september / október a veta, že príčina nie je zistená a *per-attempt* sa ani
uložená nemá kde. Žiadny kauzálny príbeh.
