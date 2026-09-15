# Lane G — Implementation backlog (specs only)

- **RUN_ID:** `20260905T2304-ruflo-overnight`
- **Lane:** G (W3)
- **BASE_SHA:** `cf3604613cdbb6a7a279e175f2c792fb25591461`
- **Depends on (frozen):** lanes D, E (+ A for evidence paths; C for portal gate)
- **Scope:** research_and_specs only — **no app code edits tonight**
- **Status:** `PASS_WITH_CONDITIONS`
- **Accessed:** 2026-09-05

## Executive summary

Translate D+E into a **2–3 week pilot backlog** for evolving the existing Next/Supabase CRM. **Default cut when UC outbound is unavailable:** ship tenant/RLS freeze, phone value-release audit, property field honesty, pilot onboarding reuse, and E2E/RLS harness — **defer portal publish**. Pricing stays HYPOTHESIS 355 EUR (Lane E); no billing SKU code changes in this backlog.

**Future impl order (hard):** (1) schema/tenant freeze → (2) security/data primitives → (3) parallel UI/adapters only after contracts → (4) single integrator for routes/migrations/lockfile/shared types → (5) E2E/RLS/portal contract tests.

---

## Decision Contract

### 1. Decisions

| ID | Decision | Why | Change condition |
|---|---|---|---|
| G1 | **No code tonight.** This lane proposes BOs only. | START-HERE default `research_and_specs`; hard limit no app edits. | New founder GO with explicit implementation scope. |
| G2 | **Pilot cut without portals:** BO-P1…P4 + P7–P8 + ops P9. **BO-P5/P6 blocked** until UC package+activation (Lane C). | Lane C: outbound UC Import vendor-gated; inventing XSD/endpoints forbidden. Lane E support scope already excludes multi-portal publish. | Vendor delivers schema+credentials+sandbox; then open P5→P6 under same integrator rules. |
| G3 | **Impl order fixed as waves W-G1…W-G5** below. | Collision-safe: schema first, security primitives next, UI/adapters after contracts, one integrator for shared surfaces, tests last. | Reopen only if prod schema dump contradicts A/D tenant assumptions. |
| G4 | **Reject Nest / BullMQ / Mapbox / wholesale shadcn** in pilot BOs. | Lane D decisions D1–D4. | Measured cron timeout or map product gap. |
| G5 | **Commercial posture: VALIDATE_FIRST.** Pilot price 355 = HYPOTHESIS; outcome pricing deferred. | Lane E Q1/WTP unproven; backOFFICE steelman; Constitution Q1→max VALIDATE if unpaid. | Paid pilot month + convert discussion (E pass signal). |
| G6 | **SQL migrations: never parallel-edit the same object.** Adapter lanes own only their modules+fixtures — never shared export endpoint / lockfile / route registry. | START-HERE Lane G + Engineering Constitution integrator rule. | N/A — process invariant. |

### 2. Evidence

| Claim | Path / source |
|---|---|
| Tenant core + RLS | Lane A matrix; `apps/crm/supabase/migrations/20260310_baseline_core_schema.sql`; `20260508180000_rls_properties.sql`; profile guards `20260830231500_*`, `20260831233000_*` |
| Phone audit GAP | Lane A; `ai_action_audit` ≠ phone value release (`20260610000001_ai_action_audit.sql`); call-analyzer tests ≠ CDR |
| Property UC columns ahead of API Zod | Lane D; `20260617120000_uc_export_mapper.sql`; `apps/crm/src/lib/properties-store.ts`; `apps/crm/src/app/api/properties/route.ts` |
| Jobs / cron reuse | `20260608120000_universal_crm_import.sql`; `apps/crm/src/app/api/cron/**` |
| Viewings | `20260527143000_event_scheduler_phase1.sql`; `apps/crm/src/lib/scheduled-events/store.ts` |
| Onboarding surface present | `apps/crm/src/app/api/onboarding/goals/route.ts`; `apps/crm/src/app/api/enterprise/onboard-start/route.ts`; `apps/crm/src/app/(dashboard)/system/csm-onboarding/page.tsx` |
| Billing SSOT / Stripe PROD_UNKNOWN | `program-tier-pricing.ts`; `pricing-v1.md`; `apps/crm/src/app/api/billing/**`; Lane A/E |
| Portal outbound blocked | Lane C report/result; inbound Realsoft/UC API trees present; scrape ≠ export (`PortalNehnutelnostiSource.ts`) |
| Architecture choices | Lane D D1–D10 |
| Pilot hypothesis 355 | Lane E |

### 3. Assumptions

1. Founder will issue a separate GO before any BO starts.
2. ICP 5–20 brokers remains a START-HERE hypothesis.
3. Brokers accept leads-as-contacts for pilot UX (Lane A/D unknown if not).
4. BASE_SHA migration chain is CI truth; prod apply still PROD_UNKNOWN.
5. Manual invoice path acceptable until Stripe PROD verified (Lane E).

### 4. Unknowns

| Unknown | Owner | Blocks |
|---|---|---|
| Prod/Smolko migration apply + live RLS residual | Ops / founder | Claiming P1 “prod-ready” |
| UC Import package, credentials, XSD/OpenAPI, sandbox | Vendor / founder | BO-P5 / BO-P6 |
| Phone CDR vs value-release requirement | Founder / legal / client | Expanding P2 beyond value-release |
| `scheduled_events` real usage | Product | Viewing UI priority beyond reuse |
| Stripe Production `price_*` wiring | Billing owner | Self-serve checkout claims |
| WTP / paid convert for 355 HYPOTHESIS | Founder + Lane F | Permanent SKU changes |
| Whether Owner Cockpit attach needed for pilot perception | Founder | Offer packaging only (not eng BO) |

### 5. Experiments

1. **After GO — first PR only BO-P1** (tenant/RLS freeze + verification). Stop if prod schema parity fails.
2. **Phone fail-closed harness (P2):** force audit insert fail → API must not return plaintext. Metric: 0 leaks in harness.
3. **Portal held:** no outbound adapter experiment until UC validation POST with vendor schema succeeds (Lane C).
4. **Commercial:** EXP-E1 (4-week Team×5 @ 355) owned by F/ops — eng backlog does not encode price into `program-tier-pricing.ts`.

### 6. Product Implications

| Area | Reuse | Change (after GO) | Defer / cut |
|---|---|---|---|
| Stack | Next + Supabase + MapLibre | — | Nest, BullMQ, Mapbox, shadcn redesign |
| Tenant | agencies/profiles RLS | Tighten NULL agency bypass; verification | Parallel orgs |
| Phone | — | `phone_value_releases` + reveal route | Full CDR telephony stack unless required |
| Property | UC columns + store | Zod create/update + specs unions | Invented portal fields |
| Portals | inbound Realsoft/UC | Outbound only after UC unlock | Scrape-as-publish; multi-brand fan-out |
| Money | pricing TS + credits | Ops Stripe verify; manual invoice | Outcome fee; code price changes |
| Onboarding | existing onboarding APIs/UI | Checklist for pilot agencies | Custom integrations |

### 7. Decision Memory Payload (DRAFT — do not write canonical memory)

```text
date: 2026-09-05
source: ruflo-overnight lane G
run_id: 20260905T2304-ruflo-overnight
base_sha: cf3604613cdbb6a7a279e175f2c792fb25591461
decision: Spec-only 2-3wk pilot backlog P1-P9. Order W-G1..W-G5. Portal publish P5/P6 BLOCKED on UC. Default cut = tenant+phone+property honesty+onboarding+E2E. VALIDATE_FIRST; 355 HYPOTHESIS untouched in code. No Nest/BullMQ/Mapbox/shadcn. Single integrator for shared surfaces.
status: DRAFT_FOR_MORNING_INTEGRATION
reopen_if:
  - UC package arrives (promote P5/P6)
  - prod schema contradicts A/D
  - founder requires phone CDR beyond value-release
  - founder rejects leads-as-contacts
```

---

## Constitution 12Q (honest — no inflated unknowns)

Scored for **pilot eng package without outbound portals** (the cut scope). Scale 0–1 per question; unknowns stay mid/low, not fake 1.0.

| # | Question | Score | Note |
|---:|---|---:|---|
| 1 | Would today's client pay? | **0.4** | UNKNOWN WTP; E steelman says list looks expensive vs backOFFICE. **VETO ceiling → VALIDATE** until paid signal. |
| 2 | Client earns more in 90d? | **0.3** | Unproven; CRM workflow hypothesis only. |
| 3 | Shortens Lead→…→Commission? | **0.5** | Tenant+phone+listing honesty can reduce friction; no attribution proof. |
| 4 | Strengthens moat? | **0.4** | Reliability primitives yes; moat thin without publish loop. |
| 5 | Flywheel? | **0.3** | Weak without portal truth + usage data. |
| 6 | Unique data? | **0.2** | Phone audit / tenant events are hygiene, not unique market data. |
| 7 | Highest ROI in backlog? | **0.6** | Among eng options, unblocking pilot safety > greenfield. |
| 8 | Right time? | **0.5 cut / 0.2 portal** | Cut scope = OK to VALIDATE. **Outbound portal = "too early" without UC → VETO BACKLOG** regardless of other scores. |
| 9 | MVP < 2 weeks? | **0.6** | P1–P4 plausible in 2 weeks if single-threaded; full 3 weeks with tests. |
| 10 | Founder traps? | **0.5** | Risk: building publish fantasy / pricing ego — mitigated by cut + HYPOTHESIS label. |
| 11 | Best use of founder time? | **0.4** | Eng GO after F discovery better than coding price. |
| 12 | Only thing this quarter? | **0.3** | Not the single bet; VALIDATE reliability under pilot. |

**Aggregate (cut scope):** ~4.5–5.5 / 12 → **VALIDATE / BACKLOG edge**, with **Q1 VETO → max VALIDATE**.  
**Portal publish alone:** Q8 too early → **Strategic Backlog** until vendor unlock (do not BUILD).

---

## Scope cut matrix (portals unavailable)

| Include in 2–3wk pilot | Defer until UC unlock | Never in this pilot |
|---|---|---|
| P1 Tenant/RLS freeze | P5 Portal publish jobs/outbox schema | Nest rewrite |
| P2 Phone value-release | P6 UC Import adapter + contract tests | BullMQ/Redis |
| P3 Property Zod/specs honesty | Multi-portal fan-out | Mapbox default |
| P4 Pilot onboarding checklist | Outcome / success-fee billing | Wholesale shadcn/TanStack |
| P7 Single integrator merge | | New contacts/deals tables |
| P8 E2E/RLS harness (no portal contract) | Portal E2E subset of P8 | Scrape-as-publish |
| P9 Stripe env truth (ops/docs) | Self-serve checkout claims | Changing list prices in code |

---

## Future implementation waves (process)

| Wave | Name | Parallelism | Rule |
|---|---|---|---|
| **W-G1** | Schema / tenant contract freeze | **1 owner only** | Migrations + verification for tenant predicates; no other SQL on same objects. |
| **W-G2** | Security / data primitives | Sequential after W-G1; P2 then P3 **or** P2 ∥ P3 if disjoint objects | Phone table/API vs property Zod — different objects → may parallel after P1. |
| **W-G3** | Isolated UI / adapters | Parallel **after** contracts approved | Each adapter owns only its module+fixtures. **No** shared export endpoint edits. UI onboarding OK in parallel with adapter stubs. |
| **W-G4** | Single integrator | **1 owner** | Route registration, migrations apply order, package-lock, shared types — only here. |
| **W-G5** | E2E / RLS / portal contract tests | After integrator freeze | Portal contract tests skipped if P5/P6 not unlocked. |

---

## Candidate BOs

### BO-P1 — Tenant / RLS freeze checklist + verification update

| Field | Content |
|---|---|
| **BO** | Freeze tenant contract: document agencies/profiles guards; plan removal of `properties_tenant` `agency_id IS NULL` bypass after backfill; update verification tests to assert USING+WITH CHECK denial cross-tenant. |
| **Integration Report** | Reuse tree: agencies/profiles/properties RLS **CODE_PRESENT**. Change = policy tighten + tests. Justification: pilot isolation debt (D5/D10). Judge: no parallel orgs. Fallback constitution: `.cursor/rules/l99-engineering-constitution.mdc` (revolis-builder missing). |
| **Existing paths (A/D)** | `apps/crm/supabase/migrations/20260310_baseline_core_schema.sql`; `20260508180000_rls_properties.sql`; `20260508220000_rls_agencies_profiles_teams.sql`; `20260830231500_profiles_guard_role_agency.sql`; `20260831233000_profiles_guard_account_tier_ui_role.sql`; `20260904150000_drop_open_anon_policies.sql`; `apps/crm/tests/verification/**` (extend existing; exact new file named at impl time). |
| **Owner** | Single schema owner (eng lead) |
| **Deps** | Founder GO; optional read-only prod schema parity first |
| **Acceptance tests** | Cross-tenant SELECT/UPDATE on properties/leads returns 0/denied; authenticated client cannot escalate `profiles.role`/`agency_id`; verification suite green at BASE+PR. |
| **Rollout** | Migration on preview → CI → staged apply. Feature flag N/A (policy). |
| **Rollback** | Revert migration / restore prior policy in follow-up migration; keep backfill scripts idempotent. |
| **External inputs** | Prod schema dump (ops) — **not blocking** CI freeze; blocks “prod-ready” claim only. |
| **Wave** | W-G1 |
| **Write-set hint** | New migration under `apps/crm/supabase/migrations/`; verification tests under `apps/crm/tests/verification/`. Exact filenames TBD at impl — do not invent tonight. |

### BO-P2 — Phone value-release audit (fail-closed)

| Field | Content |
|---|---|
| **BO** | Add `phone_value_releases` (+ RLS) and dedicated reveal route: audit insert **before** plaintext; insert failure → no release (D8). Do **not** treat `ai_action_audit` / LEAD_UNLOCK as sufficient. |
| **Integration Report** | Reuse: leads/properties phone fields exist; audit store **GAP**. New table justified by compliance invariant. No Twilio CDR scope unless founder expands. |
| **Existing paths (A/D)** | `apps/crm/supabase/migrations/20260610000001_ai_action_audit.sql` (negative: wrong tool); baseline `leads`/`properties` phone columns; `apps/crm/tests/verification/call-analyzer.verification.test.ts` (≠ this BO); API surface near leads/properties routes under `apps/crm/src/app/api/**` (exact reveal path chosen at impl). |
| **Owner** | Security/data eng (one owner) |
| **Deps** | P1 |
| **Acceptance tests** | List/summary APIs omit full phones; reveal without audit insert fails closed; cross-tenant reveal denied; unit + RLS fixtures. |
| **Rollout** | Ship table+API behind explicit route; UI can call when ready. |
| **Rollback** | Feature-flag route off / return 501; keep table (append-only safe). |
| **External inputs** | Founder/legal: value-release vs CDR requirement. |
| **Wave** | W-G2 |
| **Write-set hint** | New migration for `phone_value_releases`; new/extended API route module only — integrator merges route registry if shared. |

### BO-P3 — Listing/property field honesty (Zod + specs)

| Field | Content |
|---|---|
| **BO** | Align create/update Zod with typed ~30 columns + discriminated `specs` (flat/house/land); reject unknown types; no invented portal fields (D7). |
| **Integration Report** | Reuse `properties-store` + UC mapper columns. Change = validation layer catch-up (schema ahead of form is OK). |
| **Existing paths (A/D)** | `apps/crm/supabase/migrations/20260617120000_uc_export_mapper.sql`; `apps/crm/src/lib/properties-store.ts`; `apps/crm/src/app/api/properties/route.ts` (+ related property API files under `apps/crm/src/app/api/properties/**`). |
| **Owner** | CRM data eng |
| **Deps** | P1 (tenant writes already safe) |
| **Acceptance tests** | Reject free-form unknown specs keys/types; create/update round-trip typed fields; no scrape AST as export DTO. |
| **Rollout** | API validation first; UI forms follow if needed. |
| **Rollback** | Loosen Zod only via versioned revert; DB columns remain. |
| **External inputs** | Optional sample import feed for fixture (not vendor UC publish). |
| **Wave** | W-G2 (may ∥ P2 — disjoint objects) |

### BO-P4 — Pilot onboarding checklist UI (reuse)

| Field | Content |
|---|---|
| **BO** | Thin pilot checklist for agency seats/goals using **existing** onboarding APIs/pages — no new onboarding platform. Align copy with HYPOTHESIS support scope (Lane E: weekday support, no custom integrations, no outbound publish promise). |
| **Integration Report** | Reuse onboarding CODE_PRESENT paths. Change = checklist composition / copy only. |
| **Existing paths (A)** | `apps/crm/src/app/api/onboarding/goals/route.ts`; `apps/crm/src/app/api/enterprise/onboard-start/route.ts`; `apps/crm/src/app/api/cron/onboarding-dispatch/route.ts`; `apps/crm/src/app/(dashboard)/system/csm-onboarding/page.tsx`; `apps/crm/src/app/(dashboard)/onboarding-monitor/OnboardingMonitorClient.tsx`. |
| **Owner** | FE eng (isolated UI lane) |
| **Deps** | P1; commercial copy from E/F |
| **Acceptance tests** | Smoke: checklist loads for authenticated agency; no claim of portal publish; Playwright smoke path if applicable. |
| **Rollout** | Preview deploy; flag optional. |
| **Rollback** | Hide checklist route/nav entry. |
| **External inputs** | Pilot agency list from F (ops). |
| **Wave** | W-G3 |

### BO-P5 — Portal publication / outbox schema (BLOCKED)

| Field | Content |
|---|---|
| **BO** | Additive tables `listing_snapshots`, `portal_publications`, `portal_publish_jobs` per D9 — **specs ready, implementation blocked**. |
| **Integration Report** | Outbound GAP (A/C). Reuse inbound import_jobs patterns for job state ideas only — **do not overload import_jobs** for outbound without Integration Report at impl time. |
| **Existing paths** | Pattern refs: `20260608120000_universal_crm_import.sql`; `apps/crm/src/app/api/cron/**`. Inbound only: Realsoft/UC API trees. **No outbound module path to edit yet.** |
| **Owner** | Schema owner (same as P1 when unblocked) |
| **Deps** | P1 + **UC vendor package** |
| **Acceptance tests** | (When unblocked) monotonic snapshot version; idempotent job key; stale snapshot cannot overwrite newer published. |
| **Rollout / Rollback** | Additive tables; drop only via controlled migration if unused. |
| **External inputs** | **BLOCKER:** UC Import schema + activation + sandbox. |
| **Wave** | W-G1/W-G2 slot when unblocked — still single schema owner; **not parallel with other SQL on same new objects**. |
| **Status** | **BLOCKED** |

### BO-P6 — UC Import outbound adapter (BLOCKED)

| Field | Content |
|---|---|
| **BO** | Property→UC Import DTO mapper + publisher worker on outbox; scrape module must not be imported by export builder (D10.6). |
| **Integration Report** | New adapter module only after contracts. Owns **only** its directory + fixtures — never shared export endpoint owned by another lane. |
| **Existing paths** | Negative: `apps/crm/src/infra/scraping/PortalNehnutelnostiSource.ts` is **not** the export contract. Inbound refs for auth patterns: Realsoft/UC API trees (exact files at impl from A/C). |
| **Owner** | Portal adapter eng (isolated) |
| **Deps** | P5 + UC docs/credentials |
| **Acceptance tests** | Contract tests vs vendor schema; tenant credential isolation; accepted≠published states. |
| **Rollout** | Sandbox agency first; cron/outbox claim. |
| **Rollback** | Disable processor; leave rows queued. |
| **External inputs** | UC package, credentials, rate limits, ToS consent (Topreality). |
| **Wave** | W-G3 (adapter) then W-G4 integrator wires route/cron |
| **Status** | **BLOCKED** |

### BO-P7 — Single integrator (routes / migrations / lockfile / shared types)

| Field | Content |
|---|---|
| **BO** | One integrator PR merges W-G2/W-G3 outputs: migration order, App Router registration, package-lock if deps added, shared types. **No feature logic** in this BO beyond glue. |
| **Integration Report** | Process BO required by START-HERE / constitution. |
| **Existing paths** | Touches whatever P2–P6 produced; lockfile under `apps/crm/` **only if** a prior BO added deps (prefer zero new deps). |
| **Owner** | Designated integrator (one human/agent) |
| **Deps** | P1–P4 complete (and P5–P6 if unlocked) |
| **Acceptance tests** | `npm` test/build green; migration dry-order clean; no duplicate route files. |
| **Rollout** | Single PR → preview → CI. |
| **Rollback** | Revert integrator commit. |
| **External inputs** | None |
| **Wave** | W-G4 |

### BO-P8 — E2E / RLS / (optional) portal contract tests

| Field | Content |
|---|---|
| **BO** | Harness for D10 invariants: cross-tenant, role escalation, phone fail-closed, publish ordering **if** P5/P6 present. |
| **Integration Report** | Extend verification/smoke trees — living spec. |
| **Existing paths** | `apps/crm/tests/verification/**`; smoke entry from `apps/crm/package.json` at impl. |
| **Owner** | QA/eng after integrator |
| **Deps** | P7 |
| **Acceptance tests** | Suite green in CI; portal subsection skipped with explicit `BLOCKED_EXTERNAL` if no UC. |
| **Rollout** | CI required check. |
| **Rollback** | Skip/xfail only with ticket — prefer keep failing visible. |
| **External inputs** | UC sandbox only for portal subsection |
| **Wave** | W-G5 |

### BO-P9 — Stripe / billing env truth (ops + docs; no price invent)

| Field | Content |
|---|---|
| **BO** | Founder/ops checklist: verify Production `price_*` vs `program-tier-pricing.ts`; prefer manual invoice for pilot (E). **No** overnight or pilot code change to list seats; Smolko 199 grandfather untouched. |
| **Integration Report** | Billing CODE_PRESENT; Stripe **PROD_UNKNOWN**. Docs-only / ops. |
| **Existing paths** | `apps/crm/src/lib/program-tier-pricing.ts`; `apps/crm/docs/pricing-v1.md`; `apps/crm/src/app/api/billing/**`; `apps/crm/tests/verification/billing-credits.verification.test.ts`. |
| **Owner** | Founder + billing ops |
| **Deps** | None (∥ eng) |
| **Acceptance tests** | Written checklist signed; if unverified → keep PROD_UNKNOWN in handoff. |
| **Rollout / Rollback** | N/A code; do not flip self-serve until verified. |
| **External inputs** | Vercel/Stripe dashboard access |
| **Wave** | Parallel ops anytime |

---

## Dependency DAG (summary)

```text
                    [Founder GO]
                         |
                       P1 (W-G1 schema/tenant freeze)
                      /  |  \
                     /   |   \
                   P2    P3   P4 (W-G3 UI; after P1)
                   |     |      \
                   +--+--+       |
                      |          |
               P5 ──► P6        |     (P5/P6 BLOCKED without UC)
                      |          |
                      +---- P7 (W-G4 single integrator)
                              |
                             P8 (W-G5 tests)

        P9 (Stripe ops) ─────────────────────────────── parallel, no eng dep
```

**Cut-scope critical path:** `GO → P1 → (P2 ∥ P3) → P4 → P7 → P8` (~2–3 weeks).  
**Portal path (optional):** unlock → `P5 → P6 → P7 → P8(+portal)`.

---

## Collision matrix (future code)

| Shared object / surface | Who may write | Parallel? | Notes |
|---|---|---|---|
| `properties` RLS / tenant policies | P1 owner only | **No** | Later P3 must not re-edit same policy in parallel. |
| `profiles` guard triggers | P1 only | **No** | |
| `phone_value_releases` + reveal route module | P2 only | **No** concurrent writers | |
| Property Zod / `properties-store` types | P3 only until P7 | P2∥P3 OK | Disjoint from phone table |
| Onboarding UI/API composition | P4 only | ∥ adapters | Must not touch export endpoint |
| `listing_snapshots` / `portal_publications` / `portal_publish_jobs` | P5 only | **No** | |
| Portal adapter module + fixtures | P6 only | ∥ other adapters | **Never** shared export route |
| App Router registry / cron wiring | **P7 integrator only** | **No** | |
| `package-lock` / workspace lockfile | **P7 only** | **No** | |
| Shared DTO types package | **P7 only** | **No** | Adapters propose; integrator merges |
| Verification / E2E harness | P8 (after freeze) | Prefer after P7 | Avoid fixture wars |
| `program-tier-pricing.ts` | **Out of scope** this pilot eng set | — | P9 ops verify only |

**SQL rule:** two migrations must not land in the same wave altering the same table/policy/function. Sequence by object owner.

**Adapter rule:** each portal/source lane owns `…/adapters/<name>/**` + fixtures only; integrator adds the single cron/route entry.

---

## Conditions (PASS_WITH_CONDITIONS)

1. Specs only — zero app code executed this night.
2. P5/P6 remain BLOCKED pending UC (Lane C).
3. Constitution scores do not authorize BUILD NOW (VALIDATE_FIRST / portal BACKLOG).
4. Exact new filenames for migrations/routes deferred to implementation Integration Reports (paths above are **existing** evidence only).
5. Prod Stripe and prod RLS apply still PROD_UNKNOWN.

## Next action

Freeze Lane G for W3 gate alongside F; opponents H/I/J review DAG + collision matrix; morning O6 may consolidate into `final/implementation-backlog.md` without rewriting this source of truth.
