# PROD-MIGRATION-AUDIT — repo migrácie vs PROD (read-only)

**Dátum:** 2026-10-01 · **PROD:** `ypgajkhqtbriqqmyawyv` · **Zápis do PROD/DB: žiadny** (len `SELECT`).

## Metóda a jej hranice
Porovnanie je **na úrovni objektov**, nie podľa mien migrácií: história migrácií v PROD (62 riadkov, končí
`20260928070000`) sa s repom (128 súborov) rozchádza, ale objekty môžu v PROD existovať aj bez riadku v histórii
(tabuľky z repa sa v minulosti aplikovali ručne, aj dnes `inbound_mail_outcomes` cez `execute_sql`).

Z každej repo migrácie som parserom vytiahol `CREATE TABLE`, `ADD COLUMN`, `CREATE FUNCTION`, `CREATE VIEW` a porovnal
s `information_schema` / `pg_proc` v PROD. **Neoverené (parser ich nevidí):** indexy, constrainty, triggery, granty,
`ALTER POLICY`, dátové migrácie, zmeny typov. Politiky a RLS som skontroloval samostatne (nižšie), len v dvoch
rezoch. „Chýba" teda znamená **dokázane chýba**; „nechýba" neznamená „migrácia je celá aplikovaná".

## Výsledok
| objekty z repa | chýba v PROD |
|---|---|
| tabuľky 138 | **29** |
| views 8 | **2** |
| funkcie 40 | **4** |
| stĺpce 155 (tabuľka v PROD existuje) | **15** |

21 migračných súborov má aspoň jeden chýbajúci objekt. Zvyšok z 128 buď nechýba nič z toho, čo parser vidí,
alebo obsahuje len veci mimo parsera. (Skoršie „60 neaplikovaných" z P-3 bolo počítané podľa mien, nie objektov.)

### A. Chýba objekt, ktorý **kód v `apps/crm/src` volá** (dopad)
| chýba v PROD | migrácia | kto to volá |
|---|---|---|
| `credit_redemption_codes` | `20260615000000` | `starter-pack/fulfillment.ts`, `api/starter-pack/download` — **tok Starter Pack (47 €, `/balik`)** |
| `lead_demands` | `20260929120000` | demand vrstva (D1/D4) |
| `demand_property_matches` | `20260930120000` | D4 matching |
| `cron_runs` | `20260930080000` | `lib/ops/cron-run.ts`, recompute-bri, morning-brief |
| `demo_bookings`, `demo_prospects`, `demo_prefill_links` | `20260612000000`, `20260428164000` | `cron/demo-brief`, `cron/demo-recap`, `/demo/live`, `api/demo/prefill-links` |
| `notifications`, `broker_performance_stats` | `20260426203000` | `api/coaching/insight`, `lib/ai/action-executor.ts` |
| `lead_action_scores` (+ 3 súrodenecké, 6 stĺpcov `leads.*`) | `20260429111000` | `api/ai/decision/score-lead` |
| `enrichment_log` | `20260614213000` | `lib/enrichment/engine.ts` |
| `ai_generations` | `20260803120000` | `lib/listings/generations-store.ts` |
| `demand_signals`, `get_supply_demand_gap` | `20260426170000` | `api/analytics/demand-signals` |
| `strategic_alerts`, `developer_api_key_requests` | `20260426183000`, `…210000` | `api/strategic-alerts`, `api/developer/request-key` |
| `morning_briefs.content_source(_reason)` | `20260612120000` | `lib/morning-brief/assemble.ts` |
| `profiles.import_*` (5), `agencies.realsoft_export_pass`, `lead_assignment_rules.agency_id` | `…0617`, `…0616`, `…0827230000` | import/automation kód |

Čo z toho **vlastne zlyháva** (a či fail-soft) som nemeral — vyžaduje beh kódu. Táto tabuľka hovorí len „kód
sahá na objekt, ktorý v PROD nie je".

### B. Chýba objekt, ktorý kód nevolá (nízky dopad)
`competitor_*`, `api_keys`, `api_usage_logs`, `b2b_price_intelligence`, `lead_conversions`, `acquisition_*` (4),
`detect_broker_weakness`, `increment_api_usage`, `touch_ai_generations_updated_at`, `ai_action_daily_agency`
(PROD má iné `ai_cost_daily_view`), tabuľky s menami „AI…"/`gpmmfashion` z `20260925210000_baseline_prod_only_tables`
(artefakt, nie reálne tabuľky).

## ⚠️ Bezpečnostný nález (RLS) — treba rozhodnutie
Politiky v PROD pre rolu `authenticated`, ktoré obsahujú vetvu `agency_id IS NULL` (9 ks, kontrola `pg_policies`):
`platform_events_select_tenant`, `pipeline_moves_tenant_select/_write`, `activities_select_agency/_insert_agency`,
`lead_property_matches` ×4.

- **Dnes latentné** pri `leads` a `platform_events`: **0** riadkov s NULL `agency_id` (leads 0/520, platform_events
  0/1435). Vetva sa prejaví, až keď taký riadok vznikne. Repo migrácia P-3 (`20260923070000`) ju zatvára, v PROD
  nebežala.
- **Nie je latentné pri `activities`:** tabuľka **nemá `agency_id`** a politika pustí každý riadok s `lead_id IS NULL`.
  V PROD je takých **187** (z celku som nezisťoval, nečítal som obsah). Prihlásený používateľ ľubovoľnej agentúry ich
  podľa politiky vidí a môže pridávať. **Či obsahujú cudzie dáta, som neoveril** — to je prvá vec na kontrolu.

## Odporúčanie (nič z toho som neaplikoval)
1. **Dnes:** overiť obsah 187 `activities` s `lead_id IS NULL` (len typ/čas, nie osobné údaje) a rozhodnúť o zúžení politiky.
2. **Pred ďalším predajom Starter Packu:** overiť, že `credit_redemption_codes` v PROD zlyháva fail-soft a ako
   (platba prejde, plnenie nie?). Najvyššia obchodná priorita (PRIME DIRECTIVE).
3. **Aplikovať v dávkach** s `IF NOT EXISTS`, najprv A (tabuľky, ktoré kód volá), každú dávku samostatné GO; zvyšok B
   nechať, kým ho nik nepotrebuje. Migrácie sa v CI cez `db reset` nikdy nebehali pospolu — poradie nie je overené.
4. **Zaviesť parity kontrolu** repo↔PROD (tento dotaz ako skript), aby sa drift nezisťoval ručne.
