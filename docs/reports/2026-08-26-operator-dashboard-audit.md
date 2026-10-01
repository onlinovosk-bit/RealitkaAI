# Operator dashboard — stav k 26. 8. 2026

**Lane:** L34. Read-only. Docs-only. Žiadny ALTER, UPDATE, env, merge.  
**Kód na `origin/main`:** `app/operator/page.tsx`, `lib/operator/{gather,access,config,health-score,types,aggregate-schema}.ts`, `components/operator/OperatorDashboardClient.tsx`, migrácia `20260728140000_profiles_platform_admin.sql`. Posledný zmysluplný merge tejto plochy: Operator Dashboard v1 (#334, 29. 7.).  
**Tento agent v tejto noci nepripojil prod DB.** MCP Supabase `needsAuth`. URL v cloud VM ukazuje na `127.0.0.1`.

---

## P0 — pred otvorením `/operator`

1. **`gather.ts` číta `leads.last_contact_at`.** Audit 17. 8. (`docs/reports/2026-08-17-schema-drift-audit.md`) nameril na prod **iba `last_contact` text**. Ak stĺpec `last_contact_at` stále chýba, `contacts7d` a `trend14d` spadnú na PostgREST 42703. Kontakty 7 d / sparkline potom nie sú spoľahlivé. **Túto noc to nebolo znova SELECT-nuté.**
2. **`OPERATOR_DASHBOARD_ENABLED` default `false`.** Bez Vercel Production env + redeploy je `/operator` vždy **404** — aj pre platform admina.
3. **`schema_migrations` riadok `20260728140000`.** 15. 8. (`docs/reports/2026-08-15-migration-history-audit.md`) bol súbor v Table B (lokálny súbor, **žiadny** history row). Founder 25. 8. hlásil, že SQL krok 1 (ADD COLUMN) **prešiel** → `profiles.is_platform_admin` **existuje**. Či je v `schema_migrations`, táto noc **neoverila**.

Žiadna nájdená diera typu „admin client pred gate“. Pozri §5.

---

## 1. Stav migrácie

| Tvrdenie | Nálepka | Dôkaz |
|---|---|---|
| Súbor `20260728140000_profiles_platform_admin.sql` je v repe | FAKT | `apps/crm/supabase/migrations/20260728140000_profiles_platform_admin.sql` |
| 15. 8. nebol v prod `schema_migrations` | FAKT k 15. 8. | migration-history audit, 47 vs 94 |
| 17. 8. `profiles.is_platform_admin` na prod **chýbal** | FAKT k 17. 8. | schema-drift audit |
| 25. 8. founder: SQL krok 1 prešiel, stĺpec existuje | FAKT z hlásenia foundera v tejto session | agent to neselectol znova |
| History row dnes | NEZNÁME | treba SELECT nižšie |

**Nič neaplikuj z tohto reportu**, kým neurčíš, či stĺpec a history už sú.

Overenie (Dashboard SQL editor, read-only):

```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'profiles'
  AND column_name = 'is_platform_admin';

SELECT version, name, created_by
FROM supabase_migrations.schema_migrations
WHERE version = '20260728140000'
   OR name ILIKE '%platform_admin%';
```

Ak stĺpec je a history **nie je**, vzor ako `20260811220000` / komentár v `20260816230000` (stĺpce na prod: `version, name, statements, created_by` — **nie** `inserted_at`):

```sql
INSERT INTO supabase_migrations.schema_migrations (version, name, statements, created_by)
VALUES ('20260728140000', 'profiles_platform_admin', ARRAY[]::text[], NULL);
```

To je **samostatné GO**, nie súčasť tohto PR.

Ak stĺpec stále chýba: spustiť telo `20260728140000_profiles_platform_admin.sql` v SQL editore (ADD COLUMN + trigger), **až potom** history INSERT. Nie `supabase db push`.

---

## 2. Čo `gather.ts` vracia (položka po položke)

Vstup: `createAdminClient()` (service role). Vylúčené z **skóre** (nie nutne zo zoznamu): `parseOperatorAgencyExcludeList()` = `SANDBOX_AGENCY_ID` `22222222-…-2222` + `SYSTEM_USAGE_AGENCY_ID` `00000000-…-0001` + CSV `OPERATOR_AGENCY_EXCLUDE_LIST`. Sandbox `valuation_tenants.is_sandbox` tiež `status=system`. **Smolko `11111111-…` nie je v hardcoded exclude.**

| Pole | Tabuľka / zdroj | Poznámka |
|---|---|---|
| `asOf` | `new Date()` | ISO teraz |
| `agencies[].agencyId/name/status` | `agencies` + `valuation_tenants` | live / onboarding / system |
| `excludedFromScoring` | exclude list + sandbox | healthScore = null |
| `contacts7d` | `leads` count, `last_contact_at >= 7d`, status ≠ Archivovaný | **závisí na `last_contact_at`** |
| `contactsTotal` | `leads` count, status ≠ Archivovaný | |
| `trend14d` | `leads.last_contact_at` zoskupené po dňoch, 14 bucketov | **závisí na `last_contact_at`** |
| `reaction24hPct` | `lead_events` count / leady `created_at` 30 d | názov 24 h; window je 30 d. Bez eventov → `unavailable` |
| `dealsWon` / `dealsLost` | `deal_outcomes` 30 d, `outcome` won/lost | |
| `openGuardianFindings` / `noReactionCount` | `guardian_findings` unresolved, `HOT_IGNORED` \| `NO_OWNER` | |
| `healthScore` | `computeOperatorHealthScore` | 0–100; excluded = null |
| `attention[]` | nálezy HOT_IGNORED / NO_OWNER + onboarding widget + widget vypnutý | max priorita 1–3 |
| `platformHealth.valuationWidgets*` | `valuation_tenants` mimo sandbox | enabled / total |
| `guardianLastRunAt` | `routine_notifications` type Guardian runner, agency = system | |
| `guardianDigestEnabled` / `guardianRunnerEnabled` | env flagy | |
| `heartbeatCheckedAt` | `collectHeartbeatMetrics` | |

UI (`OperatorDashboardClient`): health strip + „Pozornosť dnes“ + tabuľka kancelárií. **Jedna stránka, žiadne ľavé 8-sekciové menu.**

---

## 3. Predloha vs. kód

Predloha (Workdesk mockup, 8+ sekcií v ľavom menu) **nie je** nasadený `/operator`. `/operator` je agregát kancelárií.

| Sekcia predlohy | Verdikt | Dôkaz |
|---|---|---|
| Dnes | ČIASTOČNE | Attention feed „Pozornosť dnes“. Nie denný plán makléra. |
| Kancelárie | HOTOVÉ | Tabuľka zo `gather` |
| Kampane | CHÝBA | `acquisition_campaigns` existuje v Stage 0; gather ich nečíta |
| Leady a konverzia | ČIASTOČNE | `contacts7d` / `contactsTotal` / `trend14d`. Žiadny funnel. Diera `last_contact_at`. |
| Rýchlosť reakcie | ČIASTOČNE | `reaction24hPct` z `lead_events` / 30 d, nie čistý SLA 24 h |
| Výsledky obchodov | HOTOVÉ | won/lost 30 d z `deal_outcomes` |
| Presnosť odhadov | CHÝBA | `valuation_estimates` na prod (audit 15. 8.); gather nepočíta chybu odhadu |
| Strážca | HOTOVÉ | `guardian_findings` HOT_IGNORED / NO_OWNER + last run |
| Systémové zdravie | HOTOVÉ | health strip + `healthScore` |
| Fakturácia | CHÝBA | Stripe/credits tabuľky v kóde; operator ich neagreguje |
| Pipeline | CHÝBA | žiadne stage count z `leads.status` v gather |
| Onboarding | ČIASTOČNE | `valuation_tenants.enabled` → onboarding / widget_disabled. Nie wizard adopcie |

CHÝBA bez tabuľky v repe: fakturácia by šla z `agencies` + billing/credits tabuliek (ak sú na prod); pipeline z `leads.status`; kampane z `acquisition_campaigns`. Ak tabuľka na prod chýba, audit 17. 8. to má ako missing object — neskúšať hádanie.

---

## 4. Aktivačný postup na ráno (3 kroky)

**Krok A — migrácia (read, potom GO).**  
Dashboard SQL: dva SELECT v §1. Ak stĺpec chýba → spustiť `20260728140000_profiles_platform_admin.sql`. Ak history chýba → INSERT vzor vyššie. **Nie `db push`.**

**Krok B — env.**  
Vercel → Project → Settings → Environment Variables → **Production**: `OPERATOR_DASHBOARD_ENABLED=true`. Redeploy Production. Bez redeploy ostane 404.

**Krok C — jeden admin riadok.**  
Najprv SELECT, až potom UPDATE (jedno `id`):

```sql
SELECT id, email, is_platform_admin
FROM public.profiles
WHERE email = 'VAŠE_OPERATOR_EMAIL';
```

Až keď SELECT vráti **jeden** riadok:

```sql
UPDATE public.profiles
SET is_platform_admin = true
WHERE id = '…id zo SELECT…'
  AND email = 'VAŠE_OPERATOR_EMAIL';
```

Trigger `profiles_guard_platform_admin` pustí zmenu len ako `service_role` (SQL editor). Potom otvoriť `/operator` v tom istom účte. Cudzí maklér = 404.

---

## 5. Bezpečnosť

`apps/crm/src/app/operator/page.tsx` poradie:

1. `isOperatorDashboardEnabled()` → inak `notFound()`
2. `createClient()` + `getUser()`
3. `canAccessOperatorDashboard(supabase, user?.id)` (flag znova + `profiles.is_platform_admin === true`) → inak `notFound()`
4. **potom** `createAdminClient()` + `gatherOperatorDashboard`

Jediná operator cesta v `src/`: `app/operator/page.tsx`. Žiadne `app/api/operator`. Unit testy: default flag false; 404 pattern; PII kľúče zakázané v aggregate.

**Verdikt gate:** PASS v kóde.  
**Verdikt dáta:** FLAG — `last_contact_at` vs prod `last_contact` (17. 8., nepremerané 25. 8.).

Žiadne odporúčanie typu „prepíšme dashboard“.
