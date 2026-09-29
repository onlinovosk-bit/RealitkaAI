# PROD-SHAPE-DIFF — čo v PROD naozaj stojí a čo z toho `db push` neopraví

**Brána:** `GO PROD-SHAPE-DIFF`. **Žiadny zápis do PROD.** Čítanie `pg_catalog`
+ dva lokálne základy postavené z migrácií.
**Merané:** 2026-09-25, 06:50–07:40 UTC, projekt `ypgajkhqtbriqqmyawyv`.
**Repo:** `main` @ `fa203d6e`, 114 migračných súborov.

---

## 0. 🔴🔴 P0, ktorý brána našla mimochodom: `tasks` a `saas_leads` sú otvorené pre `anon`

Nehľadal som to. Vypadlo to z porovnania policies a **overil som to správaním, nie
z katalógu**:

```sql
begin;
set local role anon;
select (select count(*) from public.tasks)      as tasks,
       (select count(*) from public.saas_leads) as saas_leads,
       (select count(*) from public.onboarding_sessions) as onboarding_sessions;
rollback;

  tasks | saas_leads | onboarding_sessions
    227 |         14 |                   5
```

**Neprihlásený volajúci s anon kľúčom vidí 227 úloh naprieč 41 leadmi a celý
zoznam 14 SaaS leadov.** Nie je to cross-tenant únik medzi kanceláriami — je to
únik von.

Príčina: policies s `USING (true)` pre rolu `public`, plus `GRANT ... TO anon`.
RLS policies sa OR-ujú, takže korektná `tasks_agency` nemá žiadny účinok — `true`
vyhráva.

| tabuľka | policy | cmd | role | USING / CHECK |
|---|---|---|---|---|
| `tasks` | `tasks_select` | SELECT | public | `true` |
| `tasks` | `tasks_insert` | INSERT | public | check `true` |
| `tasks` | `tasks_update` | UPDATE | public | `true` |
| `tasks` | `tasks_delete` | DELETE | public | `true` |
| `saas_leads` | `saas_leads_select` / `Users can view their leads` | SELECT | public | `true` |
| `saas_leads` | `saas_leads_insert` / `Users can insert leads` | INSERT | public | check `true` |
| `saas_leads` | `saas_leads_update` / `Users can update own leads` | UPDATE | public | `true` |
| `saas_leads` | `saas_leads_delete` | DELETE | public | `true` |
| `lead_property_scores` | select/insert/update | | public | `true` |
| `lead_property_events` | select/insert | | public | `true` |
| `onboarding_sessions` | `Allow anon access` | ALL | anon | `true` / `true` |
| `competition_radar` | `authenticated read radar` | SELECT | authenticated | `true` |

`anon` má na `tasks`, `properties` aj `activities` plné tabuľkové granty
(SELECT/INSERT/UPDATE/DELETE/TRUNCATE), takže zápis a mazanie nie sú teoretické.
**Čítanie som odmeral; zápis a mazanie som zámerne neskúšal** — plynie z tých
istých `true` policies, ale dôkaz by znamenal zapisovať do produkcie.

`bsm_reforma_leads INSERT true` a `leads_demo INSERT true` sú zámerné verejné
formuláre a nechávam ich.

`onboarding_sessions` má v repe opravu — `20260904220000_drop_onboarding_sessions_anon_all.sql`
— **ktorá je v neaplikovanej dávke.** Pre `tasks`, `saas_leads`,
`lead_property_scores` a `lead_property_events` oprava v repe **neexistuje**.

---

## 1. Metóda

Bez platenej kópie PROD. Dva lokálne základy (PostgreSQL 16) + čítanie PROD:

| základ | obsah | výsledok |
|---|---|---|
| `BASE` | všetkých 114 migračných súborov | **OK=114 FAILED=0** |
| `APPLIED_BASE` | 53 súborov = tie, ktorých verzia je v `schema_migrations`, + dva baseline súbory, ktorých objekty v PROD existujú mimo migrácií | OK=52 FAILED=1 |

`APPLIED_BASE` je podstatný: hovorí, **čo by v PROD malo stáť, keby aplikovaná
časť histórie naozaj prebehla.** Rozdiel `APPLIED_BASE` − `PROD` je preto
odchýlka, ktorú `db push` **nikdy nedoplní**, lebo tie migrácie sú registrované.

Jediné zlyhanie v `APPLIED_BASE` je samo o sebe nález:
`20260924183806_ai_action_audit_cost_columns.sql` padne na
`relation "public.ai_action_audit" does not exist` — je registrovaná ako
aplikovaná, ale tabuľku, ktorú mení, vytvára až **neaplikovaná** migrácia.

Odtlačky sa porovnávali cez md5 po objektoch; prepis PROD výpisu do lokálneho
súboru je **overený checksumom** (`9f77b581…` na oboch stranách, 94 bucketov;
kind `col` `f8f6e5b5…`, 120 riadkov). Žiadny záver v tomto reporte nestojí na
ručnom prepise bez kontrolného súčtu.

---

## 2. 🔴 Migrácia registrovaná ako aplikovaná, ktorá nikdy nebežala

`20260429111000_decision_intelligence_core.sql` je v `schema_migrations`.
V PROD z nej **neexistuje ani jeden objekt**:

| objekt | typ | v PROD |
|---|---|---|
| `lead_action_scores` | tabuľka | ❌ |
| `lead_closing_windows` | tabuľka | ❌ |
| `lead_rescue_runs` | tabuľka | ❌ |
| `lead_micro_actions` | tabuľka | ❌ |
| `leads.priority_bucket` | stĺpec | ❌ |
| `leads.risk_trend` | stĺpec | ❌ |
| `leads.success_probability` | stĺpec | ❌ |
| `leads.expected_revenue` | stĺpec | ❌ |
| `leads.closing_window_days_min` / `_max` | stĺpce | ❌ |
| `idx_leads_priority_bri`, `idx_leads_updated_at`, `idx_lead_action_scores_lead_created` | indexy | ❌ |

**0 z 11.** A `db push` ju nikdy nespustí, lebo je registrovaná.

---

## 3. 🔴 16 tabuliek, ktoré aplikovaná časť histórie vytvára a v PROD nie sú

`api_keys`, `api_usage_logs`, `b2b_price_intelligence`, `broker_performance_stats`,
`competitor_activity_logs`, `competitor_monitoring`, `demand_signals`,
`demo_prefill_links`, `developer_api_key_requests`, `lead_action_scores`,
`lead_closing_windows`, `lead_conversions`, `lead_micro_actions`,
`lead_rescue_runs`, `notifications`, `strategic_alerts`.

**11 z nich má živé volanie v aplikácii:**

| route | tabuľka | ošetruje chybu? |
|---|---|---|
| `app/api/ai/decision/score-lead/route.ts:69` | `lead_action_scores` | **nie** — `await ... .insert()` bez čítania `error` |
| `app/api/ai/closing-window/recompute/route.ts:40` | `lead_closing_windows` | áno |
| `app/api/ai/micro-actions/schedule/route.ts:54` | `lead_micro_actions` | áno |
| `app/api/ai/rescue/trigger/route.ts:67` | `lead_rescue_runs` | áno |
| `app/api/analytics/demand-signals/route.ts:34` | `demand_signals` | áno |
| `app/api/demo/prefill-links/route.ts:43` + `app/(marketing)/demo/live/page.tsx:43` | `demo_prefill_links` | áno |
| `app/api/developer/request-key/route.ts:24` | `developer_api_key_requests` | áno |
| `app/api/coaching/insight/route.ts:34,42` | `broker_performance_stats`, `notifications` | áno |
| `lib/ai/action-executor.ts:23` | `notifications` | áno |
| `app/api/strategic-alerts/route.ts:38` | `strategic_alerts` | áno |

`score-lead` je najhorší prípad: vráti `{ok:true}` a **nezapíše nič**. Tiché
zahadzovanie dát, dnes, v produkcii.

---

## 4. Stĺpce: rozdelenie podľa toho, či ich `db push` doplní

18 objektov existuje v `BASE` aj v PROD s iným tvarom stĺpcov. Rozdelené podľa
toho, ktorá časť histórie ich deklaruje:

**✅ Doplní `db push`** (pridáva ich neaplikovaná dávka):
`exclusivity_outcomes.outcome / outcome_value_eur / recorded_at`,
`morning_briefs.content_source / content_source_reason`,
`profiles.import_image_changed / import_image_url / import_meta / import_source_id / import_source_system`,
`stealth_recruiter_prospects.metadata / outreach_message / profile_id`.

**🔴 Nedoplní nikdy** (deklaruje ich už registrovaná časť histórie, cez
`CREATE TABLE IF NOT EXISTS`, ktorý na existujúcej tabuľke nič nespraví):

| tabuľka | stĺpce chýbajúce v PROD | číta ich kód? |
|---|---|---|
| `agencies` | `address`, `external_id`, `listings_count`, `portal`, `website` | nie (zhody v kóde patria iným tabuľkám) |
| `leads` | `agent_id`, `priority_bucket`, `risk_trend`, `success_probability`, `expected_revenue`, `closing_window_days_min/max` | nie — preverené, `agent_id` v kóde patrí `activities`/meta, `expected_revenue` patrí `lead_action_scores` |

Tieto dve sú teda **spiace**, nie živé chyby. Uvádzam to, lebo prvý dojem
z grepu bol opačný a beh ho vyvrátil.

**🔴 Rozdiel typu, nie prítomnosti:**

| stĺpec | migrácie | PROD |
|---|---|---|
| `ai_sourced_deals.lead_id` | `text` (FK na `leads(id)`) | **`uuid`** |
| `ai_sourced_deals.property_id` | `text` (FK na `properties(id)`) | **`uuid`** |
| `stealth_recruiter_prospects.current_price` / `original_price` | `numeric` | `integer` |
| `decisions.confidence` / `p_outcome` | `numeric` | `numeric(5,4)` |
| `decisions.expected_value_eur` | `numeric` | `numeric(12,2)` |

`ai_sourced_deals` vytvára `20260411_performance_fee.sql` (registrovaná) ako
`lead_id TEXT REFERENCES leads(id)`. PROD má `uuid`, takže tá tabuľka v PROD
nevznikla z migrácie a **FK na textové `leads.id` tam byť nemôže**. Aplikácia
ju dnes nepoužíva (0 súborov), takže je to spiace.

`decisions` je len presnosť — `CREATE TABLE IF NOT EXISTS` ju nemení, push
prejde. `genome_decision_open` dedí presnosť z `decisions`, takže
`CREATE OR REPLACE VIEW` vyrobí ten istý tvar, aký v PROD už je → **žiadna
kolízia** (potvrdzuje to, čo som tvrdil v #693).

---

## 5. Funkcie: čisté

37 funkcií v PROD, 36 v `BASE`. **Každá, ktorá je v oboch, má zhodný návratový
typ, `security definer` aj volatility.** Žiadna kolízia triedy `42P13`.

- Len v migráciách (push ich vytvorí): `detect_broker_weakness`,
  `get_supply_demand_gap`, `increment_api_usage`, `touch_ai_generations_updated_at`.
- Len v PROD (mimo migrácií): `ai_triage_feedback_set_agency`,
  `increment_usage_metric`, `match_leads`, `match_properties`,
  `set_properties_updated_at`.

**Hranica merania:** kľúč je `proname||'('||identity_arguments||')'` a Postgres
ho oreže na 63 znakov (typ `name`). 13 kľúčov na ten limit narazilo. Orezanie je
rovnaké na oboch stranách, takže porovnanie platí, a v žiadnom zozname nevznikol
duplikát — ale dve funkcie zhodné v prvých 63 znakoch by tento nástroj zlúčil.

---

## 6. Policies: 10 tabuliek sa líši, všetky smerom k väčšej otvorenosti

| tabuľka | chýba v PROD | navyše v PROD |
|---|---|---|
| `activities` | — | `activities_insert_agency`, `activities_select_agency` |
| `ai_action_audit` | `ai_action_audit_tenant` | `ai_action_audit_insert_tenant`, `ai_action_audit_select_tenant` |
| `lead_property_matches` | — | `matches_{select,insert,update,delete}_agency` |
| `lead_scores` | — | `lead_scores_agency` |
| `migration_cases` | `migration_cases_service_role_all` | — |
| `outreach_logs` | `outreach_logs_tenant` | `outreach_logs_agency`, `owners read own outreach logs` |
| `profiles` | — | `service role update profiles` |
| `properties` | — | `properties_{select,insert,update,delete}_agency` |
| `stealth_recruiter_prospects` | — | `tenant_isolation` |
| `tasks` | — | `tasks_{select,insert,update,delete}` ← **§0** |

Dôležité: policies sa **OR-ujú**. Každá „navyše v PROD" teda prístup
**rozširuje**, a `db push` ju neodstráni — migrácie dropujú len tie policies,
ktoré samy menujú. Push na tieto tabuľky pridá svoju tenant policy **navrch**
existujúcich, čím otvorenosť nezmenší.

Vetva `agency_id IS NULL OR …`, ktorú P-3 zavrela inde, v PROD ďalej žije na
`activities`, `lead_property_matches`, `properties`, `outreach_logs`
a `pipeline_moves`.

---

## 7. Čo týmto stále NIE JE overené

- **Dáta, nie tvar.** Constraint typu `CHECK`/`FK`/`NOT NULL`, ktorý pridáva
  neaplikovaná migrácia a ktorý by existujúce PROD riadky porušili, som
  nemeral. To zostáva jediná trieda, kde je skutočný klon stále lepší.
- **Zápis a mazanie cez `anon`** je odvodené z policies a grantov, nie odmerané.
- **`stmts = 0`** pri 5 záznamoch v `schema_migrations` — ich obsah sa overiť nedá.
