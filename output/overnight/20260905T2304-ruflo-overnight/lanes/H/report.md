# Lane H — Technical adversary review (independent opponent)

**RUN_ID:** `20260905T2304-ruflo-overnight`  
**BASE_SHA:** `cf3604613cdbb6a7a279e175f2c792fb25591461`  
**Role:** W4 technical opponent — read F+G (+ D model, A paths, C portals). No edits to author lanes. No amendments (Lane K owns repairs).  
**Reviewed at (UTC):** 2026-09-05T21:35:00Z (approx.)

## Verdict: STOP

Critical security-design defect: phone value-release is specified as an application-route audit while **CODE_PRESENT** list/select paths already return plaintext phones, and the proposed model does **not** close direct authenticated PostgREST/SELECT bypass. This cannot be averaged into PASS by strong backlog hygiene elsewhere. Treat D8 / BO-P2 as **not acceptably specified** for multi-tenant or PII-touching pilot GO until Lane K amends. Research artifacts stay frozen; do not elevate overnight package to implementation-ready on tenant/PII grounds.

Secondary: tenant `agency_id IS NULL` bypass exists on **leads** as well as properties; G’s freeze BO under-names leads. Export delete/retry/ordering specs are directionally sound but mismatched to UC full-file cadence; correctly blocked pending vendor. F↔G schedule is feasible **only** for cut-scope without portals and only after CRITICAL phone/tenant conditions are amended.

---

## Decision Contract

### 1. Decisions

| ID | Decision | Why | Change condition |
|---|---|---|---|
| H1 | **Verdict STOP** on accepting F+G(+D) as security-complete for implementation / multi-tenant pilot GO. | CRITICAL phone-audit bypass path remains open in design + present code. Kontrolór: unverified/incomplete personal-data control = STOP; no averaging. | K amends D8/BO-P2 with DB-enforced reveal-only path + strip existing selects; H (or sequential follow-up) re-reviews CRITICAL items PASS. |
| H2 | **Do not GO BO-P2 / pilot PII UI** on current text. | Fail-closed app route alone ≠ fail-closed system if JWT can `select owner_phone`. | Amended invariant + acceptance tests include direct-client denial. |
| H3 | **BO-P1 must explicitly cover `leads_tenant` (and dependent policies), not only `properties_tenant`.** | Same `agency_id IS NULL` pattern verified on leads; orphan/NULL rows are cross-tenant readable. | P1 write-up lists every production-bound table with NULL bypass + backfill plan. |
| H4 | **Keep P5/P6 BLOCKED**; do not invent delete/unpublish semantics. | Lane C: deactivate vs delete rules missing; UC Import public cadence is full inventory ~12h, not proven per-listing API. | Vendor package + cadence/auth semantics confirmed. |
| H5 | **Cut-scope schedule F(4w pilot) + G(~2–3w eng) is conditionally feasible** after CRITICAL amendments; portal path is not on critical path (good). | F excludes outbound publish; G critical path omits P5/P6. Metric instrumentation BO still thin. | Add attempt-logging acceptance under P3/P4 or explicit ops manual tally; phone/tenant STOP cleared. |
| H6 | Stack/reuse posture (Next/Supabase, no Nest/BullMQ Phase 1, MapLibre) — **no technical objection** for research. | Aligns with A package.json evidence and D alternatives. | Measured cron failure or map product gap (D reopen_if). |

### 2. Evidence

| Claim | Path / section | Snapshot evidence |
|---|---|---|
| Properties RLS NULL bypass | `apps/crm/supabase/migrations/20260508180000_rls_properties.sql` @ BASE_SHA; D5; G BO-P1 | `USING`/`WITH CHECK`: `agency_id IS NULL OR … profile_agencies_for_auth()` |
| Leads RLS NULL bypass | `apps/crm/supabase/migrations/20260507160000_rls_leads_activities.sql` @ BASE_SHA | Policy `leads_tenant` identical NULL OR pattern; activities policies inherit via lead |
| Phone in list/select CODE_PRESENT | `apps/crm/src/lib/properties-store.ts` @ BASE_SHA ~L100–103, map ~L173–176 | `PROPERTIES_SELECT_CORE` includes `broker_phone`; `FULL` adds `owner_phone` |
| Inventory API returns phones | `apps/crm/src/app/api/leads/inventory/route.ts` @ BASE_SHA ~L77 | Select string includes `owner_phone`, `broker_phone` |
| Phone audit GAP | Lane A capability matrix “Phone audit”; D8; G BO-P2 | A: GAP/WEAK; D proposes `phone_value_releases` fail-closed; not CODE_PRESENT |
| ai_action_audit ≠ phone release | D8; G BO-P2; `apps/crm/src/lib/ai-action-audit.ts` | Correctly rejected as substitute |
| Export model | D9; C §3.1 / §6 | D: snapshots/outbox/unpublish/stale guard; C: UC Import validation + **12h full inventory** cadence; delete rules **missing vendor** |
| P5/P6 blocked | G BO-P5/P6; C gap “no outbound module” | Correct |
| Pilot no publish promise | F11; F result conditions | Aligns with C/G |
| Anon activities insert dropped later | `20260904150000_drop_open_anon_policies.sql` | Drops `activities_anon_insert` — do not treat 20260507 anon insert as current residual without late-chain read (A anti-false-alarm OK) |

### 3. Assumptions

1. Overnight scope remains `research_and_specs` — no app code shipped this run (G1).  
2. Pilot may be single-agency initially, but RLS must still be correct before second tenant / design-partner multi-tenant.  
3. Supabase authenticated clients can query tables granted to `authenticated` unless column privileges / views / security-definer narrow them (standard PostgREST threat model).  
4. Lane K will perform the single amendment cycle; this lane does not write `amendments/`.

### 4. Unknowns

| Unknown | Who | Blocks |
|---|---|---|
| Live prod apply of late RLS / residual NULL rows | Ops / founder | Claiming prod tenant isolation |
| Whether founder requires phone audit before Cohort 1 | Founder / legal (F unknown) | Pilot start date vs eng critical path |
| UC Import: incremental vs full-file authoritative semantics | Vendor | P5 job model shape |
| Attempt-logging field already sufficient for F8 metric | Product / eng | Need for extra BO vs manual tally |

### 5. Experiments

1. **Direct-client phone SELECT (impl / after K amend):** authenticated supabase-js `from('properties').select('owner_phone')` must return empty/error; only reveal RPC/route returns plaintext after audit insert. Stop if any list path still hydrates phones.  
2. **NULL-agency cross-tenant:** seed `agency_id IS NULL` property + lead; second agency JWT must see 0 rows after P1 tighten.  
3. **Outbox vs full-file (when UC unlocked):** publish v1 then v2 under 12h file cadence; assert portal never shows stale v1 after v2 accepted (D experiment 3 + C cadence).

### 6. Product Implications

| Area | Reuse / keep | Change required (via K, not H) | Defer |
|---|---|---|---|
| Tenant | agencies/profiles guards CODE_PRESENT | Widen P1 to leads (+ dependents); remove NULL bypass post-backfill | Prod-ready claim without dump |
| Phone | fields exist | Strip selects; DB-enforced reveal; BO-P2 rewrite | CDR/Twilio unless founder expands |
| Portal export | inbound only | Keep BLOCKED; rethink outbox vs 12h full file at unlock | Multi-portal publish in pilot pitch |
| Pilot GTM | F plan OK commercially-adjacent | Eng GO after STOP cleared; instrument attempt timestamps | Portal-led segment |
| Schedule | G DAG collision matrix sound | Explicit metric logging owner | Compressing P1–P8 under unresolved CRITICAL |

### 7. Decision Memory Payload (DRAFT — do not write canonical memory)

```text
date: 2026-09-05
source: ruflo-overnight lane H
run_id: 20260905T2304-ruflo-overnight
base_sha: cf3604613cdbb6a7a279e175f2c792fb25591461
decision: STOP — phone value-release design incomplete (app audit without closing PostgREST/select; CODE_PRESENT already returns phones). Tenant NULL bypass on leads under-scoped in BO-P1 vs properties-only wording. Export P5/P6 correctly blocked; F/G cut-scope schedule OK only after CRITICAL amendments.
status: DRAFT_FOR_MORNING_INTEGRATION
reopen_if:
  - K amends D8/BO-P2 with DB-enforced reveal-only + select strip; re-review PASS
  - P1 explicitly covers leads_tenant + dependents
  - UC vendor clarifies full-file vs per-listing publish
```

---

## Findings (adversary)

### F-H1 — CRITICAL — Phone audit bypass (design + present code)

| Field | Content |
|---|---|
| **Severity** | CRITICAL |
| **Path / section** | D8; G BO-P2 acceptance; `apps/crm/src/lib/properties-store.ts` (`PROPERTIES_SELECT_CORE`/`FULL`); `apps/crm/src/app/api/leads/inventory/route.ts` select list |
| **Evidence** | (1) CORE select includes `broker_phone`; FULL includes `owner_phone`; mappers expose `ownerPhone`/`brokerPhone`. (2) Inventory API selects `owner_phone`,`broker_phone` without audit. (3) D8 requires audit-before-return on a *dedicated* route and fail-closed insert, but never requires revoking authenticated SELECT on phone columns, masking views, or security-definer-only reveal. (4) G P2 acceptance tests cite “list/summary APIs omit full phones” — API-layer only. |
| **Impact** | Shipping BO-P2 as written can create a **compliance theater**: UI uses audited reveal while any authenticated client (or overlooked API) still reads plaintext. Existing product already leaks phones on common reads. Multi-tenant + PII → unacceptable for pilot GO. |
| **Concrete fix (for K, not applied here)** | Amend D8/BO-P2: (a) remove phone columns from all list/summary/store selects; (b) `REVOKE` column SELECT from `authenticated` **or** expose phones only via `SECURITY DEFINER` function that inserts `phone_value_releases` in same TX then returns value; (c) deny export/CSV without per-value audit; (d) keep fail-closed on audit insert failure; (e) explicitly forbid treating `ai_action_audit`/LEAD_UNLOCK as sufficient (already stated — keep). |
| **Verification** | Harness: authenticated JWT `select('owner_phone')` denied; reveal route with forced audit failure returns no plaintext; cross-tenant reveal denied; rg shows no `owner_phone`/`broker_phone` in list selects outside reveal module. |

### F-H2 — HIGH — Tenant NULL-agency bypass under-scoped (leads + properties)

| Field | Content |
|---|---|
| **Severity** | HIGH |
| **Path / section** | D5 (properties example); Conditions; G BO-P1; migrations `20260508180000_rls_properties.sql`, `20260507160000_rls_leads_activities.sql` |
| **Evidence** | Verified at BASE_SHA: both `properties_tenant` and `leads_tenant` allow `agency_id IS NULL`. Activities policies follow lead NULL. D says tighten “production-bound tables” but exemplifies properties; **G BO-P1 names only `properties_tenant` NULL bypass** while acceptance vaguely says properties/leads denial. |
| **Impact** | Orphan/NULL-tenant rows readable/writable across agencies → **tenant leak**. Fixing only properties leaves leads (primary pilot object for F8) exposed. |
| **Concrete fix** | K amend BO-P1: inventory all policies with `agency_id IS NULL`; backfill; then drop bypass on properties **and** leads (and rewrite activities predicates); verification fixtures for both. |
| **Verification** | Cross-tenant JWT sees 0 NULL-agency leads/properties; WITH CHECK rejects NULL agency writes after freeze. |

### F-H3 — HIGH — Export delete / retry / ordering vs UC full-file reality

| Field | Content |
|---|---|
| **Severity** | HIGH (for portal path); **mitigated** by G BLOCKED on P5/P6 |
| **Path / section** | D9 behaviors; C §3.1 cadence “12 hours” full inventory; C §6 item 6 deactivate vs delete unknown; G BO-P5/P6 |
| **Evidence** | D models per-listing outbox with `ordered_after`, lease, monotonic snapshot, unpublish job. C public UC Import docs describe **full inventory file** cadence ~12h and do **not** document per-listing delete API semantics. `ordered_after` / multi-worker lease algorithm underspecified (field named, claim protocol not). |
| **Impact** | If someone unblocks P5 early, engineering may build wrong job shape (incremental API vs full replace) and wrong delete semantics → stale/live listing skew, duplicate externals, unsafe unpublish. |
| **Concrete fix** | Keep BLOCKED until vendor confirms: pull/auth, whether full-file is SSOT, delete/deactivate codes, ack/URL semantics. Then either: (A) adapt D9 to “generate immutable full snapshot feed + replace” with ordering = feed generation clock, or (B) document true per-listing API. Specify lease claim SQL (`FOR UPDATE SKIP LOCKED`), idempotency, and reject older `snapshot_version`. |
| **Verification** | Contract tests vs vendor package; reverse-completion test (D exp 3); no outbound code until checklist green. |

### F-H4 — MEDIUM — Schedule feasibility (F pilot vs G eng) with metric gap

| Field | Content |
|---|---|
| **Severity** | MEDIUM |
| **Path / section** | F7–F8 (4-week pilot, `lead_first_attempt_latency_hours`); G DAG critical path `GO→P1→(P2∥P3)→P4→P7→P8` ~2–3 weeks; G has **0** “attempt logging” BO text |
| **Evidence** | F primary metric needs trustworthy attempt timestamps weeks 2–4. G cut-scope omits portals (good). F unknown: phone audit before pilot. No G BO owns attempt-logging UX. |
| **Impact** | Eng can finish P1–P8 calendar-wise for cut-scope, but **STOP on F-H1/H2** may slide Cohort 1; without logging, F8 becomes manual/unreliable → false kill/pass on pilot. |
| **Concrete fix** | After CRITICAL clear: either add explicit acceptance under P4/P3 for attempt timestamp capture on lead activity, or document Week-0..4 **manual tally protocol** as temporary (F already allows manual). Do not start multi-tenant Cohort until P1 leads+properties NULL bypass removed. |
| **Verification** | Dry-run: create lead → log attempt → compute latency in staging; P1/P2 tests green before Cohort 1 seats. |

### F-H5 — LOW — Storage / service_role isolation specified but not BO-backed

| Field | Content |
|---|---|
| **Severity** | LOW (pilot cut-scope) |
| **Path / section** | D5 storage prefix; D10.4 job credential isolation; G collision matrix (no storage BO) |
| **Evidence** | Path `{agency_id}/properties/...` stated; no G task to verify bucket policies / signed URL gates. |
| **Impact** | Media cross-tenant leak if uploads enabled without checks; lower urgency if pilot avoids shared storage uploads. |
| **Concrete fix** | Fold into P1 or P8: storage path + signed URL tests when media upload in scope. |
| **Verification** | Agency A cannot mint signed URL for agency B object key. |

### Non-findings (explicitly OK)

- Rejecting Nest/BullMQ/Mapbox/wholesale shadcn for Phase 1 — consistent with A deps evidence.  
- Contact=leads / Viewing=`scheduled_events` — reuse-aligned; unknowns labeled.  
- F support scope excludes outbound multi-portal publish — matches C/G.  
- Collision matrix + single integrator (P7) — sound process for future code.  
- Anon open policies: late migration drops `activities_anon_insert` — A’s late-chain caution correct; do not STOP on 20260507 anon alone.

---

## Review matrix (required themes)

| Theme | Result | Binding |
|---|---|---|
| Tenant leaks | **FAIL design completeness** (NULL on properties+leads; P1 under-scoped) | HIGH → amend P1; blocks multi-tenant GO |
| Phone audit bypass | **FAIL** (CRITICAL) | STOP until DB-enforced reveal + select strip |
| Export delete/retry/ordering | **CONDITIONAL PASS** as blocked backlog; **FAIL if unblocked** without vendor cadence/delete rules | Keep P5/P6 BLOCKED |
| Schedule feasibility | **CONDITIONAL PASS** cut-scope after STOP clear; metric logging thin | MEDIUM |

---

## Short summary

D/G correctly sequence tenant freeze and phone audit and correctly block outbound portals, but the phone model is not fail-closed at the data plane and current selects already return phones; leads share the NULL-agency RLS hole that G under-names. That is a **STOP** for implementation/security acceptance. Export ordering/delete needs vendor reality (full-file vs outbox) before P5. F’s 4-week cut-scope pilot remains schedulable only after CRITICAL amendments and a clear attempt-logging path for the primary metric.
