# Inventúra schema driftu — PROD vs. migrácie

**Dátum:** 2026-09-25 · **Projekt:** `ypgajkhqtbriqqmyawyv` · **Brána:** `GO SCHEMA-DRIFT-INVENTORY`
**Charakter:** read-only. Žiadne DDL, žiadny zápis do PROD.

## Prečo táto inventúra vznikla

AP-022 (CI-UNBLOCK-01, #700): migrácia `20260925110000_rls_anon_lockdown.sql` zhodila
`Lint, test, build` na `main` aj na každom otvorenom PR, lebo odkazovala na tabuľky,
ktoré **nezakladá žiadna migrácia**. Otázka, ktorú to otvorilo: *koľko takých je?*

Odpoveď nie je „tri".

## Metóda

1. Zoznam tabuliek v PROD: `pg_class` × `pg_namespace`, `relkind='r'`, schéma `public`.
2. Zoznam tabuliek, ktoré zakladajú migrácie: regex `CREATE TABLE [IF NOT EXISTS] [public.]name`
   naprieč 116 súbormi v `apps/crm/supabase/migrations/`.
3. Porovnanie **v SQL**, nie ručným prepisom — zoznam z kroku 2 vstúpil do dotazu ako
   `ARRAY[...]::text[]`. Ručný prepis vyše stovky riadkov by bol zdroj chýb — a aj bol,
   viď poznámku k presnosti nižšie.
4. Počet volaní v aplikácii: `grep -F "from('<tabulka>')"` a `from("<tabulka>")`
   nad `apps/crm/src`.

Overiteľné: dotazy sú v tele PR, ktorý tento dokument prináša, a v histórii session.

## Výsledok

| | počet |
|---|---|
| Tabuliek v PROD (`public`, `relkind='r'`) | **111** |
| Tabuliek zakladaných migráciami | **105** |
| **PROD_ONLY** — v PROD, žiadna migrácia ich nezaloží | **30** |
| **MIGRATION_ONLY** — migrácia ich zakladá, v PROD nie sú | **24** |

Migračný adresár sa teda s produkciou zhoduje na **81 tabuliek zo 111**. Nie je to
popis produkčnej schémy; je to iný, čiastočne prekrývajúci sa zoznam.

*(Poznámka k presnosti: v priebehu práce som raz uviedol 113. Správne číslo z
`count(*)` je 111 — prvé bolo moje zlé prerátanie výpisu. Preto krok 3 metódy:
porovnanie robí SQL, nie ja.)*

---

## A) PROD_ONLY — čo by sa stratilo pri obnove z migrácií

30 tabuliek. Z nich **17 má živého volajúceho v aplikácii**. Čistý environment alebo
`db reset` ich nepostaví → tieto cesty prestanú fungovať.

| tabuľka | volaní v kóde | veľkosť | RLS policies |
|---|---|---|---|
| `realvia_webhook_logs` | **9** | 1928 kB | 1 |
| `realvia_processing_queue` | **8** | 136 kB | 1 |
| `lead_assignment_rules` | **5** | 48 kB | 0 |
| `bri_history` | 3 | 56 kB | 3 |
| `ghostwriter_letters` | 3 | 48 kB | 0 |
| `leads_demo` | 3 | 64 kB | 2 |
| `saas_leads` | 3 | 32 kB | 1 |
| `team_licenses` | 3 | 24 kB | 3 |
| `onboarding_sessions` | 2 | 32 kB | 1 |
| `pipeline_moves` | 2 | 32 kB | 2 |
| `neighborhood_alerts` | 1 | 16 kB | 0 |
| `neighborhood_subscriptions` | 1 | 24 kB | 0 |
| `priority_alerts` | 1 | 32 kB | 1 |
| `realvia_price_history` | 1 | 96 kB | 2 |
| `roi_guarantee_claims` | 1 | 24 kB | 2 |
| `shadow_inventory` | 1 | 48 kB | 2 |
| `usage_metrics_daily` | 1 | 32 kB | 1 |

Bez volajúceho (13): `ai_triage_feedback`, `ai_triage_run_metrics`, `competition_radar`,
`ghost_sessions`, `integration_settings`, `lead_property_events`, `lead_property_scores`,
`lead_triage_idempotency`, `revolis_leads`, `revolis_zaujemcovia`, a tri tabuľky
evidentne založené ručne cez Supabase Dashboard.

---

## C) Nález, ktorý som nehľadal: osobné údaje v tabuľkách, ktoré nikto nečíta

Chcel som len potvrdiť, že tri „odpadové" tabuľky sú prázdne, aby som mohol navrhnúť
ich zmazanie. **Nie sú prázdne.**

| tabuľka | riadkov | stĺpce (čítal som len schému, nie obsah) |
|---|---|---|
| `AI AGENT AUTOMAT ONBOARDING` | **17** | jediný stĺpec sa volá `<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-da` |
| `AI AGENT AUTOMAT ONBOARDING no.2.01` | **6** | `Názov stĺpca`, `Typ dát`, `Constraints`, `website_url`, `phone`, `region`, `agent_count`, `source`, `last_contacted_at`, `demo_clicked_at`, `lead_score`, `notes` |
| `gpmmfashion@gmail.com tabulka` | 0 | `id`, `created_at` |
| `revolis_leads` | **1** | `id`, `created_at`, `email`, `data`, `bri_index` |
| `revolis_zaujemcovia` | **6** | `id`, `full_name`, `profil`, `readiness_score`, `behavioral_notes`, `last_activity`, `source_portal`, `raw_data`, `external_id`, `preferred_location` |

Dve veci naraz:

**1. Ako vznikli.** Prvé dve tabuľky majú názvy stĺpcov, ktoré sú kusy výstupu z AI
nástroja vložené do Supabase Dashboard namiesto definície schémy — `<img src=...perplexity.ai...`
a hlavička markdown tabuľky (`Názov stĺpca | Typ dát | Constraints`). Nie sú to
navrhnuté schémy, je to copy-paste.

**2. Čo v nich je.** `phone`, `full_name`, `email`, `behavioral_notes`, `source_portal`,
`preferred_location` sú **osobné údaje**. Spolu 30 riadkov v piatich tabuľkách, ktoré:

- nezakladá žiadna migrácia,
- nečíta žiadny aplikačný kód,
- nemá nastavenú retenciu ani vlastníka,
- majú RLS zapnuté a **0 policies** → cez API ich nikto neprečíta (to je jediná dobrá
  správa, a je náhodná, nie navrhnutá).

**Obsah riadkov som neotvoril.** Čítal som výlučne `information_schema.columns` a
`count(*)`. Podľa Direktívy 4 a 5 v `CLAUDE.md` je toto founder rozhodnutie, nie moje —
a to aj v prípade, že by odpoveď bola „zmaž to".

**Otvorená otázka na foundera, ktorú neviem zodpovedať z repa:** odkiaľ sú riadky
v `revolis_zaujemcovia`? Stĺpec `source_portal` naznačuje portálový pôvod, ale to je
**domnienka z názvu stĺpca, nie zistenie** — hodnotu som nečítal. Ak ide o osobné údaje
zozbierané z portálu bez právneho základu, je to GDPR expozícia, nie upratovanie schémy,
a má prednosť pred zvyškom tohto dokumentu.

**Preto neodporúčam tieto tabuľky zmazať.** Zmazanie dát, ktorých pôvod a právny základ
nie sú ustálené, je nesprávny prvý krok — najprv treba vedieť, čo to je.

---

## B) MIGRATION_ONLY — toto je vážnejší smer

24 tabuliek zakladá migrácia, ktorá na PROD nikdy nedobehla. **14 z nich aplikácia volá.**
Tie volania na produkcii zlyhávajú.

Overené priamo, nie odvodené — `to_regclass('public.<t>') IS NOT NULL` vrátilo `false`
pre všetkých 15 kontrolovaných:

| tabuľka | volaní | kde |
|---|---|---|
| `credit_redemption_codes` | **6** | `api/starter-pack/download`, `lib/starter-pack/fulfillment.ts`, `lib/starter-pack/redemption.ts` |
| `demo_bookings` | **5** | `api/webhooks/calendly`, `api/cron/demo-brief`, `api/cron/demo-recap` |
| `ai_generations` | 3 | — |
| `demo_prefill_links` | 2 | `(marketing)/demo/live/page.tsx`, `api/demo/prefill-links` |
| `notifications` | 2 | `api/coaching/insight`, `lib/ai/action-executor.ts` |
| `broker_performance_stats`, `demand_signals`, `demo_prospects`, `developer_api_key_requests`, `enrichment_log`, `lead_action_scores`, `lead_closing_windows`, `lead_micro_actions`, `lead_rescue_runs`, `strategic_alerts` | 1 každá | — |

### Čo z toho je živé a čo je mŕtve

Rozlíšené, nie zhrnuté do jedného varovania:

- **`/api/webhooks/calendly` je živá vstupná cesta.** Kód robí `upsert` do `demo_bookings`
  a pri chybe vracia **500**:
  ```ts
  if (error) {
    console.error("[calendly-webhook]", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  ```
  Ak je webhook v Calendly nastavený na túto URL, **každé objednanie dema skončí 500**
  a záznam sa u nás nevytvorí. Schôdzka v Calendly existuje ďalej — stráca sa naša
  strana (UTM atribúcia, napojenie na prospekta, podklad pre demo-brief).
  **Otvorená neznáma:** či je webhook v Calendly reálne nakonfigurovaný, neviem overiť
  z repa. To je founder check, nie môj.
- **`/api/cron/demo-brief` a `/api/cron/demo-recap` nie sú naplánované.** Prešiel som
  všetkých 16 cronov v `apps/crm/vercel.json` — ani jeden z týchto dvoch tam nie je.
  Sú to mŕtve routy, nie denne padajúce úlohy.
- **Žiadny naplánovaný cron nepadá na chýbajúcej tabuľke.** Overené dotrasovaním:
  `notification-digest` → `lib/infra/notification-delivery` → `routine_notifications` (existuje);
  `credits-cycle` → `lib/credits/monthly-cycle` → `agencies` (existuje).
  Toto som si overoval preto, že som očakával opak.
- Zvyšné cesty (`starter-pack`, `demo/live`, `coaching/insight`) sú user-facing request
  paths — zlyhajú, keď ich niekto vyvolá, nie na pozadí.

---

## Prečo to vzniklo

Nie jedna príčina:

1. **Tabuľky zakladané cez Supabase Dashboard**, nie migráciou. Tri z nich majú názov
   s medzerami a e-mailovou adresou, čo je podpis ručného klikania.
2. **Migrácie, ktoré na PROD nikdy nedobehli.** Zhoduje sa s meraním z #687 (F2B):
   pri prehratí registrovaných migrácií `OK=16, FAILED=32`.
3. **Zrušené CI behy.** #697 bol cancelled (superseded #698), takže zelený nikdy nebol —
   viď AP z 2026-09-22 o neoverenom `main`.

## Čo to znamená prakticky

- **Obnova z backupu / nový environment neposkladá funkčnú schému.** 30 tabuliek by
  chýbalo, 17 z nich s volajúcim kódom.
- **`supabase db reset` nie je použiteľný nástroj**, kým to platí.
- **Migrácie nie sú zdroj pravdy.** Každé rozhodnutie „táto tabuľka existuje, videl som
  migráciu" je neoverené, kým sa nepozrieš do PROD.

## Čo tento dokument NEROBÍ

Nič neopravuje. Neodporúča hromadné dopísanie 30 migrácií — to by bola veľká zmena
s reálnym rizikom a patrí pod vlastnú bránu s vlastným rozsahom. Tu je len zmeraný stav.

## Návrhy na ďalší krok, zoradené podľa hodnoty

1. **Overiť Calendly webhook** (founder, 5 min): je `/api/webhooks/calendly` nastavený
   v Calendly? Ak áno, `demo_bookings` je strata akvizičných dát a má prednosť pred
   všetkým ostatným v tomto dokumente.
2. **Baseline dump PROD schémy do migrácie.** `pg_dump --schema-only` → jedna baseline
   migrácia, ktorá popisuje skutočný stav. Rieši smer A naraz.
3. **CI gate proti regresii.** Test, ktorý zlyhá, keď aplikácia volá tabuľku, ktorú
   nezaloží žiadna migrácia. Bez neho sa drift vráti.
4. **Rozhodnúť o piatich tabuľkách z časti C.** Nie „zmazať" — najprv určiť pôvod
   a právny základ 30 riadkov osobných údajov. Kandidát na `gdpr-advisor` skill.
