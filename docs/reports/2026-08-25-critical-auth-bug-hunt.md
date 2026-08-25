# Critical AUTH / tenant bug hunt — Revolis CRM (2026-08-25)

**Lane:** critical-bug automation (`cursor/critical-bug-management-11e1`)  
**Scope:** AUTH/PERMISSION bypasses, cross-tenant data leaks, unauthenticated PII exposure  
**Skipped (already tracked PRs):** #369, #370, #443, #444, #447, #459, #462  
**Sibling report (same day, correctness/data-loss):** `docs/reports/2026-08-25-critical-bug-hunt.md` (empty `agencyId` checkout, grant ledger orphan, gmail 25-cap, matching 500-cap) — not re-filed here.

**Method:** Full caller-chain review of `proxy.ts`, gmail-pull, acquire/email, acquisition lead-webhook, webhook/cron service-role routes, seat/topup checkout, and `createAdminClient` API routes.

---

## Verdict

**3 HIGH findings** (high confidence, concrete triggers). Areas checked clean listed at bottom.

---

## 1. HIGH — HubSpot sync: admin IDOR when caller has no `agency_id`

| | |
|---|---|
| **Paths** | `apps/crm/src/app/api/integrations/hubspot/sync/route.ts` |
| **Root cause** | Route loads the lead with `createAdminClient()` (bypasses RLS), then tenant-checks with `if (callerProfile?.agency_id && lead.agency_id !== callerProfile.agency_id)`. When `callerProfile` is missing **or** `agency_id` is `null`, the condition short-circuits → **no Forbidden** → full lead row (email/phone/name/note) is pushed to HubSpot via shared `HUBSPOT_API_KEY`. |
| **Trigger** | Authenticated user with `profiles.agency_id = null` (invite/#447-class, incomplete onboarding, or no profile row) `POST /api/integrations/hubspot/sync` with any victim `leadId` UUID while HubSpot is configured. |
| **Impact** | Cross-tenant PII exfiltration into HubSpot; victim lead mutated (`hubspot_contact_id`). |
| **Minimal fix** | Require non-null `callerProfile.agency_id`; reject 403 if absent. Fetch lead with scoped client **or** `eq("agency_id", callerAgencyId)` after admin fetch. Never sync when caller has no tenant. |

**Evidence (FAKT):**

```31:48:apps/crm/src/app/api/integrations/hubspot/sync/route.ts
  const db = createAdminClient()
  const { data: lead, error: fetchError } = await db
    .from("leads")
    .select("*")
    .eq("id", leadId)
    .single()
  ...
  if (callerProfile?.agency_id && lead.agency_id !== callerProfile.agency_id) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 })
  }
```

---

## 2. HIGH — AI call analyze: admin write IDOR when caller has no `agency_id`

| | |
|---|---|
| **Paths** | `apps/crm/src/app/api/ai/call/analyze/route.ts`; `apps/crm/src/lib/workflows/call-analysis-persist.ts` |
| **Root cause** | Same fail-open pattern: `if (callerProfile?.agency_id && leadRow?.agency_id !== callerProfile.agency_id)`. Null/missing caller agency skips the gate. Then `createAdminClient()` + `persistCallAnalysisToCrm` inserts activities/tasks on **any** `lead_id` (RLS bypass), even when scoped `leadRow` was null. |
| **Trigger** | Authenticated null-agency user `POST /api/ai/call/analyze` with `{ transcript, lead_id: "<victim-uuid>", persist_to_crm: true }`. |
| **Impact** | Cross-tenant integrity write (notes/tasks on foreign leads); possible PII contamination of victim CRM. |
| **Minimal fix** | Require `callerProfile.agency_id`; require `leadRow` visible under RLS with matching `agency_id`; only then call admin persist. Prefer scoped client for writes. |

**Evidence (FAKT):**

```31:41:apps/crm/src/app/api/ai/call/analyze/route.ts
    const { data: callerProfile } = await supabase.from("profiles").select("agency_id").eq("auth_user_id", user.id).maybeSingle();
    const { data: leadRow } = await supabase.from("leads").select("agency_id").eq("id", lead_id).maybeSingle();
    if (callerProfile?.agency_id && leadRow?.agency_id !== callerProfile.agency_id) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }
    ...
      const admin = createAdminClient();
      const ids = await persistCallAnalysisToCrm(admin, lead_id, result);
```

Same class also appears (defense-in-depth only, RLS still applies) on `leads/[id]`, `properties/[id]` — those use scoped clients, so **not** filed separately. Admin+fail-open is the severity jump.

---

## 3. HIGH — Cron auth fail-open: `Bearer undefined` when `CRON_SECRET` unset

| | |
|---|---|
| **Paths** | Proxy: `apps/crm/src/proxy.ts` (`isCronRoute` → session bypass for `/api/cron/*`). Handlers that compare `auth !== \`Bearer ${process.env.CRON_SECRET}\`` **without** `if (!cronSecret)` guard, notably: `apps/crm/src/app/api/cron/onboarding-dispatch/route.ts`, `apps/crm/src/app/api/cron/agency-scraping/route.ts`, `apps/crm/src/app/api/cron/arbitrage-scan/route.ts`, `apps/crm/src/app/api/cron/price-trail-sync/route.ts`; also session-gated admin tools: `meta/lookalike`, `embeddings/backfill`, `playbook/generate`, `decision`, `analytics/heatmap`. |
| **Root cause** | When `CRON_SECRET` is unset, template literal becomes the string `"Bearer undefined"`. Attacker who sends that header passes the check. `/api/cron/*` also skips the proxy session gate. Worst case: `onboarding-dispatch` → `createServiceRoleClient()` → reads `contact_email` / `contact_name` and sends mail. |
| **Trigger** | Deploy/preview/misconfig where `CRON_SECRET` is missing; `Authorization: Bearer undefined` against `/api/cron/onboarding-dispatch` (POST) or `/api/cron/agency-scraping`. |
| **Impact** | Unauthenticated service-role actions; onboarding PII email dispatch; scraping/admin side effects. Distinct from **#459** (MVP `/api/onboarding/mvp/*` proxy bypass). |
| **Minimal fix** | Universal guard: `const secret = process.env.CRON_SECRET?.trim(); if (!secret \|\| auth !== \`Bearer ${secret}\`) return 401`. Prefer shared helper used by credits/guardian crons. |

**Evidence (FAKT):**

```4:8:apps/crm/src/app/api/cron/onboarding-dispatch/route.ts
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
```

```25:27:apps/crm/src/lib/onboarding-dispatch.ts
export async function runOnboardingDispatch(): Promise<DispatchResult> {
  const supabase = createServiceRoleClient();
```

Contrast (safe pattern already in-repo):

```19:21:apps/crm/src/app/api/cron/credits-grant/route.ts
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
```

---

## Near-miss / not filed at this bar

| Item | Why not filed |
|------|----------------|
| Seat/top-up empty `agencyId` | Already in sibling hunt report + prior audit; still unfixed — see that doc #1 |
| `/api/webhooks/inbound-lead` optional `INBOUND_WEBHOOK_SECRET` + no `agency_id` + `createClient()` | Under Wave A RLS (`agency_id IN profile_agencies`), null-agency inserts fail WITH CHECK → primarily **broken webhook / silent ok** rather than live cross-tenant dump. Fix still needed (require secret; service role + resolve agency from `profileId`) but severity below the three above until proven used in prod |
| `import/test-xml` fail-open when `IMPORT_TEST_API_KEY` unset | Proxy still requires session; writes scoped to caller `agency_id` when present |
| `acquire/email` arbitrary `mailbox.agencyId` | Shared-secret trust of Worker by design; secret required fail-closed |
| Acquisition Google lead-webhook | Key required; Stage0 no CRM lead insert |
| `gmail-pull` | Bearer `CRON_SECRET` with `!expected` fail-closed; single env agency — no cross-tenant pull API |
| `proxy.ts` API auth timeout | Fail-closed 401 for `/api/*` |

---

## Checked clean (this auth pass)

| Area | Result |
|------|--------|
| `proxy.ts` public allowlist + fail-closed API timeout | OK for auth gate; cron/webhook/mvp bypasses still rely on route-level secrets (#459 tracks mvp) |
| `inbound/gmail-pull` + `runGmailInboundPull` | CRON_SECRET required; agency from env + mailbox row — cannot pull another tenant via API |
| `acquire/email` (post-#456) | Shared secret timing-safe; claim/release OK; tenant = payload agency (worker-trusted) |
| `acquisition/google/lead-webhook` | Key + agency resolve; Stage0 log only |
| Calendly / HubSpot inbound webhooks | Signature/secret required fail-closed |
| Realvia/UC/Realsoft import | Credential/identifikator checks; not open |
| Cron routes using `if (!cronSecret \|\| …)` | Fail-closed when unset |

---

## Kontrolór

| Claim | Label | Verdict |
|-------|--------|---------|
| HubSpot admin fetch before fail-open agency check | FAKT | PASS |
| Call-analyze admin persist after same fail-open check | FAKT | PASS |
| `Bearer ${undefined}` === `"Bearer undefined"` | FAKT (JS) | PASS |
| `/api/cron/*` skips proxy session | FAKT (`proxy.ts` `isCronRoute`) | PASS |
| Prod currently missing `CRON_SECRET` | NEZNÁME | FLAG — defect is still concrete on any env without the secret |
| Null-agency authenticated users exist in prod | PREDPOKLAD amplified by open #447 | FLAG — trigger class is real whenever such profiles exist |

---

## Next task (GO gate)

**ĎALŠIA ÚLOHA:** `GO FIX-HUBSPOT-ANALYZE-TENANT-GATE` — require non-null caller `agency_id` and matching lead agency before admin HubSpot sync / call-analyze persist (findings 1–2; one PR, shared helper OK).  
**PREČO TERAZ:** Cross-tenant PII / integrity with concrete null-agency trigger; stacks with open #447.  
**BRÁNA:** GO REQUIRED (security fix touching admin paths).

Do **not** bundle with cron `Bearer undefined` harden (finding 3) — separate PR (`GO FIX-CRON-SECRET-FAIL-CLOSED`).
