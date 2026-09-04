# Audit: otvorené `anon` RLS politiky (produkcia 2026-09-04)

**Status:** FÁZA A (read-only) + pripravená migrácia **NEAPLIKOVANÁ**  
**Antipattern:** AP-002 (`docs/architecture/antipatterns-log.md`)  
**Scope:** 15 politík s `qual = true` / `with_check = true` pre rolu `anon` (niektoré aj `authenticated`)  
**Zákaz v tomto PR:** žiadne DDL do produkcie, žiadny `db push` / `apply_migration`, žiadna zmena aplikačného kódu, žiadne čítanie obsahu `imap_password`, žiadne projektové ID / anon kľúče v texte.

## Metóda (čo sa hľadalo)

1. Produkčný `pg_policies` — politiky s rolou `anon` a otvoreným `true`.
2. Počty riadkov (iba `count(*)`, bez obsahu citlivých stĺpcov).
3. Repozitár: `rg` nad `apps/crm/src` + `apps/crm/supabase` na názvy politík a `.from("<tabuľka>")`.
4. Klasifikácia klienta:
   - **browser** = `lib/supabase/client` / `createBrowserClient` (anon kľúč; po logine JWT = `authenticated`)
   - **server user** = `createClient()` zo `lib/supabase/server`
   - **service/admin** = `createServiceRoleClient` / `createAdminClient` (RLS obchádza → **anon politiku nepotrebuje**)
5. Overené samostatne: `POST /api/leads/inbound` používa `createServiceRoleClient()` (`route.ts` import + insert do `leads`) — **nepotrebuje** `properties_anon_insert` ani `activities_anon_*`.

## Poradie podľa závažnosti

1. `integration_settings` — stĺpec `imap_password` (0 riadkov = nabitá zbraň, nie únik)
2. `activities` — 187 riadkov + DELETE cez `ALL`
3. `properties` — anon INSERT do inventára (133 riadkov)
4. `onboarding_sessions` — 5 riadkov `form_data`
5. `lead_property_matches`, `lead_assignment_rules`, `pipeline_moves` — 0 riadkov

## Súhrnná tabuľka (15 politík)

| # | Politika | Tabuľka | Príkaz | Pôvod v repe | Potrebuje ju klientsky kód? | Dôkaz | Verdikt |
|---|---|---|---|---|---|---|---|
| 1 | `demo_select_integration_settings` | integration_settings | SELECT | `supabase/17_add_integration_settings.sql:25` (voľný SQL mimo `migrations/`) | Nie — žiadny hit `integration_settings` v `apps/crm/src` | hľadané: `rg integration_settings apps/crm/src` → 0 | **ZRUŠIŤ** |
| 2 | `demo_insert_integration_settings` | integration_settings | INSERT | `17_add_integration_settings.sql:28` | Nie (rovnaké) | rovnaké | **ZRUŠIŤ** |
| 3 | `demo_update_integration_settings` | integration_settings | UPDATE | `17_add_integration_settings.sql:31` | Nie | rovnaké | **ZRUŠIŤ** |
| 4 | `demo_delete_integration_settings` | integration_settings | DELETE | `17_add_integration_settings.sql:34` | Nie | rovnaké | **ZRUŠIŤ** |
| 5 | `activities_anon_legacy_all` | activities | ALL | `supabase/migrations-archive/20260412_enterprise_realtime_audit_rls.sql:476` (archív) | Nie pre anon. Dashboard používa browser client **po logine** → rola `authenticated`; existujú `activities_tenant_*` / `activities_*_agency` | `activities-store.ts`, `leads-store.ts` + `pg_policies` tenant politiky; inbound = service role | **ZRUŠIŤ** |
| 6 | `activities_anon_insert` | activities | INSERT | `migrations/20260507160000_rls_leads_activities.sql:56` komentár „public demo lead capture“ | Nie — verejný intake ide service-role | `api/leads/inbound/route.ts` `createServiceRoleClient` | **ZRUŠIŤ** |
| 7 | `properties_anon_insert` | properties | INSERT | **V repe sa nenašiel** (ani `migrations/`, ani voľné `.sql`, ani archive pod týmto menom) | Nie pre anon. Public listing číta cez admin; write pathy sú authenticated / service | `nehnutelnosti/page.tsx` / `hladame/page.tsx` `createAdminClient`; `properties_insert_agency` / `properties_tenant` existujú; `rg properties_anon_insert` → 0 | **ZRUŠIŤ** |
| 8 | `Allow anon access` | onboarding_sessions | ALL | **V repe sa nenašiel** | Áno — browser upsert/select **bez loginu** | `onboarding/useOnboarding.ts:107-114`, `OnboardingClient.tsx:125-153` (`supabaseClient.from("onboarding_sessions")`); localStorage je SoT, sync je best-effort | **PRESUNÚŤ NA SERVER** (v tejto migrácii **nedropovať**) |
| 9 | `matches_anon_legacy_all` | lead_property_matches | ALL | `migrations-archive/20260412_enterprise_realtime_audit_rls.sql:433` | Nie pre anon. Store po logine; existujú `lead_property_matches_agency` / `matches_*_agency` | `matching-store.ts` + `pg_policies` | **ZRUŠIŤ** |
|10 | `demo_select_pipeline_moves` | pipeline_moves | SELECT | `supabase/03_pipeline_moves.sql:15` (voľný SQL) | Áno pre **authenticated** dashboard (jediné politiky na tabuľke sú demo_* aj pre anon) | `leads-store.ts:1361,1376`; `pg_policies` — žiadna tenant politika | **NAHRADIŤ** |
|11 | `demo_insert_pipeline_moves` | pipeline_moves | INSERT | `03_pipeline_moves.sql:21` | Áno (rovnaké) | rovnaké | **NAHRADIŤ** |
|12 | `demo_select_lead_assignment_rules` | lead_assignment_rules | SELECT | `supabase/13_add_lead_assignment_rules.sql:23` (voľný SQL) | Áno pre authenticated UI, ale tabuľka **nemá `agency_id`** | `lead-automation-store.ts:175+`; schema: `profile_ids[]` bez agency | **NEJASNÉ** |
|13 | `demo_insert_lead_assignment_rules` | lead_assignment_rules | INSERT | `13_add_lead_assignment_rules.sql:26` | Áno / schema gap | rovnaké | **NEJASNÉ** |
|14 | `demo_update_lead_assignment_rules` | lead_assignment_rules | UPDATE | `13_add_lead_assignment_rules.sql:29` | Áno / schema gap | rovnaké | **NEJASNÉ** |
|15 | `demo_delete_lead_assignment_rules` | lead_assignment_rules | DELETE | `13_add_lead_assignment_rules.sql:32` | Áno / schema gap | rovnaké | **NEJASNÉ** |

## Detail podľa závažnosti

### 1. integration_settings (ZRUŠIŤ ×4)

- Stĺpce zahŕňajú `imap_password` (obsah **nebol čítaný**).
- `count(*) = 0` → žiadny uniknutý secret; otvorené politiky = predpripravený únik pri prvom zapnutí IMAP.
- Žiadny aplikačný kód v `src` tabuľku nepoužíva → po DROPe ostane RLS deny pre `anon`/`authenticated`; service role stále môže (ak niekedy pribudne server path).
- Pôvod: voľný SQL mimo migračnej histórie (governance diera, AP-008 rodina).

### 2. activities (ZRUŠIŤ ×2)

- `activities_anon_legacy_all` dáva anon SELECT/INSERT/UPDATE/**DELETE** nad 187 riadkami.
- Tenant politiky pre `authenticated` už existujú (`activities_tenant_select/write`, `activities_*_agency`).
- `activities_anon_insert` je explicitný demo zvyšok z migrácie 2026-05-07; súčasný public lead capture = service role.

### 3. properties (ZRUŠIŤ ×1)

- `properties_anon_insert` nemá zdroj v repe → pravdepodobne ručný / mimo-process zásah do produkcie (rovnaký vzor ako AP-008).
- Inventár 133 riadkov; anon INSERT by mohol vkladať cudzie nehnuteľnosti.
- Authenticated insert politiky existujú; public read ide cez admin klienta.

### 4. onboarding_sessions (PRESUNÚŤ — nedropovať teraz)

- Jediná politika; browser ju používa pred loginom.
- Kód explicitne toleruje zlyhanie syncu (localStorage).
- Správne riešenie: API route so service role + session token; **nie** otvorené `ALL`.
- Otázka pre foundera: `.ai/bus/inbox/MSG-20260904-rls-anon-nejasne.md`

### 5a. lead_property_matches (ZRUŠIŤ ×1)

- Legacy ALL z archívu; nahradené agency politikami pre authenticated.

### 5b. pipeline_moves (NAHRADIŤ ×2)

- Demo politiky sú **jediné** na tabuľke a platia aj pre `authenticated`.
- Drop bez náhrady by zlomil `leads-store` zápis histórie statusov.
- Náhrada: tenant SELECT/INSERT cez `lead_id → leads.agency_id` + `profile_agencies_for_auth()` (vzor `activities_tenant_*`).

### 5c. lead_assignment_rules (NEJASNÉ ×4)

- Demo politiky sú jediné; UI ich potrebuje po logine.
- Tabuľka **nemá `agency_id`** — nie je čistý tenant USING bez schémy alebo nebezpečného `authenticated USING (true)` (cross-tenant medzi agentúrami).
- **Migrácia sa týchto 4 politík nedotýka.** Otázka v inboxe.

## Governance: voľné `.sql` mimo `migrations/`

V `apps/crm/supabase/*.sql` (root, nie `migrations/`): **27 súborov**

```
01_create_leads.sql
02_activities_properties.sql
03_pipeline_moves.sql
04_verify_current_schema.sql
05_phase1_users_teams_properties.sql
06_activity_stream_upgrade.sql
06_phase1_schema.sql
07_lead_property_matches.sql
08_harden_properties_matching_recommendations.sql
09_rollback_08_harden_properties_matching_recommendations.sql
10_add_properties_optional_columns_and_matching_status.sql
11_verify_properties_optional_columns_and_matching_status.sql
12_rollback_10_add_properties_optional_columns_and_matching_status.sql
13_add_lead_assignment_rules.sql
14_verify_lead_assignment_rules.sql
15_add_model_version_to_matches.sql
16_add_columns_to_ai_recommendations.sql
17_add_integration_settings.sql
18_add_tasks_and_saas_leads.sql
19_fix_tasks_lead_id_nullable.sql
20_buyer_intent.sql
21_add_sofia_insight.sql
22_realvia_webhook_infrastructure.sql
MIGRATION_guardian_v1_blok_c.sql
MIGRATION_moat_capture_blok_b.sql
MIGRATION_profiles_platform_admin.sql
seed.sql
```

**Produkčná migračná história:** `supabase_migrations.schema_migrations` = **48** aplikovaných verzií.  
**V repe:** `apps/crm/supabase/migrations/*.sql` = **100** súborov.  
→ Drift Brief 17 vlna 1: časť schémy (vrátane demo RLS) prišla cez voľné SQL / archive / ručné zásahy, nie cez sledovanú migráciu.

Politiky **bez akéhokoľvek zdroja v repe:** `properties_anon_insert`, `Allow anon access` (onboarding_sessions).

## Čo migrácia robí / nerobí

| Verdikt | Počet | V `*_drop_open_anon_policies.sql` |
|---|---:|---|
| ZRUŠIŤ | 9 | `DROP POLICY IF EXISTS` |
| NAHRADIŤ | 2 | DROP demo + CREATE tenant SELECT/INSERT na `pipeline_moves` |
| PRESUNÚŤ NA SERVER | 1 | **nedotýka sa** |
| NEJASNÉ | 4 | **nedotýka sa** |

**Migrácia nie je a nesmie byť spustená týmto agentom.**

## Rollback

Pozri `docs/runbooks/rollback-anon-policies.md`.
