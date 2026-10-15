# Critical bug hunt — 2026-10-15

**Head:** `515a8b5b` (`main`)  
**Scope:** behavioral commits after ~2026-10-01; priority paths (billing v2, matching, ghostwriter/confirm-viewing, auto-reply, admin client, signup, BRI/price-trail, prompt-cache, fail-open gates).  
**Excluded (already tracked):** matching wipe (#843), pricing-v2 stale subscription webhook (#845).  
**Method:** read call chains + diffs; Kontrolór (FAKT / dôkaz only).  
**Filter:** data loss, critical-path crash, auth/permission bypass, lost-write races, silent truncation, infinite loops, resource leaks.

## Verdict

**2 high-confidence findings** still present on `main` (neither has an open fix PR).  
No *new* CRITICAL class bug found in post–Oct-14 commits (`#846`–`#851`) above that bar.

---

## FINDING-1 — WP-2 send routes bypass trial / read-only gate

**Confidence:** high  
**Severity:** permission / paywall bypass (externally visible send)  
**Landed with:** `#838` (WP-2) after `#817` closed `canUseFullApp`

### Evidence

- `apps/crm/src/app/api/ghostwriter/send-email/route.ts` — auth + rate-limit + `authorizeSend`, **no** `requireActiveAppAccess` / `requireFeature`.
- `apps/crm/src/app/api/playbook/confirm-viewing/route.ts` — same gap after session + lead resolve.
- Contrast: `apps/crm/src/app/api/outreach/send/route.ts` L29–33 calls `requireFeature("outreach")`, which first runs `requireActiveAppAccess()` (`feature-gating.ts` L37–48).

```ts
// feature-gating.ts — write gate after #817
if (!snapshot.canUseFullApp) {
  throw new Error(/* read-only after trial / canceled plan */);
}
```

`rg requireActiveAppAccess|requireFeature` under `api/ghostwriter` and `api/playbook/confirm-viewing` → **no matches** (verified 2026-10-15).

### Trigger

1. Agency finishes trial → `accessLevelFrom` → `read_only` → `canUseFullApp = false`.
2. `POST /api/outreach/send` → 403.
3. Same session `POST /api/ghostwriter/send-email` or `POST /api/playbook/confirm-viewing` → Resend / `sendMessage` still runs if kill switch is off.

### Impact

Expired / canceled accounts keep sending customer-facing email/SMS on the two paths WP-2 “hardened” for kill switch only — false closure of the write surface.

### Fix sketch (1 PR)

After agency resolve on both routes:

```ts
try {
  await requireFeature("outreach"); // or requireActiveAppAccess()
} catch (e) {
  return /* 403 */;
}
```

Regression: limited snapshot → 403 and no Resend/`sendMessage` call.

---

## FINDING-2 — Expire “repair” absolute write can wipe concurrent purchased credits

**Confidence:** high (code + race is clear); trigger needs partial prior expiry failure  
**Severity:** paid credit data loss  
**Path:** still on `main` (CREDITS-RELAND era); happy-path expire correctly uses `expireGrantCreditsAtomic`

### Evidence

`apps/crm/src/lib/credits/grant-engine.ts` L173–190:

```ts
if (existing.exists) {
  if (toExpire > 0 && !currentGrant.exists) {
    const newTotal = agency.purchased_credits_balance; // from Node snapshot
    await supabase.from("agencies").update({
      grant_credits_balance: 0,
      credits_balance: newTotal, // absolute write — not FOR UPDATE re-read
    }).eq("id", agency.id);
```

Callers load snapshot rows then loop (`monthly-cycle.ts` L65–78; cron `credits-expire`).

Happy path (L211+) correctly uses `expireGrantCreditsAtomic` (FOR UPDATE). Repair intentionally bypasses the RPC.

### Trigger

1. Prior run wrote expiry ledger key but left `grant_credits_balance > 0`.
2. Cron loads agency with `purchased_credits_balance = 80`.
3. Concurrent `apply_credit_purchase` → purchased becomes 180.
4. Repair sets `credits_balance = 80` → **−100 paid credits lost**.

### Impact

Silent disagreement between purchase ledger and `credits_balance` on any agency hitting the repair branch under concurrency — same lost-update class the atomic expire RPC was meant to close.

### Fix sketch (1 PR)

Repair via SQL that re-reads purchased under lock (`credits_balance = purchased_credits_balance`) without binding purchased from the Node snapshot; or a dedicated repair RPC. Test: mutate purchased after snapshot, run repair → balance reflects post-purchase pool.

---

## Scanned — no new CRITICAL above bar

| Area | Result |
|---|---|
| `#843` / `#845` | Still open; not re-investigated |
| `credits-billing-v2` fulfill / checkout | Fail-closed patterns OK outside #845 |
| `matching-store` (non-wipe) | Empty-read guards present; wipe still #843 |
| `inbound/auto-reply` + acquire auto-response | Fail-closed consent (`=== true`); TOCTOU duplicate-send is medium, not new CRITICAL |
| `signup/self-serve` | Flag-off fail-closed; provision after email confirm |
| `#846` BRI / price-trail → `createAdminClient` | SQL balík D **neaplikovaný**; mapa verifies Production `SUPABASE_SERVICE_ROLE_KEY`. Latent footgun: `createAdminClient` still falls back to anon and ignores `SUPABASE_SECRET_KEY` (unlike `createServiceRoleClient` after #831) — not CRITICAL while SERVICE_ROLE is set and D is unapplied |
| `#848` prompt-cache / listing cost | Usage accounting matches Anthropic split (`input` + cache write/read); telemetry only |
| Cron `CRON_SECRET` gates | Fail-closed when unset on sampled routes |
| `getFeatureFlagsForPlan` DEV OVERRIDE all-`true` | Still present (`saas-ops.ts` L144–158) — plan differentiation no-op behind `requireFeature`, but trial write gate itself uses `canUseFullApp`. Related monetization debt; not filed as third CRITICAL here |

---

## Kontrolór

| Claim | Label | Verdict |
|---|---|---|
| Ghostwriter / confirm-viewing lack write gate | FAKT (`rg` + contrast route) | PASS as FINDING-1 |
| Expire repair absolute write | FAKT (source L177–185) | PASS as FINDING-2 |
| #846 breaks PROD BRI today | PREDPOKLAD (needs D-APPLY + missing SERVICE_ROLE) | Not CRITICAL now |
| Prompt-cache double-bills credits | NEZNÁME / unlikely (usage semantics + tests) | No finding |

---

## Next (GO gate)

1. **GO fix FINDING-1** — one PR: attach `requireFeature("outreach")` to both send routes + tests.  
2. Or **GO fix FINDING-2** — one PR: lock-safe expire repair.  
3. Keep merging/reviewing #843 and #845 separately (1 PR = 1 change).
