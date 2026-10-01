# Operator Dashboard v1 — KROK 0 (repo-first)

**Branch:** `feat/operator-dashboard-v1`
**Dátum:** 2026-07-28
**Stav implementácie:** **STOP — chýba platform-admin v DB schéme** (founder schema gate)

---

## 1. Autorizácia a ochrana route

| Vrstva | Cesta | Správanie |
|--------|-------|-----------|
| **Page session gate (dokumentovaný)** | `apps/crm/src/proxy.ts` | `PUBLIC_PATHS` + `isPublic()` — verejné cesty bez session; inak Supabase `getUser()`. Neprihlásený na `/dashboard`, `/app`, `/properties` → redirect `/login`. API bez usera → **401** JSON. Cron/webhook/onboarding MVP prefixy bypass. |
| **API middleware (aktívny súbor)** | `apps/crm/middleware.ts` | Matcher **`/api/:path*`** only. `BYPASS_PREFIXES` + `REVOLIS_GUARD_PREFIXES` (HMAC). Ostatné API → session required → **401** ak chýba user. |
| **Dashboard layout** | `apps/crm/src/app/(dashboard)/layout.tsx` | `getUser()` → redirect login ak chýba session. |
| **Interné founder stránky (404 pattern)** | `apps/crm/src/app/internal/metrics/page.tsx` | `isFounderMetricsViewer(email)` z `FOUNDER_EMAILS` → inak `notFound()`. |
| **Agency owner gate (404 pattern)** | `apps/crm/src/app/(dashboard)/ceo-command/page.tsx` | `isCeoCommandOwner(profile)` z `role` / `ui_role` → inak `notFound()`. |

**Nález:** `src/proxy.ts` exportuje `proxy()` ale v repozitári **nie je** `apps/crm/src/middleware.ts`, ktorý by ho volal — produkčná ochrana stránok je kombinácia `proxy.ts` (podľa docs/diagnostiky) a layout redirectov. Pre `/operator` (mimo agency layout) treba **page-level** gate: feature flag + platform-admin + `notFound()` (404, nie 403), rovnako ako `internal/metrics` a `ceo-command`.

**PUBLIC_PATHS** (presný zoznam): `apps/crm/src/proxy.ts` riadky 6–27 — `/operator` tam **nie je** (správne; route musí byť chránená).

---

## 2. Platform-admin na `profiles` / `agencies`

**Nález: NEEXISTUJE.**

- `rg` na `platform_admin`, `platform-admin`, `is_platform` v repozitári → **0 zhôd**.
- Baseline `profiles` (`20260310_baseline_core_schema.sql`): `id`, `agency_id`, `role` (default `agent`), `email`, … — **žiadny** platform príznak.
- `agencies`: `name`, `slug`, `plan`, `is_active`, … — **žiadny** `is_system` / `is_demo` stĺpec (demo/sandbox je riešené inde).
- Existujúce **agency-scoped** role: `profiles.role`, `ui_role` (používané v UI, **nie** v SQL migráciách v tomto repe), `isCeoCommandOwner` = owner RK, **nie** Revolis platform operátor.
- Existujúce **founder env gate**: `FOUNDER_EMAILS` (`apps/crm/src/lib/metrics/access.ts`) — email allowlist, **nie** DB príznak, **nie** vhodné ako jediná authz pre cross-tenant agregáty (Build Package vyžaduje platform-admin na profile).

### Navrhovaná minimálna zmena schémy (čaká founder GO)

```sql
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_platform_admin boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.is_platform_admin IS
  'Revolis platform operator; cross-tenant routes (e.g. /operator). Never true for customer brokers.';

CREATE INDEX IF NOT EXISTS idx_profiles_platform_admin
  ON public.profiles (id)
  WHERE is_platform_admin = true;
```

**RLS poznámka:** bežní používatelia nesmú vidieť/ meniť cudzí `is_platform_admin`; nastavenie len service_role / jednorazový founder script. Samotný boolean neobchádza RLS na leadoch — operátorské dotazy idú cez service-role agregačné RPC/views (Build Package).

**Alternatíva (odmietnutá pre v1):** len `FOUNDER_EMAILS` — nekonzistentné s „platform-admin je samostatná rola“ a s budúcim drill-down auditom viazaným na profile id.

**→ Implementácia F1/F2/F4 a `/operator` sa v tomto PR NEROBÍ.**

---

## 3. Paralelné načítanie — `dashboard-insights-gather.ts`

**Cesta:** `apps/crm/src/lib/ai/dashboard-insights-gather.ts`

**Vzor:** `gatherAgencyDashboardSummary()` — prvý `Promise.all` s 6 paralelnými dotazmi (counts, hot leads, profiles), potom voliteľný druhý `Promise.all` pre events. Operátor dashboard má použiť rovnaký pattern pre F1 + F2 + F4 sekcie (3–5 paralelných agregačných volaní, nie sekvenčné full-scany).

---

## 4. Allowlist — vylúčenie demo/sandbox tenantov

**Referenčný vzor:** `apps/crm/src/lib/guardian/config.ts`

- `parseGuardianAgencyAllowlist()` — CSV z `GUARDIAN_AGENCY_ALLOWLIST`
- `filterAgenciesForGuardianRun()` — production: unset/empty = **žiadny** tenant run

**Pre operátora (inverzná logika):** Build Package chce **vylúčiť** systémových tenantov z hodnotenia.

Navrh pre v1 kód (bez novej tabuľky):

1. Env `OPERATOR_AGENCY_EXCLUDE_LIST` (CSV UUID) — mirror parsing ako Guardian.
2. Hardcoded vylúčenie sandbox tenantu z migrácie `20260722120000_sandbox_gdpr_consent.sql` (`slug` `revolis-sandbox-internal` / `valuation_tenants.is_sandbox = true` join).
3. Riadky v UI ako mockup: stav **systém** · „mimo hodnotenia“.

Guardian allowlist = **include** paying tenants; operator exclude = **exclude** demo/sandbox — rovnaký CSV parsing, opačná sémantika.

---

## 5. Audit / `integrity_alerts` (v1.1 drill-down)

**Tabuľka:** `public.integrity_alerts` — migrácia `apps/crm/supabase/migrations/20260425231407_event_pipeline.sql` (stĺpce: `profile_id`, `triggered_by`, `alert_type`, `threshold_hit`, `payload`, …).

**Zápis:** `apps/crm/src/lib/events/integrity-monitor.ts` → `triggerIntegrityAlert()` insert po export/bulk-view prahu.

**RLS:** profile-scoped (`tests/rls/tenant-table-registry.ts` — scope `profile_id`).

**Pre operator v1.1:** drill-down s dôvodom by mal **rozšíriť** tento vzor (alebo sibling `platform_events`) o `agency_id`, `reason` enum, operátor `profile_id` — **v1 nič nestavať**, len reuse plán.

---

## 6. Ďalšie existujúce stavebné bloky (implementácia po schema GO)

| Potreba | Existujúci zdroj |
|---------|------------------|
| Platform heartbeat / strážca | `apps/crm/src/lib/infra/platform-heartbeat.ts`, cron `heartbeat-check` |
| Guardian nálezy | tabuľka `guardian_findings`, pravidlá v `apps/crm/src/lib/guardian/config.ts` |
| Deal outcomes | `deal_outcomes` (Build Package DATA) |
| Feature flag pattern | env boolean ako `GUARDIAN_DIGEST_ENABLED` / `isGuardianDigestEnabled()` |

---

## 7. Odchýlky / otvorené

- Dátum premortem v balíku: 28.08.2026; súbor premortem pomenovaný `2026-07-29-operator-dashboard.md` podľa zadania.
- `ui_role` je v aplikačnom kóde, ale **žiadna** `.sql` migrácia v repozitári — operátor auth **nesmie** spoliehať na `ui_role` bez explicitného platform stĺpca.

---

## 8. Čo čaká na foundera

1. **GO na migráciu** `profiles.is_platform_admin` (+ proces nastavenia pre Revolis operátorov).
2. Po merge migrácie: druhý PR — v1 implementácia podľa kickoff (F1, F2, F4, testy, `OPERATOR_DASHBOARD_ENABLED=false`).
