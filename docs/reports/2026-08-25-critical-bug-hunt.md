# Critical bug hunt — Revolis CRM (2026-08-25)

**Lane:** critical-bug automation (`cursor/critical-bug-management-11e1`)  
**Scope:** HIGH-SEVERITY correctness — data loss, lost writes, silent truncation, null crashes on critical paths  
**Skipped (already tracked):** #369, #370, #443, #444, #447, #459, #462  
**Method:** code review of recent behavioral commits + priority stores (no production mutation)

---

## Verdict

**4 CRITICAL / HIGH findings** (high confidence, concrete triggers). Residual RMW races already covered by #370/#452 were not re-filed.

---

## 1. CRITICAL — Seat/top-up Checkout with empty `agencyId` → paid, never fulfilled

| | |
|---|---|
| **Paths** | `apps/crm/src/lib/credits-billing.ts` (`createSeatCheckoutSession`, `createTopupCheckoutSession`); `apps/crm/src/lib/credits-billing-webhook.ts`; `apps/crm/src/app/api/billing/credits/checkout/route.ts` |
| **Root cause** | Checkout writes `metadata.agencyId: String(profile?.agency_id ?? "")` and still creates the Stripe session. Webhook requires non-empty `agencyId` and returns `false` → route returns **500** (#401). Stripe retries forever; entitlements/credits never apply. |
| **Trigger** | Authenticated user whose `profiles.agency_id` is `null` (invite without stamp, broken onboarding, #447-class profile) starts seat or credit top-up checkout and pays. |
| **Impact** | Customer charged; seats/credits never granted; support-only recovery; webhook error storm. |
| **Minimal fix** | Refuse session creation when `!agency_id` (400 before Stripe). Optionally webhook fallback: resolve agency from `authUserId` / `client_reference_id` if metadata empty. Same guard on legacy `billing-store.createBillingCheckoutSession`. |

**Evidence (FAKT):**

```105:106:apps/crm/src/lib/credits-billing.ts
      agencyId: String((profile as { agency_id?: string })?.agency_id ?? ""),
      ...metadata,
```

```29:32:apps/crm/src/lib/credits-billing-webhook.ts
    if (!agencyId) {
      console.warn("[pricing-webhook] seat checkout missing agencyId");
      return false;
    }
```

---

## 2. CRITICAL — Seat checkout ACK + grant ledger orphan (balance never updated)

| | |
|---|---|
| **Paths** | `apps/crm/src/lib/credits-billing-webhook.ts`; `apps/crm/src/lib/credits/grant-engine.ts` (`grantMonthlyCreditsForAgency`); also `monthly-cycle.ts` (same grant helper) |
| **Root cause** | Webhook treats entitlements success as fulfillment success and **ignores** `triggerInitialGrantAfterSeatCheckout` outcome. `grantMonthlyCreditsForAgency` inserts `credit_ledger` then updates `agencies`; on update failure it returns `{ skipped: true }` **without** deleting the ledger row (unlike `applyTopupPurchase`, which rolls back the ledger). Unique `idempotency_key` then makes every retry a permanent no-op. Monthly cycle counts this as skip and can still return `ok: true`. |
| **Trigger** | Transient agency UPDATE failure after successful ledger INSERT during (a) seat `checkout.session.completed` or (b) `runMonthlyCreditCycle` grant phase. |
| **Impact** | Paid (or cron) grant recorded in ledger; spendable `grant_credits_balance` / `credits_balance` stay stale; Stripe ACKs seat checkout; customer sees seats but **0 grant credits** until manual ops repair. |
| **Minimal fix** | Mirror top-up compensation: on agency update failure, delete ledger row by idempotency key and return hard `error` (not skip). Webhook: `return ok && grantOk` (fail closed → Stripe retry). Cycle: treat grant hard errors like expire errors (`ok: false`). |

**Evidence (FAKT):**

```48:51:apps/crm/src/lib/credits-billing-webhook.ts
    if (ok) {
      await triggerInitialGrantAfterSeatCheckout(agencyId);
    }
    return ok;
```

```79:96:apps/crm/src/lib/credits/grant-engine.ts
  if (ledgerErr) {
    ...
    return { granted: 0, skipped: true };
  }
  const { error: agencyErr } = await supabase.from("agencies").update({...}).eq("id", agency.id);
  if (agencyErr) {
    ...
    return { granted: 0, skipped: true };
  }
```

Contrast: `applyTopupPurchase` deletes ledger on balance failure (lines 279–300 in `credits-billing.ts`).

---

## 3. CRITICAL — Gmail inbound pull: messages beyond first 25 never processed

| | |
|---|---|
| **Paths** | `apps/crm/src/lib/inbound/gmail-pull.ts` (`gmailListUrl`, `runGmailInboundPull`) |
| **Root cause** | List uses `maxResults=25` and **never** follows `nextPageToken`. Scope is `gmail.readonly` — pull cannot remove/modify the inbound label after success. In-memory `seen` does not persist across cron invocations. Net: every run re-lists the same newest ≤25 labeled messages; older labeled mail is invisible forever. |
| **Trigger** | `GMAIL_INBOUND_PULL_ENABLED=true` and >25 messages sit under `GOOGLE_GMAIL_INBOUND_LABEL_ID` (burst of portal inquiries, backlog, dual-run without label cleanup). |
| **Impact** | Silent **lost leads** — inquiries never reach `/api/acquire/email`. Dedup correctly prevents duplicates of the visible 25; it does not save the invisible rest. |
| **Minimal fix** | Page with `pageToken` until exhausted; persist processed Gmail `id`s (table or label move). If label-move is required, escalate scope beyond readonly **or** use Gmail History API + stored historyId. |

**Evidence (FAKT):**

```118:124:apps/crm/src/lib/inbound/gmail-pull.ts
export function gmailListUrl(labelId: string): string {
  ...
  u.searchParams.set("maxResults", "25");
  return u.toString();
}
```

No `pageToken` loop in `runGmailInboundPull` (lines 183–216).

---

## 4. HIGH — Matching recalculate: DELETE all + silent 500-row truncation

| | |
|---|---|
| **Paths** | `apps/crm/src/lib/matching-store.ts` (`recalculateAllMatches`, `recalculateMatchesForLead`, `recalculateMatchesForProperty`); `apps/crm/src/lib/leads-store.ts` / `properties-store.ts` (`LEADS_LIST_MAX` / `PROPERTIES_LIST_MAX` = 500) |
| **Root cause** | Recalculate deletes match rows then rebuilds from `listLeads()` / `listProperties()` with **default page = 500 max** and no pagination loop. Agents/cron with >500 leads or properties recompute only the first page. Distinct from #444 (unscoped client); **survives** a pure scope fix. |
| **Trigger** | Agency with >500 leads **or** >500 properties runs “Prepočítať matching” / daily match cron (`ai/matching-engine`). Smolko historically ~451 leads — near the cliff. |
| **Impact** | Matches for leads/properties beyond the first 500 are deleted and not reinserted → silent match data loss / empty recommendations for “invisible” inventory. |
| **Minimal fix** | Before delete: count rows; if `> LIST_MAX`, fail closed or page-all into memory. Prefer paginated delete+insert per entity batch keyed by `agency_id`. |

**Evidence (FAKT):**

```100:103:apps/crm/src/lib/leads-store.ts
export function resolveLeadListPage(page?: LeadListPage): { limit: number; offset: number } {
  const limit = Math.min(Math.max(page?.limit ?? LEADS_LIST_MAX, 1), LEADS_LIST_MAX);
```

```488:493:apps/crm/src/lib/matching-store.ts
  const [leads, properties] = await Promise.all([listLeads(), listProperties()]);
  ...
  Promise.resolve(supabase.from("lead_property_matches").delete().not("id", "is", null))
```

---

## Checked clean / not re-filed

| Area | Result |
|------|--------|
| Credits RMW concurrent top-up / cycle | Residual of **#370** / expire guard **#452** — not re-filed |
| Billing webhook ACK-before-fulfill (pricing) | Fixed for top-up ledger rollback + route 500 (#401); **grant path still broken** (finding 2) |
| Acquisition sync persist flag | Default-off; upserts gated; no flag-on corruption found in persist layer |
| `.ilike(` email wildcards | Auth path fixed (#427 merged). Onboarding checklist ILIKE remains under **#459** |
| Properties/leads PATCH null wipe (UI) | Property edit sends full defined form; store skips `undefined`. No new #398-class UI trigger found |
| Gmail duplicate leads | Content `dedupKey` + claim/release (#456) OK for the messages that are actually listed |
| `spend_credits` RPC | Atomic path — OK |

---

## Kontrolór (adversarial)

| Claim | Label | Verdict |
|-------|--------|---------|
| Empty agencyId reaches Stripe metadata | FAKT (source) | PASS |
| Webhook fails closed on missing agencyId → 500 | FAKT (#401 + route) | PASS |
| Grant ledger orphan without balance update | FAKT (asymmetric vs top-up) | PASS |
| Gmail list capped at 25, no pageToken | FAKT | PASS |
| Matching uses uncapped list helpers that hard-cap 500 then delete | FAKT | PASS |
| Prod currently has >25 labeled Gmail msgs / >500 leads | NEZNÁME (no live DB probe this run) | FLAG — trigger is still concrete when thresholds hit |

---

## Next task (GO gate)

**GO FIX-CHECKOUT-AGENCY-ID** — refuse seat/top-up checkout when `profiles.agency_id` is null (finding 1); smallest blast radius, unblocks paid path.

Do **not** combine with grant-orphan fix (finding 2) in the same PR (1 PR = 1 logical change).
