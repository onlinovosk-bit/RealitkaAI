# Critical bug hunt — 2026-09-02

**Branch:** `cursor/critical-bug-management-c392`  
**Mode:** hunt report + fail-closed fix (CRON / import-test secrets)  
**Scope:** HIGH-severity correctness in `apps/crm` (data loss, auth bypass, silent drop, races)

## #459 / #496 — onboarding MVP unauth

**Verdict: FIXED on `main` after #496** (`bcf7fcbf`, merged 2026-09-02).

Evidence on `origin/main`:
- `proxy.ts` has **no** `ONBOARDING_MVP` bypass.
- `at-risk` / `checklist` / `messages/schedule` call `requirePlatformAdmin()` before `createServiceRoleClient()`.
- `messages/dispatch` route is **deleted** (cron-only path remains: `/api/cron/onboarding-dispatch`).

Draft PR #459 is superseded by merged #496.

---

## NEW candidates (not in automation tracked list)

### 1) Public `/register` hard-codes Reality Smolko tenant — **HIGH**

| | |
|---|---|
| **Files** | `apps/crm/src/app/(public)/register/actions.ts` |
| **Trigger** | Anyone completes public signup with a new email (no existing profile row). |
| **Impact** | New auth users are inserted with `agency_id = 11111111-…` / `team_id = 22222222-…` (prod Reality Smolko). Global profile `count` forces `role: "agent"`. Cross-tenant membership + PII in client tenant. Email-link path also overwrites `role` on existing email match. Insert/update errors are ignored → redirect still succeeds. |
| **Confidence** | **High** on code path / hard-coded UUID. Note: migration `20260508220000` drops open `demo_insert_profiles` (no authenticated INSERT policy) — on fully migrated DB the insert may RLS-fail (still broken signup). If prod still allows insert (drift / service path), Smolko join is live. |
| **Status** | Already opened tonight as **PR #499** (`fix/register-creates-own-agency`) — fail-closed door, no Smolko UUID. Do not duplicate. |

```7:70:apps/crm/src/app/(public)/register/actions.ts
const DEFAULT_AGENCY_ID = "11111111-1111-1111-1111-111111111111";
const DEFAULT_TEAM_ID = "22222222-2222-2222-2222-222222222222";
// ...
        await supabase.from("profiles").insert({
          agency_id: DEFAULT_AGENCY_ID,
          team_id: DEFAULT_TEAM_ID,
          auth_user_id: user.id,
          // ...
          role,
```

### 2) Cron/internal Bearer auth accepts `Bearer undefined` when `CRON_SECRET` unset — **HIGH**

| | |
|---|---|
| **Files** | Formerly: `cron/onboarding-dispatch`, `cron/price-trail-sync`, `cron/arbitrage-scan`, `cron/agency-scraping`, `playbook/generate`, `decision`, `embeddings/backfill`, `meta/lookalike`, `analytics/heatmap` |
| **Trigger** | Env `CRON_SECRET` missing/blank (preview, misconfig, local). Attacker sends `Authorization: Bearer undefined`. `/api/cron/*` also **bypasses** session gate in `proxy.ts`. |
| **Impact** | Unauthenticated `onboarding-dispatch` can send onboarding emails; admin clients on heatmap/decision/playbook/backfill/scraping touch cross-tenant / PII / write paths. |
| **Confidence** | **High** for the auth bug (JS template literal). **Medium** for production exploitability (prod usually has secret); still a landmine for any unset env. |
| **Fix this PR** | Shared `isAuthorizedCronBearer()` — refuse when secret missing; wired into all 9 routes + unit/route tests. |

### 3) `/api/import/test-xml` fail-open when `IMPORT_TEST_API_KEY` unset — **HIGH**

| | |
|---|---|
| **Files** | `apps/crm/src/app/api/import/test-xml/route.ts` |
| **Trigger** | Key env unset; any session-authenticated caller POSTs XML. |
| **Impact** | Handler uses `createServiceRoleClient()` and inserts into `properties` (+ activities) without a second authz check beyond optional key. Proxy comments already flag this as a service-role footgun. |
| **Confidence** | **High** on fail-open code; **medium** that prod leaves the key unset. |
| **Fix this PR** | `if (!expected) return false` — 401 without configured key. |

---

## Verified recently merged (looked solid; no new hole found in pass)

| PR | Check |
|----|--------|
| #496 | Platform admin gate + proxy bypass removed + dispatch deleted |
| #494 | Enterprise onboard no longer writes `account_tier` |
| #491 | Follow-up preview no DEMO agency fallback |
| #492 | Smolko owner email exact allowlist |
| #493 | profiles role/agency_id trigger freeze |
| #488 | anon privileges revoked on `leads` |

## Skipped (still open / known)

#369 #370 #443 #444 #447 #459(superseded) #462 #481 #486 #490 #495

## Also noted (not promoted to top-3)

- Widespread `if (callerProfile?.agency_id && …)` fail-open class (same family as #486) on leads/properties/AI routes — mitigated when RLS holds; still refuse-null preferred.
- `match_leads` / `match_properties` SECURITY DEFINER without agency filter (archive migration) — IDs cross-tenant; detail fetch is user-RLS. Confirm prod grants before elevating.
- Matching recalculate wipe still live (#444).

## Verification run

```text
npx vitest run src/lib/__tests__/cron-auth.test.ts \
  src/app/api/cron/onboarding-dispatch/__tests__/route.test.ts \
  src/app/api/import/test-xml/__tests__/route.test.ts
```

## Task-loop next

**GO:** merge #499 (register Smolko) after CI; then apply this fail-closed secrets PR.  
Without GO: no PROD merge.
