# Critical bug hunt — focus 6 areas

> Head: `626748f0` (`main` / `cursor/critical-bug-management-4032`).  
> Read-only audit. No code fix in this report.  
> Already tracked (do not re-open): #843, #845, #859, #877.

## Verdict

**2 NEW CRITICAL** (not in #843/#845/#859/#877).  
Areas 2, 5, 6 and Bod 10 beyond #877: no new critical on this pass.

---

## CRITICAL 1 — WP-2 send routes skip trial / billing write-gate

**Wrong billing access:** expired trial (`limited` → `read_only`) can still send third-party email/SMS.

| File | Line | Fact |
|------|------|------|
| `apps/crm/src/app/api/ghostwriter/send-email/route.ts` | 20–91 | Auth + `authorizeSend` + Resend; **zero** `requireActiveAppAccess` / `requireFeature` |
| `apps/crm/src/app/api/playbook/confirm-viewing/route.ts` | 38–170 | Auth + `authorizeSend` + `sendMessage`; **zero** trial gate |
| `apps/crm/src/lib/control-plane/authorize-send.ts` | 32–58 | Kill switch + human approval only — **not** billing |
| `apps/crm/src/lib/feature-gating.ts` | 37–47 | Gate exists and throws when `!canUseFullApp` |
| `apps/crm/src/lib/saas-ops.ts` | 395–402, 557–558 | Expired trial → `limited` → `canUseFullApp === false` |
| Contrast: `apps/crm/src/app/api/outreach/send/route.ts` | 30 | `await requireFeature("outreach")` — blocked correctly |

**Trigger**

1. Broker with expired trial, no Stripe sub, `paysOutsideStripe === false` → `trialGrace.state === "limited"`.
2. `POST /api/ghostwriter/send-email` with valid session + `recipientEmail` + `letterHtml` → Resend still sends.
3. Or `POST /api/playbook/confirm-viewing` with real `leadId` → email/SMS still sends.

**Status:** Live on `main`. Side-branch audit `5aef6903` never landed on main / no fix PR. Not in tracked list.

**Minimal fix (not applied):** `await requireActiveAppAccess()` (or `requireFeature("outreach"|"communicationHub")`) near top of both handlers → 403 when read-only.

---

## CRITICAL 2 — SECURITY DEFINER balík D still open on PROD

**Auth bypass / data corruption:** `ce2be49a` (#846) moved callers to service-role clients, but **SQL REVOKE was never applied**.

| File | Line | Fact |
|------|------|------|
| `docs/ops/prod-packages/secdef-callers-close/mapa-ciest.md` | 3 | Explicit: **SQL NEAPLIKOVANÉ**; needs `GO D-APPLY` |
| `docs/ops/prod-packages/secdef-callers-close/apply.sql` | 35–55 | Would REVOKE EXECUTE from `PUBLIC, anon, authenticated` on 7 RPCs |
| `apps/crm/supabase/migrations/20261001160500_tenant_isolation_wall.sql` | 9–12 | Wall **intentionally left** these callable (caller still session/anon then) |
| Callers now: `apps/crm/src/lib/bri/engine.ts` | 23–32 | `createAdminClient().rpc('compute_bri_score_v2')` |
| | `apps/crm/src/lib/events/bri-score.ts` | 69–75 | same pattern |
| | `apps/crm/src/lib/price-trail/engine.ts` | 22–34 | `add_price_point` |
| | `apps/crm/src/app/api/morning-brief/track/{open,click}/route.ts` | 15–18 | `record_brief_*` |
| | `apps/crm/src/app/api/cron/{arbitrage-scan,bri-snapshot}/route.ts` | expire / rotate |

**Trigger**

While balík D is unapplied, anyone holding the **public anon key** (`NEXT_PUBLIC_SUPABASE_ANON_KEY` / publishable) can call PostgREST:

- `POST /rest/v1/rpc/expire_arbitrage_matches` — wipe/expire matches globally  
- `POST /rest/v1/rpc/rotate_bri_snapshots` — mutate score snapshots  
- `POST /rest/v1/rpc/compute_bri_score` / `compute_bri_score_v2` with arbitrary `p_lead_id` / `p_profile_id` — write `lead_scores` / history  
- `POST /rest/v1/rpc/add_price_point` — write price trail under any `p_profile_id`  
- `record_brief_open` / `record_brief_click` — forge engagement  

No user JWT required beyond the public apikey.

**Related latent (not raised to CRITICAL this pass):** `createAdminClient` in `apps/crm/src/lib/supabase/server.ts:18–20` falls back to the **anon** key (`getKey()`), unlike `createServiceRoleClient` which also accepts `SUPABASE_SECRET_KEY` and returns `null` if missing. Safe today only because PROD has `SUPABASE_SERVICE_ROLE_KEY`; after `GO D-APPLY`, a SECRET_KEY-only env would silently break all balík-D callers.

**Status:** Incomplete remediation of #846. Needs founder `GO D-APPLY` (after verifying service-role on all callers) — not a code PR alone.

---

## Cleared / below bar (this pass)

| Area | Commit | Result |
|------|--------|--------|
| Bod 10 trial/billing | `4417cf6b` | No **new** critical beyond #877. `past_due` still missing from `ENDED_SUBSCRIPTION_STATES` (`saas-ops.ts:271`) — covered by #877. Stripe-sub precedence over `paysOutsideStripe` when `hasSubscription:true` is **intentional** (`trial-no-card.test.ts:151–158`). |
| Ghostwriter ownership | `4a9dd312` | Stamp path removed; send route no longer writes `ghostwriter_letters` (`send-email/route.ts:154–157` + ownership test). No new ownership fail-open. |
| Morning brief settings | `8aeec77e` | `profile_id` from `auth.uid()` only (`settings/route.ts:61–76, 128`); body cannot supply foreign id (test locks this). |
| Inbound `lead_created` | `30e888de` | Fail-soft `logEvent` via service-role (`acquire/email/route.ts:457–493`). Fallback profile is same-agency only — data quality, not cross-tenant critical. |

---

## Not re-reported

- #843 matching wipe  
- #845 pricing-v2 stale webhook  
- #859 grant expire CAS  
- #877 `past_due` → false `paysOutsideStripe`  

---

## Evidence commands (this turn)

```bash
rg -n 'requireActiveAppAccess|requireFeature|feature-gating' \
  apps/crm/src/app/api/ghostwriter/send-email/route.ts \
  apps/crm/src/app/api/playbook/confirm-viewing/route.ts
# → no matches

rg -n 'NEAPLIKOVANÉ|NEAPLIKOVAŤ' docs/ops/prod-packages/secdef-callers-close/
# → mapa + apply.sql still require GO D-APPLY

gh pr list --search 'trial-gate-send-route OR requireActiveAppAccess ghostwriter' --state all
# → no fix PR for CRITICAL 1
```
