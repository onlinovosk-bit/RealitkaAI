# Critical bug hunt — 2026-08-23

**Branch:** `cursor/critical-bug-management-5d7b`  
**Scope:** High-severity only (data loss, crashes, auth bypass, lost writes, null deref on critical paths, infinite loops, silent truncation).  
**Skipped (open PRs):** #369, #370, #443, #444, #447, #459.  
**Also noted in-tree:** #456 acquire dedup claim/release already on `main` (`79c68092`).

## Verdict

**3 candidates** meet the bar (1 critical, 2 high).

---

## 1. CRITICAL — Cross-tenant password reset via `recovery-link`

| Field | Value |
|-------|--------|
| **Files / functions** | `apps/crm/src/app/api/settings/auth-email-tests/route.ts` — `POST` / `action === "recovery-link"`; UI `apps/crm/src/components/settings/AuthEmailTestsCard.tsx` (`createRecoveryLink`); mounted on `apps/crm/src/app/(dashboard)/settings/page.tsx` |
| **Severity** | **critical** (auth bypass / account takeover) |
| **Confidence** | **high** |
| **Why not tracked PRs** | Not #447 (invite `agency_id`), not #459 (onboarding MVP), not ILIKE #416-class. Different route and mechanism: service-role `auth.admin.generateLink` returns the recovery URL to the caller. |

### Trigger (plausible)

1. Attacker is (or compromises) any agency **owner** / `owner_vision` / `owner_protocol` / founder.
2. Opens Settings → “Auth e-mail testy” (or `POST /api/settings/auth-email-tests` directly).
3. Sets `action: "recovery-link"` and `email` to a **victim in another agency** (no tenant check on target).
4. Response JSON includes `recoveryLink` (`action_link` from Supabase Admin API).
5. Attacker opens the link → sets victim password → full account takeover + tenant data.

### Evidence

- `canManageUsers` gates only “may reset *someone else*”; target email is **not** constrained to caller `agency_id`.
- Admin client is used; link is returned in the HTTP body (not only emailed).
- Unit test documents owner can target `other@example.com` for `recovery` (same authorization gate as `recovery-link`).

### Minimal fix direction

- Scope target profile to caller `agency_id` (service-role lookup) before `generateLink` / `resetPasswordForEmail`.
- Prefer never returning `action_link` to the browser; email-only recovery.
- Gate the card to platform admin / founder, or remove `recovery-link` from production UI.

---

## 2. HIGH — `auth-email-tests` invite upsert omits `agency_id`

| Field | Value |
|-------|--------|
| **Files / functions** | `apps/crm/src/app/api/settings/auth-email-tests/route.ts` — `POST` / `action === "invite"` → `admin.from("profiles").upsert(...)` |
| **Severity** | **high** (invitee null tenant / empty inventory) |
| **Confidence** | **high** |
| **Why not tracked PRs** | **PR #447** fixes `apps/crm/src/app/api/invite/route.ts` only. This is a **second invite entry point** on Settings with the same omission. |

### Trigger

1. Owner uses Settings → “Poslať test invite” (or API `action: "invite"`).
2. `inviteUserByEmail` succeeds; profile upsert writes `id/full_name/email/role/is_active` **without** `agency_id` (and without caller agency stamp).
3. Invitee accepts invite → login with `agency_id = null` → empty inventory / broken tenant scope (same impact class as #447).

### Evidence

```143:152:apps/crm/src/app/api/settings/auth-email-tests/route.ts
        await admin.from("profiles").upsert(
          {
            id: data.user.id,
            full_name: fullName,
            email: testEmail,
            role: "agent",
            is_active: true,
          },
          { onConflict: "id" },
        );
```

### Minimal fix direction

Same as #447: stamp `agency_id` (and `auth_user_id` if required) from the inviting owner’s profile in **both** invite routes, or share one invite helper.

---

## 3. HIGH — Seat/top-up Checkout created with empty `agencyId`

| Field | Value |
|-------|--------|
| **Files / functions** | `apps/crm/src/lib/credits-billing.ts` — `createSeatCheckoutSession`, `createTopupCheckoutSession`; fulfillment `handlePricingCheckoutWebhook` / `applySeatCheckoutEntitlements` / `applyTopupPurchase`; gate `apps/crm/src/app/api/billing/webhook/route.ts` |
| **Severity** | **high** (paid Stripe session, no seats/credits applied) |
| **Confidence** | **medium** (needs profile with null `agency_id` reaching checkout; amplified by invite null-tenant paths) |
| **Why not tracked PRs** | Not #369 (upgrade okResponse shape), not #370 (RMW race). Prior audits called this a near-miss; fail-closed webhook (# pricing 500) still leaves money taken without entitlement. |

### Trigger

1. Authenticated user has profile with `agency_id` null/missing (e.g. invite path #2 / #447).
2. Starts seat or credit top-up checkout; metadata gets `agencyId: ""`.
3. Customer pays; `checkout.session.completed` → pricing handler returns `false` (`missing agencyId`).
4. Webhook responds **500** → Stripe retries; fulfillment never applies seats/credits until metadata is repaired manually.

### Evidence

- Checkout builders: `agencyId: String(...agency_id ?? "")` with no pre-flight reject.
- Webhook: `if (!agencyId) { ... return false; }` then route returns 500 for pricing sessions.

### Minimal fix direction

Refuse to create Stripe session when `!profile.agency_id` (400 before Checkout). Optionally backfill agency from profile on webhook as defense in depth.

---

## Areas checked — no additional critical filed

| Area | Notes |
|------|--------|
| **A) gmail-pull + route + proxy** | `CRON_SECRET` on route; proxy allowlists `/api/inbound/gmail-pull` as cron bypass (handler still auths). In-memory `seen` only; durable dedup is acquire-side. `isDmarcReject` is diagnostic (fixtures post DMARC rejects by design). No new critical. |
| **B) acquire/email (#456)** | Claim-before-insert + release on lead `error` is on `main`. Concurrent `23505` treated as duplicate. Residual throw-vs-error on abort is weaker than filed bugs (supabase-js usually surfaces abort as `error`). |
| **C) credits-cycle / Stripe / price map** | Unknown price → no-op; seat price map present; pricing vs legacy checkout split present. Remaining RMW / atomic writers → **#370**. Expire wipe guard → related open credits PRs. |
| **D) service role / proxy / ILIKE** | Onboarding MVP unauth → **#459**. Profile email ILIKE wildcards already guarded. `neighborhood-watch` admin read is demo alerts (not CRM PII dump). |
| **E) mutation stores** | Leads create/update/delete routes pass scoped client. Properties mutations still omit scoped → **#443**. Matching wipe → **#444**. No separate contacts/deals store with the same omission found. |
| **F) lead-webhook / sync persist** | Stage 0 log-only (no CRM lead insert); google_key + rate limit. Persist upserts flag-gated; no wipe path. |

---

## Kontrolór (self-check)

| Candidate | Label | Verdict |
|-----------|--------|---------|
| recovery-link takeover | FAKT (code + UI + tests) | PASS to file |
| invite without agency_id (settings) | FAKT | PASS to file (sibling of #447, not the same file) |
| empty agencyId checkout | FAKT code; PREDPOKLAD that null-agency users reach Checkout often | PASS at medium confidence |

---

## Next (task-loop)

```
ĎALŠIA ÚLOHA: Fix recovery-link tenant scope + stop returning action_link (auth-email-tests); stamp agency_id on settings invite in same PR or follow-up 1:1 with #447.
PREČO TERAZ: Critical cross-tenant account takeover exposed on production Settings UI.
BRÁNA: GO REQUIRED (auth-sensitive; founder GO before merge)
```
