# Critical bug hunt — deliverability / capture / outreach / gmail / proxy / search / starter-pack

**Branch:** `cursor/critical-bug-management-58c9` @ `2f7cb14c` (main lineage through #917)  
**Scope:** surfaces named in the hunt prompt. Read-only analysis + proxy proof.  
**Skipped (already tracked):** outreach `fetchLeadAgencyId` → `SYSTEM_USAGE_AGENCY_ID` (#923); gmail `markError` ciphertext (#911); gmail `markPulled` resurrect (#902).

## Verdict

**One NEW CRITICAL** (correctness / paid fulfillment). Other named surfaces: no new critical auth-bypass / forge / cross-tenant write at this bar.

## NEW CRITICAL

### 1. Starter-pack download link never reaches token auth — proxy session gate

| | |
|---|---|
| **Where** | `apps/crm/src/proxy.ts:6-54` (`PUBLIC_PATHS` omits download); `apps/crm/src/app/api/starter-pack/download/route.ts:6-15` (token is the only intended auth); `apps/crm/src/lib/starter-pack/fulfillment.ts:84-87` (email CTA) |
| **Trigger** | Purchaser (often **not** a Revolis user yet) opens the emailed `GET /api/starter-pack/download?token=…` in a logged-out browser. |
| **Impact** | Proxy returns **401** `{ ok:false, error:"Unauthorized" }` **before** `verifyStarterPackDownloadToken`. Paid HTML bundle is unreachable via the designed fulfillment path. Credit code in the same email still works after registration; the download CTA does not. |
| **Confidence** | **high** — reproduced with `proxy()` + anon `getUser()` → status 401 (log: `/opt/cursor/artifacts/starter-pack-proxy-401.log`). Route unit tests never exercise the proxy gate. |

**Why critical (vs prior “non-critical” note):** fulfillment copy tells buyers to download the pack **and then** register with the credit code (`fulfillment.ts` ~90–92). Token verification on the route is fail-closed and purchase-checked; the session gate makes that design dead for anonymous mail clients.

**Fix shape (not in this hunt):** add exact `"/api/starter-pack/download"` to `PUBLIC_PATHS` + proxy verification test (same pattern as deliverability publics). Do **not** widen to a prefix.

## Cleared at CRITICAL bar (this pass)

| Surface | Result |
|---|---|
| `public-capture` / `capture-lead` | Server injects `DEMO_CAPTURE_API_KEY`; capture-lead 401/503 without key; writes `leads_demo` only (no agency_id write). Rate-limit fail-open → spam risk, not cross-tenant CRM write. |
| `unsubscribe` / `unsubscribe-token` | HMAC fail-closed; GET does not write; invalid/forged token → same invalid page. |
| `resend-webhook` / `suppression` | Signature required (503 without secret); hard-bounce Permanent-only; global suppress on bounce/complaint. |
| `sendApprovedOutreach` suppression | **Fail-closed** on missing admin client / lookup error / missing unsub secret. Wrong-agency when `fetchLeadAgencyId` null → **#923** (skipped). |
| gmail connect-store / pull | No new race beyond #902/#911; acquire dedup claims before insert. |
| `proxy.ts` allowlist | Exact-path publics; siblings stay 401 (deliverability tests green). No accidental auth’d API opened in this set. `/api/agents` prefix still HMAC/cron-gated in handlers. |
| `search/semantic` | Session required; RPC candidates via admin then **agency_id** filter on session client; no agency → throw → ILIKE+RLS. |

## Non-critical notes (not filed)

- `rateLimit` fail-open when service role/RPC unavailable (`rate-limit.ts`) — documented on public-capture.
- Semantic ILIKE builds `.or(\`…${pattern}\`)` — PostgREST meta-char risk mitigated by RLS (tenant-scoped), not cross-tenant P0.
- Starter-pack HMAC may fall back to `STRIPE_WEBHOOK_SECRET`; prod rejects known-dev secret when neither secret is set.

## Evidence

- Proxy proof (anon download → 401): artifact log from vitest against `proxy()`.
- Existing: `apps/crm/src/proxy-deliverability-public.test.ts` (19 PASS) — publics exact, siblings gated.
