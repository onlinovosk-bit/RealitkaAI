# Preflight audit dodávky: PR sa nehromadia, hromadí sa medzera medzi mergom a účinkom

**Dátum:** 2026-10-20 · **PROD:** `ypgajkhqtbriqqmyawyv` · **Zápis do PROD:** nie (iba čítanie).

Všetky čísla sú dotazované priamo (GitHub REST, Supabase SQL). Čo som nemeral,
je označené **NEZMERANÉ**.

---

## 1. Hypotéza foundera je z polovice vyvrátená

Hypotéza: vývoj a testovanie predbiehajú dodanie do produkcie, takže sa hromadia PR.

**Pre PR to neplatí.** Za 5 mesiacov:

| mesiac | otvorené | zmergované | zavreté bez merge |
|---|---|---|---|
| 2026-06 | 182 | 170 | 4 |
| 2026-07 | 74 | 70 | 3 |
| 2026-08 | 152 | 104 | 5 |
| 2026-09 | 275 | 285 | 7 |
| 2026-10 | 117 | 99 | 29 |
| **spolu** | **800** | **728** | **48** |

Otvorených teraz **24**, teda 3 % z toho, čo prešlo. Merge rate kopíruje tempo
otvárania. Úzke hrdlo to nie je.

## 2. Čo sa naozaj hromadí: merge bez účinku

Za 14 dní **51 behov cronov, z toho 1 `ok`**:

| job | behov | ok | čo hlási | zapísané |
|---|---|---|---|---|
| `realvia-process` | 16 | 1 | 15× `empty_queue` | 2 |
| `recompute-bri` | 14 | 0 | 11× „events má 0 riadkov" + **3× pád RPC** | 0 |
| `morning-brief` | 14 | 0 | `morning_brief_settings` má 0 riadkov | 0 |
| `gmail-inbound-pull` | 4 | 0 | `{"skipped":"disabled"}` | 0 |
| `follow-up-sweep` | 3 | 0 | `failed`, detail `planned: 0` | 0 |

Stav produkcie:

| | hodnota |
|---|---|
| agentúr | 7 |
| s predplatným v Stripe | **0** |
| s trialom | **0** |
| self-serve registrácií | **0** |
| leadov celkom / za 14 dní | 524 / **1** |
| `properties` | 164 |
| `outbound_messages` | **0** |
| `events` | **1** |

**728 zmergovaných PR, nula odoslaných správ, nula platieb, jeden event.**

Migrácie: **138 v repozitári, 78 v `supabase_migrations.schema_migrations`.**
Najnovšia (`20261006120000`) aplikovaná je, chýbajú veci v strede → aplikovalo sa
výberovo, nie v poradí.

## 3. Register príčin

### P1 — `properties.source_id`: globálny unique (ZMERANÉ)
PROD má `idx_properties_source_id_unique` na `source_id` **samotnom**; tenantový
index neexistuje; migrácia `20260617120000`, ktorá to opravuje, nie je aplikovaná.
Kód pritom upsertuje per tenant. **Dve agentúry nemôžu mať tú istú inzerátovú id.**
Žije 4 mesiace. Rozpis: `2026-10-19-properties-source-id-globalny-unique.md`.

### P1 — `compute_bri_score`: rozbitá RPC (ZMERANÉ)
Funkcia robí `ON CONFLICT (profile_id, lead_id)`. `lead_scores` má ale len
`UNIQUE (lead_id)` a `PRIMARY KEY (id)` — žiadny zodpovedajúci constraint.
Preto `rpc compute_bri_score: there is no unique or exclusion constraint matching
the ON CONFLICT specification`, 3 z 3 pokusov. Oprava = migrácia → **čaká na GO**.

Pozn.: `UNIQUE (lead_id)` samotné je ten istý tvar chyby ako pri `source_id` —
kľúč nie je tenantový. Dopad je tu menší (lead id je globálne unikátne), ale
`ON CONFLICT` cieľ je aj tak nesprávny.

### P2 — falošná červená v `cron_runs` (ZMERANÉ, opravené v tomto PR)
`deriveCronStatus(eligible, written, failed)` vracalo `failed` vždy, keď
`written === 0` a `eligible > 0` — teda aj behu, ktorý kandidátov zvážil
a legitímne nemal čo robiť. Presne to robí `follow-up-sweep`
(`{"planned": 0, "cooldown_days": 7}`).

Nie je to kozmetika: v tých istých 14 dňoch sa v záplave falošných červených
utopili **3 skutočné pády** `recompute-bri`. Falošná červená skrýva pravú.

### NIE JE TO NÁLEZ (overené, aby sa to netiahlo ďalej)
- **36× `rls_enabled_no_policy`** je `INFO` a **fail-closed**: RLS zapnuté bez
  politiky znamená, že okrem `service_role` nečíta nikto. Nie je to diera.
- **`profile_agencies_for_auth()`** spustiteľná pre `anon`: celé telo filtruje
  cez `auth.uid()`, pre anon vráti prázdno. **Nie je to diera.**
- **`get_valuation_tenant(slug)`** vracia zámerne verejný branding povoleného
  tenanta. **Nie je to diera.**
- Reálny WARN ostáva jeden: vypnutá ochrana proti uniknutým heslám (Supabase Auth).

## 4. Čo robí tento PR

Len P2. `failed` odteraz vyžaduje `failed > 0`; „zvážené, nič netreba" je `empty`.
Nový stav (`noop`) by znamenal migráciu — `cron_runs.status` má v PROD
`CHECK (status IN ('ok','empty','partial','failed'))` — preto sa držím existujúcej
množiny a dôvod nesie `detail`.

Dôkaz: 6 nových testov + 2 existujúce suity (25/25), regresný test dokázaný
v oboch smeroch, `prepush-gate.sh` VŠETKO PREŠLO.

## 5. Čo ostáva a na kom

| položka | na kom |
|---|---|
| `merguj 885` | founder |
| `GO SOURCE-ID-INDEX` (migrácia P1) | founder |
| oprava `compute_bri_score` (migrácia P1) | founder GO, pripravím |
| povolenie zmazať mŕtvy kód | founder |
| Stripe krok C, `RESEND_API_KEY`, 6× `GOOGLE_GMAIL_INBOUND_*` | founder |

Kým posledný riadok nie je hotový, „0 platieb / 0 správ" nepohne žiadny môj PR.
