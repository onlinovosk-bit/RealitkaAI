# Critical bug hunt — 2026-09-15

**Branch:** `cursor/critical-bug-hunt-2026-09-15`  
**Mode:** hunt report only (no fix in this commit)  
**Scope:** HIGH-severity correctness in `apps/crm` — data loss, auth/tenant bypass, silent write drops, significant UX breakage  
**Bar:** severity + confidence; must be **distinct** from open tracked PRs

## Tracked (skipped — still open)

| PR | Topic |
|----|--------|
| #369 | upgrade/page nested okResponse |
| #370 | credits-billing race |
| #443 | properties-store unscoped mutations |
| #444 | matching-store recalculate unscoped |
| #447 | invite/route agency_id omit |
| #462 | auth-email-tests cross-tenant |
| #486 | hubspot/sync + ai/call/analyze fail-open null agency |
| #490 | lead-automation-store cookie-less |
| #495 | inbound-lead webhook silent drop |
| #537 | notification-delivery unscoped digest |
| #545 | buyer-onboarding createTask no service-role |
| #548 | outreach scheduled-outreach unscoped |

## Scanned

- `matching.ts` @ `2207e0be` (#553 empty-score fix) — looks correct; no new HIGH hole
- Smolko chatbot `#542` — tenant gate + scoped `listLeads`/`listTasks` OK
- Strážca prítoku / `notification-delivery` — still #537 class (not re-opened)
- `/hladame` Máme kupca `#531` — admin + agency scope OK; posts to inbound (depends on #495)
- Property Launch Pack `#514` — agency gate + `agency_id` filter on sourceId OK
- Realvia processQueue upsert/delete — agency_id filters present (#522)
- customer-health cron — CRON_SECRET fail-closed OK
- inbound auto-response — best-effort; TOCTOU double-send possible (med, not top-3)
- demo/sales-funnel — service-role paths fixed (#546 class on main)
- team-store / profiles / playbook — #549/#550 merged; residual holes below
- Pattern sweep: cookie-less `resolveTenantSupabase()`, missing `agency_id`, fail-open `agency_id ?? body`, silent `ok:true`

---

## Top 3 (severity × confidence)

### 1) Match status PATCH never threads scoped client — **HIGH / high**

| | |
|---|---|
| **Files** | `apps/crm/src/lib/matching-store.ts` (`updateLeadPropertyMatchStatus`) · `apps/crm/src/app/api/leads/[id]/matches/[matchId]/route.ts` |
| **Trigger** | Agent changes a lead–property match status (interested / rejected / viewed) via `PATCH /api/leads/:id/matches/:matchId`. |
| **Impact** | Route authenticates with `createClient()` then calls `updateLeadPropertyMatchStatus(id, matchId, status)` which **has no `scoped` parameter** and always uses the cookie-less browser singleton. After `matches_anon_legacy_all` drop (prod 2026-09-04), anon cannot write → update throws → UI 400 / status never persists. Pipeline decisions (záujem / odmietnutie) silently fail to stick. Secondary: `addLeadActivity` also has no scoped arg → activity audit drop. Fail-open tenant gate if `callerProfile.agency_id` is null. |
| **Confidence** | **High** — code path is explicit; same mechanism as #443/#550. |
| **Distinct?** | **Yes** — not #444 (recalculate wipe). This is status PATCH / missing scoped API on a different function. |

```158:163:apps/crm/src/lib/matching-store.ts
export async function updateLeadPropertyMatchStatus(
  leadId: string,
  matchId: string,
  status: string
): Promise<{ match: LeadPropertyMatchListItem; previousStatus: string | null }> {
  const supabase = await resolveTenantSupabase();
```

```46:50:apps/crm/src/app/api/leads/[id]/matches/[matchId]/route.ts
    const { match, previousStatus } = await updateLeadPropertyMatchStatus(
      id,
      matchId,
      body.status
    );
```

### 2) `POST /api/team/users` createProfile cannot insert under current RLS — **HIGH / high**

| | |
|---|---|
| **Files** | `apps/crm/src/app/api/team/users/route.ts` · `apps/crm/src/lib/team-store.ts` (`createProfile`) · `apps/crm/supabase/migrations/20260508220000_rls_agencies_profiles_teams.sql` |
| **Trigger** | Owner/manager submits **Pridať používateľa** on `/team` (`UserCreateForm` → `POST /api/team/users`). |
| **Impact** | Migration dropped `demo_insert_profiles` and only created SELECT + self-UPDATE policies — **no authenticated INSERT policy** on `profiles`. `createProfile` uses the request-scoped authenticated client → RLS rejects every insert. Team onboarding via UI is permanently broken on a fully migrated DB. Compound risks if someone “fixes” with service-role without gates: UI offers `role: owner`, and `agencyId = callerProfile?.agency_id ?? rawBody.agencyId` fail-opens when caller agency is null. Insert also omits `auth_user_id` / auth invite — even a successful insert would be an orphan row (invite path is separate and still #447). |
| **Confidence** | **High** on code + migration chain; prod history audit listed `20260508220000` as applied. |
| **Distinct?** | **Yes** — not #447 (invite upsert missing `agency_id`) or #550 (PATCH scoped self-edit). |

```61:70:apps/crm/src/app/api/team/users/route.ts
    const agencyId: string = callerProfile?.agency_id ?? (rawBody.agencyId as string | undefined) ?? "";

    const profile = await createProfile({
      agencyId,
      teamId: body.teamId ?? null,
      fullName: body.fullName,
      email: body.email,
      role: body.role,
```

### 3) Management dashboard SSR loads all stores cookie-less — **HIGH / high**

| | |
|---|---|
| **Files** | `apps/crm/src/app/(dashboard)/management/page.tsx` · `apps/crm/src/lib/management-store.ts` |
| **Trigger** | Owner opens `/management` (RSC). |
| **Impact** | `requireUser()` runs, then `getManagementDashboardData()` calls `listLeads()` / `listTasks()` / `listProfiles()` / `listPersistedMatches()` / `listRecommendations()` with **no scoped client**. Server falls back to browser singleton → empty tenant reads under current RLS → KPIs, agent performance, pipeline, top leads/matches render as zeros / empty while the agency has live data. Significant owner-facing breakage (false “empty CRM”). Contrast: `/team` correctly passes `getRscSupabase()` into `getTeamDashboardData(supabase)`. |
| **Confidence** | **High** on code asymmetry; impact is empty UI not cross-tenant write. |
| **Distinct?** | **Yes** — read-path sibling of #443, not in tracked list. |

```14:19:apps/crm/src/app/(dashboard)/management/page.tsx
export default async function ManagementPage() {
  await requireUser();

  const result = await safeServerAction(
    () => getManagementDashboardData(),
    "Nepodarilo sa načítať management dashboard."
  );
```

---

## Near-misses (not top-3 / lower confidence)

| Candidate | Why not top-3 |
|-----------|----------------|
| `DEMO_CAPTURE_API_KEY` optional (`if (apiKey && …)`) + admin insert | Same fail-open class as fixed import-test; HIGH if env unset, but not in recent focus surfaces; prod key state unknown |
| `updateAiRecommendation` / `getAiRecommendationById` unscoped + null-agency fail-open | Same #443 class; pair with match-status fix |
| Owner `PATCH` other profile role blocked by unscoped `getProfileById` | Documented as intentional leave in #550 report; becomes hard-403 under tenant SELECT — FLAG until measured |
| Inbound auto-response send-then-mark race | Duplicate emails possible; not data loss |
| `matching.ts` #553 | Fix verified; empty≠empty no longer inflates scores |
| Smolko chat / launch-pack / hladame / customer-health / realvia agency scope | No new HIGH clearing the bar |

## Kontrolór (brief)

| Claim | Label | Verdict |
|-------|--------|---------|
| Match PATCH uses cookie-less store | FAKT (source) | PASS |
| Prod rejects anon match writes | FAKT (migration applied note 2026-09-04) | PASS |
| profiles has no INSERT policy | FAKT (migration file) | PASS |
| Prod has 20260508 applied | FAKT (docs migration-history audit) | PASS — re-check before fix PR if drift suspected |
| Management page shows zeros in prod | PREDPOKLAD (code ⇒ empty read) | FLAG — confirm with one authenticated SSR/log |

## Next fix PR (suggested, not started)

1. Thread `scoped` into `updateLeadPropertyMatchStatus` + `addLeadActivity`; fail-closed null `agency_id` on match route.  
2. Team user create: service-role **or** owner-only INSERT policy + refuse body.agencyId + no self-serve `owner` role + auth invite linkage (coordinate with #447).  
3. Pass RSC/API scoped client into `getManagementDashboardData`.

**Merge:** founder only. This commit is report-only.
