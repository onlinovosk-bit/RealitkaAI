---
id: report.cp-evidence-2026-09-18
title: "CP-EVIDENCE-REPORT — read-only audit PROD pre Control Plane substrát"
type: report
status: final
version: 1.0.0
owner: founder
created_at: 2026-09-18
confidentiality: internal
canonical: false
---

# CP-EVIDENCE-REPORT

**Brána:** `GO CP-EVIDENCE` (founder, 2026-09-18)
**Režim:** READ ONLY. Vykonané výhradne `SELECT`. Žiadny INSERT / UPDATE / DELETE / migrácia / schema change / code change / deployment.
**Projekt:** `ypgajkhqtbriqqmyawyv` (PROD — potvrdené cez `apps/crm/supabase/config.toml:2`, `apps/crm/e2e/helpers/env-guard.ts:6`)
**Čas merania:** 2026-09-18, 08:58–09:05 UTC
**Kontext PROD:** 6 agentúr · 23 profilov · 508 leadov · najnovší lead `2026-09-15 08:55 UTC`

---

## ⚠️ Najprv: tri opravy dokumentu `founder-control-plane-v1-repo-confrontation.md`

Konfrontácia bola písaná z repo kódu. PROD tri jej tvrdenia vyvracia. Opravy patria na začiatok, nie do poznámky pod čiarou.

### Oprava 1 — `ai_action_audit` **nemá** cost stĺpce (bolo: „už nesie `cost_eur`, `model`, `latency_ms`, `credits_spent`")

**FAKT.** Skutočné stĺpce na PROD:
```
id, agency_id, lead_id, profile_id, action_kind, channel,
variant, subject_preview, body_hash, meta, created_at
```
`cost_eur`, `credits_spent`, `model`, `latency_ms` **neexistujú**. Tvrdenie v konfrontácii pochádzalo z `lib/ai-action-audit.ts:83`, ktorý tie stĺpce zapisuje — čo je kód, nie schéma.

### Oprava 2 — cost → outcome **nie je „jeden view"**

**FAKT.** Reťaz je prerušená na troch miestach naraz:

| Článok | Stav na PROD |
|---|---|
| cost hodnota | **0 riadkov** má cost kdekoľvek — ani v stĺpci, ani v `meta->>'costEur'` |
| `ai_action_audit.lead_id` | **0 zo 146** riadkov má hodnotu (stĺpec existuje, nikdy sa nenaplní) |
| `lead_conversions` | **tabuľka neexistuje** |
| `deal_outcomes` | **1 riadok** |

Odporúčanie „P0-CP-3 je najvyššie ROI a je to jeden SQL view" bolo **nesprávne**. Dôvod nie je v tom, že chýba view — chýbajú vstupné dáta.

Príčina je dohľadateľná: `lib/ai/persist-cost-telemetry.ts:69–88` skúša `full` insert s cost stĺpcami, pri chybe „missing column" spadne na `base` insert bez nich. Fallback funguje, ale `base` má **`lead_id: null` natvrdo** (riadok 66) a `meta` sa v `base` vetve zapisuje bez cost polí. Takže systém roky ticho degraduje na audit bez ceny a bez väzby na lead. 87 zo 146 riadkov má aspoň `model` v `meta`.

### Oprava 3 — `public.events` nie je spine, je prázdna

**FAKT.** `public.events` = **0 riadkov**. `lib/events/log-event.ts` sa označuje ako *„the single entry point for all events — use this everywhere"*, ale na PROD nezapísal ani jeden riadok.

Reálny spine je **`platform_events`**: 1 417 riadkov, `2026-04-12` → `2026-09-15`, **100 % s `agency_id`**.

---

## 1. `public.events` row count

| | |
|---|---|
| **Nález** | `public.events` = **0 riadkov** |
| **Nálepka** | **FAKT** |
| **Zdroj** | `SELECT count(*) FROM public.events` |
| **Čas** | 2026-09-18 08:59 UTC |
| **Doplnok** | tabuľka **nemá** `agency_id` (0 stĺpcov), **nemá** žiadny z `correlation_id`, `causation_id`, `actor`, `source`, `schema_version` (0 z 5) |

**Dopad:** `events` nie je potrebné migrovať — je prázdna. Pridanie stĺpcov je čistý DDL bez backfillu a bez rizika. Zároveň to znamená, že plán „spine v2 + backfill `agency_id` cez `profile_id`" z konfrontácie je **bezpredmetný** — nie je čo backfillovať.

---

## 2. Aktivita event tabuliek

**FAKT**, merané 2026-09-18 08:59 UTC:

| Tabuľka | Riadky | Najstarší | Najnovší | Verdikt |
|---|---:|---|---|---|
| `platform_events` | **1 417** | 2026-04-12 | **2026-09-15** | **živá** |
| `acquisition_events` | 3 | 2026-08-15 | 2026-08-15 | jednorazový test |
| `events` | 0 | — | — | mŕtva |
| `lead_events` | **0** | — | — | **mŕtva — pozri dopad** |
| `broker_events` | 0 | — | — | mŕtva |
| `buyer_events` | 0 | — | — | mŕtva |
| `kataster_events` | 0 | — | — | mŕtva |
| `scheduled_events` | — | — | — | **tabuľka na PROD neexistuje** |

Rozpad `platform_events` podľa typu (**FAKT**):

| `event_type` | n | s `agency_id` | najnovší |
|---|---:|---:|---|
| `lead.created` | 970 | 970 | 2026-09-15 08:55 |
| `lead.status_changed` | 444 | 444 | 2026-08-23 19:37 |
| `integration.activity` | 3 | 3 | 2026-06-27 20:46 |

### Dopad `lead_events = 0` — najzávažnejší nález tohto auditu

Toto nie je len prázdna tabuľka. Dve existujúce funkcie na nej stoja:

1. **`/operator` → `reaction24hPct`.** `lib/operator/gather.ts` ho počíta z `lead_events`. S nulou riadkov vráti `reaction24hStatus: "unavailable"` pre **všetkých** nájomníkov. Stĺpec „Reakcia 24 h" bude prázdny pre každého. (Mechanizmus je správny — AP-001 tu funguje, radšej „—" než vymyslené číslo. Ale plocha nemá čo zobraziť.)
2. **Guardian v1.1 STALE.** `memory/decisions.md` (2026-07-27) definuje STALE ako *„len ak existuje `lead_events` a posledná aktivita je staršia ako 7 dní"*. Bez riadkov sa STALE pravidlo **nikdy nespustí**. Prod audit z 27. 7. našiel 473 neplatných STALE — pravidlo v1.1 ich správne zneplatnilo, ale odvtedy nemá z čoho generovať platné.

**PREDPOKLAD** (nemerané): `lead_events` sa nezapisuje, lebo write path buď neexistuje, alebo zlyháva ticho. Nebolo predmetom tejto brány.

---

## 3. Retention evidence

| | |
|---|---|
| **Nález** | Žiadny retention mechanizmus sa nenašiel. `platform_events` drží riadky od `2026-04-12` bez prerušenia (5 mesiacov, 1 417 riadkov ≈ 9,4 riadku/deň) |
| **Nálepka** | **FAKT** pre rozsah dát · **UNKNOWN** pre existenciu retention policy |
| **Zdroj** | `min/max(created_at)` na 7 event tabuliek |
| **Čas** | 2026-09-18 08:59 UTC |
| **Poznámka** | `public.events` má `profile_id … ON DELETE CASCADE` — riziko straty histórie pri mazaní profilu je reálne v schéme, ale dnes nulové, lebo tabuľka je prázdna |

Objem nie je prekážkou. Pri dnešnom tempe je event spine malý a lacný.

---

## 4. `leads.last_contact_at`

| | |
|---|---|
| **Nález** | **`last_contact_at` NEEXISTUJE.** Na PROD je len `last_contact` typu **`text`, NOT NULL** |
| **Nálepka** | **FAKT** |
| **Zdroj** | `information_schema.columns` pre `public.leads` |
| **Čas** | 2026-09-18 08:58 UTC |

Stĺpce `leads`, ktoré boli predmetom dopytu: `agency_id` (uuid, NOT NULL), `created_at` (timestamptz, NOT NULL), `last_contact` (**text**, NOT NULL), `status` (text, NOT NULL).

**Toto uzatvára P0 otvorené od 17. 8. 2026.** `docs/reports/2026-08-26-operator-dashboard-audit.md` §P0.1 to označil ako nepremerané. Teraz je to fakt: `lib/operator/gather.ts` číta `leads.last_contact_at` → PostgREST vráti **42703** → `contacts7d` aj `trend14d` (sparkline) spadnú.

**Dôsledok pre `/operator`:** zapnutie `OPERATOR_DASHBOARD_ENABLED=true` dnes vyrobí stránku, kde tri z ôsmich stĺpcov nefungujú (Kontakty 7 d, Trend 14 d, Reakcia 24 h). Zapnutie flagu **nie je pripravené** — a nie kvôli flagu.

---

## 5. Migrácia `20260728140000`

| | |
|---|---|
| **Nález A** | `supabase_migrations.schema_migrations` **neobsahuje** `20260728140000` ani nič s `%platform_admin%` → prázdny výsledok |
| **Nález B** | `profiles.is_platform_admin` **existuje** (1 stĺpec) |
| **Nález C** | **1 profil** už má `is_platform_admin = true` |
| **Nálepka** | všetky tri **FAKT** |
| **Zdroj** | `schema_migrations` SELECT + `information_schema.columns` + `count(*) WHERE is_platform_admin IS TRUE` |
| **Čas** | 2026-09-18 09:01 UTC |

Potvrdzuje hlásenie foundera z 25. 8.: SQL krok 1 (ADD COLUMN) prebehol ručne, history row nie. Grant je tiež hotový.

**Stav migračnej histórie celkovo (FAKT):** `schema_migrations` = **49 riadkov** (`20260320` → `20260904184236`), repo má **102** súborov v `apps/crm/supabase/migrations/`. Rozdiel **53**. Augustový audit (15. 8.) meral 47 vs 94 — medzera sa za mesiac rozšírila zo 47 na 53.

**Ďalšie potvrdené drifty** (vedľajší nález tejto brány, **FAKT**): `scheduled_events`, `lead_conversions`, `ai_generations` sú v repo migráciách, ale **na PROD neexistujú**.

---

## 6. Dopad na CP-P0-1 až CP-P0-4

Poradie podľa founder rozhodnutia: CONTRACT → EVENTS → APPROVALS → COST.

### CP-P0-4 Control Contract — **môže pokračovať, potvrdené ako správne prvé**

Evidencia poradie podporuje, a to silnejšie než konfrontácia predpokladala. Dôvod: `decisions` má **240 riadkov, všetky `status='open'`, všetky `agent='followup_agent'`, najnovší `2026-06-25`** (≈ 3 mesiace bez zápisu), a `exclusivity_outcomes` má **0 riadkov**.

To znamená: 240 rozhodnutí má zapísané `confidence` a `expected_outcome`, a **ani jedno nemá zaznamenaný skutočný výsledok**. Slučka expected → actual sa na PROD **nikdy neuzavrela**. Presne tú dieru má kontrakt `OBSERVE → DECIDE → AUTHORIZE → ACT → REPORT OUTCOME → LEARN` zatvoriť, a je to jediný z P0 kusov, ktorý nie je blokovaný chýbajúcimi dátami.

**Verdikt: CP-P0-4 môže bezpečne pokračovať.**

### CP-P0-1 Events Spine v2 — **môže pokračovať, rozsah sa mení**

Pôvodný plán (pridať stĺpce do `events`, backfill `agency_id`) je **bezpredmetný**: `events` je prázdna. Reálna otázka je iná — ktorá tabuľka sa stane spinom.

`platform_events` už spĺňa kľúčovú požiadavku, ktorú `events` nikdy nesplnila: **1 417 riadkov, 100 % s `agency_id`**, päť mesiacov nepretržite, tri typy udalostí. Cross-tenant agregácia je na nej možná dnes.

Odporúčanie (na rozhodnutie pri CP-SPEC, nie teraz): spine postaviť **na `platform_events`**, rozšíriť ho o `correlation_id` / `causation_id` / `actor` / `source` / `schema_version`, a `public.events` **zrušiť alebo označiť ako deprecated** — je to prázdna tabuľka s komentárom „use this everywhere", ktorý klame.

**Verdikt: CP-P0-1 môže pokračovať. Rozsah sa presúva z `events` na `platform_events`. DDL bez backfillu, bez rizika straty dát.**

### CP-P0-2 Durable Approvals — **môže pokračovať bez zmeny**

Nález z konfrontácie (in-memory `Map` v `lib/capabilities/_shared/human-approval.ts`) touto bránou nebol dotknutý — je to kódový, nie dátový nález, a platí. `ai_action_audit` na PROD má **len `action_kind='ai_suggested'`**, teda ani jeden `human_approved` / `sent` / `send_failed`. **PREDPOKLAD:** approval cesta sa na PROD zatiaľ nepoužíva, takže migrácia z `Map` do tabuľky nemá čo stratiť.

**Verdikt: CP-P0-2 môže pokračovať. Žiadne dáta na migráciu.**

### CP-P0-3 Cost → Outcome — **ZASTAVIŤ v pôvodnej podobe**

Nie je to view. Nie sú dáta. Tri články naraz chýbajú (oprava 2). Konkrétne:
- 0 zo 146 audit riadkov má cost hodnotu (ani v stĺpci, ani v `meta`)
- 0 zo 146 má `lead_id` — `persist-cost-telemetry.ts:66` ho zapisuje natvrdo ako `null`
- `lead_conversions` na PROD neexistuje
- `deal_outcomes` má 1 riadok

**Verdikt: CP-P0-3 sa v navrhovanej podobe postaviť nedá.** Nahradiť ho menším predchodcom:

> **CP-P0-3a — inštrumentácia cost cesty.** Doplniť cost stĺpce do `ai_action_audit` (alebo dôsledne do `meta`), prestať zapisovať `lead_id: null`, a napojiť ostatné AI features — dnes celých 146 riadkov pochádza z jedinej feature `dashboard_insights`. Až po ~30 dňoch zberu má zmysel view.

Founderom navrhnuté poradie dalo COST na posledné miesto. Evidencia to potvrdzuje — a ide ešte ďalej: nie je to posledný krok, je to zatiaľ neexistujúci krok.

### Vedľajší dopad: `/operator` ako prvý konzument

`/operator` dnes **nie je pripravený na zapnutie**, a blokér nie je feature flag:

| Brána | Stav |
|---|---|
| `profiles.is_platform_admin` stĺpec | ✅ existuje |
| platform-admin grant | ✅ 1 profil |
| `schema_migrations` history row | ❌ chýba (kozmetické, nie blokujúce) |
| `OPERATOR_DASHBOARD_ENABLED` na Verceli | ❌ nenastavené |
| `leads.last_contact_at` | ❌ **neexistuje → 42703 → Kontakty 7 d + Trend 14 d spadnú** |
| `lead_events` dáta | ❌ **0 riadkov → Reakcia 24 h prázdna pre všetkých** |

Funkčné by ostali: Kancelária, Stav, Won/Lost, Nálezy (23 otvorených guardian findings k 2026-09-17), Zdravie (`customer_health_daily` je **živá** — 4 agentúry, najnovší záznam **2026-09-18**).

---

## 7. Zostávajúce neznáme

| # | Neznáma | Prečo nebola zodpovedaná |
|---|---|---|
| U1 | **Prečo sa `lead_events` nezapisuje** | mimo rozsahu brány (vyžaduje čítanie write path, nie SELECT) |
| U2 | Existuje retention policy / cron na event tabuľkách | nenašla sa, ale absencia dôkazu nie je dôkaz absencie |
| U3 | Či `persist-cost-telemetry` padá na `full` vetve pri každom volaní, alebo sa cost stráca inde | vyžaduje runtime logy, nie DB |
| U4 | Ktorých 53 repo migrácií nie je v `schema_migrations` a ktoré z nich sú aplikované ručne | vyžaduje porovnanie 102 súborov proti 49 riadkom — samostatná úloha |
| U5 | Či `public.events` má niekde konzumenta, ktorý by sa zrušením rozbil | grep na read path nebol súčasťou brány |
| U6 | GDPR základ pre cross-tenant čítanie founderom | `gdpr-advisor` nebežal; `events` má `ip_hash` + `user_agent`, `platform_events` PII neobsahuje (`payload` jsonb nebol vzorkovaný) |

---

## 8. Zhrnutie — môže CP-P0-1 bezpečne pokračovať?

**Áno**, s tromi podmienkami:

1. Rozsah sa presúva z `public.events` na **`platform_events`** — tam sú dáta a `agency_id`.
2. Nie je to migrácia dát, je to **čistý DDL** na tabuľke s 1 417 riadkami. Backfill `agency_id` odpadá (už je 100 %).
3. Pred DDL musí prebehnúť **`gdpr-advisor`** na `platform_events.payload` (U6) — konfrontácia to viazala na `events`, ale spine sa presúva.

**Poradie po evidencii:**
```
CP-P0-4  Control Contract       → GO možné
CP-P0-1  Events Spine v2        → GO možné (na platform_events)
CP-P0-2  Durable Approvals      → GO možné
CP-P0-3  Cost → Outcome         → ZASTAVENÉ, nahradiť CP-P0-3a (inštrumentácia)
```

**Samostatne, mimo CP:** `leads.last_contact_at` + `lead_events` sú otvorené P0 pre `/operator`. Nie sú súčasťou Control Plane substrátu, ale blokujú prvého konzumenta.

---

**Vykonané:** iba SELECT. **Nezmenené:** schéma, dáta, env, kód aplikácie, nasadenie.
**Nenasledovalo:** CP-SPEC neotvorený, P0-CP neimplementované, žiadny merge, žiadny deployment.
