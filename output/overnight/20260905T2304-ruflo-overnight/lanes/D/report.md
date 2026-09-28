# Lane D — Architecture / data model (minimal CRM evolution)

- **RUN_ID:** `20260905T2304-ruflo-overnight`
- **Lane:** D (W2)
- **BASE_SHA:** `cf3604613cdbb6a7a279e175f2c792fb25591461`
- **Depends on (frozen):** lanes A, B, C
- **Scope:** research_and_specs only — no app code edits
- **Status:** `PASS_WITH_CONDITIONS`
- **Accessed:** 2026-09-05 (repo via `git show`/`git grep` at BASE_SHA; W1 reports; W0 input snapshot)

## Executive recommendation

**Evolve the existing Next.js + Supabase CRM** (`apps/crm`) as the system of record. Do **not** rewrite to NestJS or introduce a parallel organizations/contacts/deals schema overnight. Queue work on **existing `import_jobs` + cron routes**, then a **Postgres outbox** for portal publish before Redis/BullMQ. Keep **MapLibre** and the current Tailwind/Zustand FE; treat shadcn/TanStack and Mapbox as non-default. Model Contact as **`leads`**, Deal as **lead pipeline state + history** (not AI deal satellites), Viewing as **`scheduled_events`**, and add **portal publication jobs** + **phone value-release audit** as additive tables with tenant RLS + WITH CHECK.

---

## Decision Contract

### 1. Decisions

#### D1 — Application stack: keep Next/Supabase (reject Nest rewrite; reject third-platform rewrite)

| Option | Verdict | Why (cost/ops, not popularity) |
|---|---|---|
| **A. Keep Next.js App Router + Supabase (Postgres/Auth/RLS/Storage)** | **CHOOSE** | CODE_PRESENT end-to-end at BASE_SHA: package deps (`next`, `@supabase/*`, `zod`), tenant APIs, migrations, cron routes. Lowest migration risk for pilot ICP (5–20 brokers hypothesis). |
| **B. Rewrite API to NestJS (+ keep or replace Postgres)** | **REJECT for Phase 1** | Would duplicate auth/tenant/RLS surface already in Next route handlers + Supabase policies; dual runtime, dual deploy, months of rewrite before portal export value. Reopen only if measured Node CPU isolation or multi-service team is proven need. |
| **C. Keep Next UI + extract long jobs to a thin Node worker (Hono/Fastify) on same Postgres** | **DEFER / Phase-2 interface only** | Relevant if cron/Vercel timeouts block outbound UC Import. Same DB/outbox; **no Nest**. Spec worker interface now; do not stand up second service until publish job volume fails on cron. |

**Change condition:** Live ops proves cron/serverless cannot meet UC import cadence or job duration → promote option C without Nest.

#### D2 — Queue: existing jobs first → Postgres outbox → BullMQ only if outbox fails

1. **Reuse first:** `import_jobs` / `import_rows` (universal CRM import) + `app/api/cron/*` (Realvia process, credits, matching, etc.). Lane A: Jobs = CODE_PRESENT; no new queue platform for overnight conclusions.
2. **Next evolution for outbound portal publish:** **Postgres transactional outbox** tables (`portal_publish_jobs` / `outbox_events`) in the same TX as listing snapshot — retry/backoff, lease/worker claim, ordering by `(agency_id, property_id, snapshot_version)`. Fits existing RLS/tenant FK patterns; no new Redis ops.
3. **BullMQ + Redis:** **Reject for Phase 1.** Adds infra, failover, and secret surface for a volume that is not evidenced. Reopen when outbox throughput/ops cost is measured worse than Redis for multi-minute fan-out.

#### D3 — Frontend: reuse existing UI; no wholesale shadcn/TanStack

- **Keep:** Next App Router pages, Tailwind, `lucide-react`, Zustand, small `components/ui` (Toast/NavIcon). No `@tanstack/*` / shadcn / `@radix-ui` in `package.json` at BASE_SHA.
- **Do not** introduce shadcn + TanStack Query/Table as a “modernization” project in pilot scope.
- **Allow later (narrow):** TanStack Table only if inventory grids prove unmaintainable; still no full design-system migration.

#### D4 — Maps: keep MapLibre; Mapbox deprecated

- **Keep MapLibre** — `DemandHeatmap.tsx`, `CadastreMapView.tsx`; dep `maplibre-gl`.
- **Do not switch to Mapbox** — `NEXT_PUBLIC_MAPBOX_TOKEN` marked deprecated in `apps/crm/src/config/env.ts` (“MapLibre + OpenFreeMap default”). Mapbox would add token cost/ToS without proven map product gap.

#### D5 — Tenant membership / roles (identifiers preserved)

- **Tenant root:** `agencies.id` (UUID). Membership: `profiles.agency_id` → `agencies`; optional `profiles.team_id` → `teams`.
- **Auth link:** `profiles.auth_user_id` (Supabase Auth). Role fields: `profiles.role` (default `agent`), `profiles.ui_role`, `profiles.account_tier`; mutations of role/agency/tier/ui_role blocked for authenticated clients via guard triggers (`profiles_guard_role_and_agency`, `profiles_guard_account_tier_and_ui_role`) — service_role only.
- **Do not** invent parallel `organizations` / membership tables (Lane A decision 1).
- **Composite tenant FK pattern:** child rows carry `agency_id` NOT NULL (or nullable only during controlled backfill), FK to `agencies(id)`, unique natural keys as `(agency_id, …)` where external IDs exist (already: `properties (agency_id, source_system, source_id)`).
- **RLS:** ENABLE + policies with **USING and WITH CHECK** on tenant predicates (example: `properties_tenant`). **Tighten:** discontinue `agency_id IS NULL` bypass in USING/WITH CHECK for production-bound tables once backfill complete (current `properties_tenant` allows NULL — treat as debt).
- **Server-side tenant context:** resolve `agency_id` from authenticated profile in route handlers / service_role jobs; never trust client-supplied agency for writes.
- **Service jobs:** cron + import processors use service_role with explicit `agency_id` filter; no cross-tenant batch without allowlist.
- **Storage isolation:** object paths / bucket prefixes `{agency_id}/properties/{property_id}/…`; signed URLs only after tenant auth. Media metadata stays on `properties.images` JSONB (or future `property_media` with `agency_id`).

#### D6 — Domain model map (Contact ≠ Deal; Viewing; history; media; portal; phone)

| Concept | Existing reuse | Evolution |
|---|---|---|
| **Contact** | `leads` (+ dossier / enrichment_log `record_type='contact'`) | **No new `contacts` table** unless Integration Report + broker interviews fail leads-as-contact UX (Lane A unknown). |
| **Deal** | Lead `status` + tasks/activities; **not** `ai_sourced_deals` / deal_risk satellites as CRM pipeline | Keep Deal = **opportunity on a Contact (lead)** with explicit stage enum; do not merge Contact into Deal. AI satellites stay analytics-only. |
| **Viewing** | `scheduled_events` (`event_type='viewing'`, optional `lead_id`/`property_id`) | Extend UX/status only; no parallel viewings table. |
| **Pipeline history** | `lead_events`; prod-drift `pipeline_moves` noted in drop-anon migration | Prefer append-only `lead_events` (or formalize `pipeline_moves` into migrations). Status change must write history row in same TX. |
| **Property** | `properties` + UC mapper columns + store select | Typed core (~30) + `specs` JSONB validated per type — see §Property. |
| **Media** | `properties.images` JSONB | Keep JSONB for portal image URLs; storage files under tenant prefix when uploading. |
| **Portal publication / job** | Inbound Realsoft/UC import CODE_PRESENT; **outbound publish GAP** (Lane C) | New `portal_publications` + `portal_publish_jobs` (outbox) — §Export. |
| **Phone audit** | GAP (Lane A); `ai_action_audit` / LEAD_UNLOCK ≠ phone value release | New `phone_value_releases` — §Phone. |

**ID compatibility:** Keep `properties.id` (text), `leads.id` (text), UUID agencies/profiles. External portal IDs in `source_id` / publication `external_listing_id`.

#### D7 — Property typed fields (~30) + specs

**Core typed columns (reuse + complete; names snake_case in DB):**

1. `id` 2. `agency_id` 3. `title` 4. `status` 5. `transaction_type` (sale/rent) 6. `type` (Byt/Dom/Pozemok/… canonical enum in app) 7. `location` 8. `price` 9. `currency` 10. `rooms` / `rooms_count` 11. `usable_area` 12. `land_area` 13. `building_area` 14. `floor` 15. `latitude` 16. `longitude` 17. `description` 18. `features` 19. `images` 20. `owner_name` 21. `owner_phone` (restricted read path) 22. `broker_name` 23. `broker_email` 24. `broker_phone` 25. `source_system` 26. `source_id` 27. `broker_source_id` 28. `created_at` 29. `updated_at` 30. `payload_raw` (import debug only; not UI SSOT)

Many of 5–17, 19, 22–27 already added in `20260617120000_uc_export_mapper.sql`; API create body today is a thinner subset — **schema ahead of form** is OK; Zod create/update must catch up in implementation waves (not tonight).

**`specs` JSONB** (validated by Zod discriminated union; not free-form dump):

- **flat:** disposition, floor_count, elevator, balcony, cellar, parking, condition, energy_class, year_built, ownership_form
- **house:** floors, plot_area, garage, condition, energy_class, year_built, roof, heating
- **land:** plot_area, zoning, utilities, access, slope, buildable

Unknown type → reject write. Scrape parsers may feed normalizers into Property; **scrape parser ≠ export contract** (Lane C / START-HERE).

#### D8 — Phone value-release audit (server-side)

**Invariant:** Full phone values (`leads.phone`, `properties.owner_phone`, etc.) are **not** returned by list/summary endpoints. Reveal only via dedicated server route that:

1. Authenticates user; resolves `agency_id` from profile.
2. Authorizes object membership (`agency_id` match + role).
3. Inserts **`phone_value_releases`** row **before** returning plaintext (same request; prefer same DB TX).
4. On **audit insert failure → do not release value** (fail closed).
5. No long-lived client cache of full numbers; UI may keep in memory for session step only; exports of contact lists require explicit export job + audit rows per value (or deny).
6. Retry of reveal: new audit row each successful release; idempotency key optional `(agency_id, subject_type, subject_id, field, actor_profile_id, minute_bucket)` to collapse UI double-clicks — still counts as release intent.
7. Audit records **value release to principal**, **not** proof a human eyeballed the screen. Log alone ≠ GDPR compliance (legal basis / retention separate; Lane A/E/legal).

**Proposed columns:** `id`, `agency_id`, `actor_profile_id`, `subject_type` (`lead`|`property`|…), `subject_id`, `field_name`, `purpose`, `request_id`, `created_at`. RLS: tenant SELECT for owners/admins; INSERT service_role or security-definer function only.

`ai_action_audit` / credit `lead_unlock` may co-exist for billing; they **do not** satisfy this invariant.

#### D9 — Portal export / publication lifecycle

Aligns with Lane C: outbound = **UC Import** (CRM→portals); inbound already = UC Export receivers.

**Entities:**

- **`listing_snapshots`:** immutable content hash + `snapshot_version` (monotonic per `(agency_id, property_id)`), payload JSON derived from Property+specs+media URLs — **not** scrape AST.
- **`portal_publications`:** per `(agency_id, property_id, portal_code)` — states: `draft` → `queued` → `accepted` → `published` | `rejected` | `unpublished`; stores `external_listing_id`, `last_accepted_snapshot_version`, `last_published_snapshot_version`, `last_error`.
- **`portal_publish_jobs` (outbox):** `idempotency_key`, `attempt`, `next_attempt_at`, `lease_owner`, `ordered_after`, links to snapshot + publication.

**Behaviors:**

| Concern | Rule |
|---|---|
| Snapshot | Publish always references immutable snapshot; edits create new version. |
| Idempotency | Same `idempotency_key` / snapshot+portal → single logical publish. |
| Retry/backoff | Exponential + jitter; cap attempts; dead-letter status. |
| Stale update protection | Reject apply if job `snapshot_version` < publication’s accepted/published version (monotonic). |
| Per-tenant auth | Job processor loads UC credentials for `agency_id` only. |
| Accepted vs published | `accepted` = vendor ack / validation OK; `published` = live on portal (URL/id confirmed). Do not conflate. |
| Unpublish | Separate job type; sets `unpublished`; requires vendor delete/full-replace semantics when known. |
| Reconcile | Periodic compare CRM desired state vs vendor listing id/status; emit repair jobs; never silent overwrite with older snapshot. |
| Parser separation | Scrape/import mappers → Property; export mapper Property→UC Import DTO. Shared **normalized Property**, not shared scrape parser. |

**Phase 2 interfaces only (no build):** `KatasterLookup`, `CallTranscription`, `OutreachBot` — ports in docs/types only; no tables/adapters tonight.

#### D10 — Security invariants (testable later)

1. Cross-tenant SELECT/UPDATE on properties/leads/jobs returns 0 / denied (RLS + WITH CHECK).
2. Authenticated client cannot escalate `profiles.role` / `agency_id` / `ui_role`.
3. Phone plaintext absent from list APIs; reveal without successful audit insert fails.
4. Publish job for agency A cannot use credentials/rows of agency B.
5. Older snapshot cannot overwrite newer accepted/published version.
6. Scrape module is not imported by export DTO builder (dependency lint / package boundary in impl wave).

**Lane status:** `PASS_WITH_CONDITIONS` — architecture and model specified with alternatives; conditions = prod schema apply unknown, UC outbound credentials/XSD vendor-gated, phone audit not CODE_PRESENT, `properties_tenant` NULL agency bypass, `pipeline_moves` migration drift.

---

### 2. Evidence

| Claim | Evidence |
|---|---|
| Next + Supabase + MapLibre + Zod present | `git show BASE_SHA:apps/crm/package.json` — deps `next`, `@supabase/*`, `maplibre-gl`, `zod`; no Nest/BullMQ/TanStack/shadcn |
| Tenant agencies/profiles/teams | `…/20260310_baseline_core_schema.sql` CREATE agencies/teams/profiles |
| Role guards | `…/20260830231500_profiles_guard_role_agency.sql`, `…/20260831233000_profiles_guard_account_tier_ui_role.sql` |
| Properties RLS USING+WITH CHECK | `…/20260508180000_rls_properties.sql` policy `properties_tenant` |
| Property UC columns (area, geo, images, source_*) | `…/20260617120000_uc_export_mapper.sql` |
| Property app type / selects | `apps/crm/src/lib/properties-store.ts` (`Property`, `PROPERTIES_SELECT_*`) |
| Create API thinner than DB | `apps/crm/src/app/api/properties/route.ts` Zod body |
| import_jobs queue | `…/20260608120000_universal_crm_import.sql` |
| Cron surface | `apps/crm/src/app/api/cron/**` at BASE_SHA |
| Viewings | `…/20260527143000_event_scheduler_phase1.sql` `scheduled_events` |
| Pipeline events | `…/20260418_enterprise_ai_intelligence.sql` `lead_events` |
| pipeline_moves drift | `…/20260904150000_drop_open_anon_policies.sql` comments |
| MapLibre in use; Mapbox deprecated | `DemandHeatmap.tsx`, `CadastreMapView.tsx`; `config/env.ts` comment |
| Lane A reuse matrix | `lanes/A/report.md` PASS_WITH_CONDITIONS |
| Lane B incumbents (backOFFICE/ZRKS, Admin≠CRM) | `lanes/B/report.md` |
| Lane C UC Import/Export; outbound GAP | `lanes/C/report.md` |
| Phone audit GAP | Lane A capability matrix |

### 3. Assumptions

1. Research_and_specs overnight — recommendations are specs, not shipped code.
2. ICP 5–20 brokers remains START-HERE hypothesis (Lane B).
3. BASE_SHA migration chain is intended CI schema; prod may drift (Lane A).
4. UC family shared docs apply across three portals until vendor proves brand-specific APIs (Lane C).
5. Brokers accept leads-as-contacts for pilot UX.

### 4. Unknowns

| Unknown | Owner | Blocks |
|---|---|---|
| Prod/Smolko migration apply + live RLS residual | Ops / founder | Claiming prod-ready tenant isolation |
| UC Import activation + credentials + schema artifacts | Vendor / founder | Real outbound adapter implementation |
| Whether pilot legally requires phone CDR vs value-release audit | Founder / legal / client | Scope of telephony work |
| `scheduled_events` production usage | Product | Viewing priority |
| Formalize `pipeline_moves` vs `lead_events` only | Eng | Single history SSOT |
| When serverless cron limits force worker process | Ops | Promoting Decision D1 option C |

### 5. Experiments

1. **Schema parity (read-only):** compare prod tables/columns for properties/leads/import_jobs vs BASE_SHA migrations. Stop if core missing.
2. **Phone reveal fail-closed prototype (impl wave):** audit insert forced fail → API returns 5xx and no phone. Metric: 0 plaintext leaks in harness.
3. **Outbox ordering:** two snapshots v1 then v2; inject reverse completion; assert publication stays on v2. Stop if cannot enforce without Redis.
4. **UC validation POST** with synthetic OfficeData from public docs only (Lane C H2) before building exporter.

### 6. Product Implications

| Area | Reuse | Change (later waves) | Defer |
|---|---|---|---|
| Runtime | Next + Supabase | Optional thin worker interface | Nest rewrite; new SaaS backend |
| Queue | import_jobs + cron | portal_publish_jobs outbox | BullMQ/Redis |
| FE/Maps | Tailwind/Zustand/MapLibre | Narrow table lib if needed | shadcn redesign; Mapbox |
| CRM objects | leads, properties, scheduled_events, lead_events | specs JSONB; tighten RLS NULL; phone reveal API | contacts/deals tables; AI satellites as CRM |
| Portals | inbound UC/Realsoft | outbound snapshot/publish/reconcile | Scrape-as-publish; Phase-2 kataster/bots |
| Competition (B) | Differentiate on CRM+export reliability vs Admin-only / spreadsheet | Pilot must include publish path when vendor unlocks | Price war vs backOFFICE €95/yr narrative alone |

### 7. Decision Memory Payload (draft only — do not write canonical memory)

```text
date: 2026-09-05
source: ruflo-overnight lane D
run_id: 20260905T2304-ruflo-overnight
base_sha: cf3604613cdbb6a7a279e175f2c792fb25591461
decision: Evolve existing Next/Supabase CRM. Reject Nest rewrite and BullMQ for Phase 1. Queue via import_jobs then PG outbox. Keep MapLibre and current FE. Contact=leads; Deal=lead pipeline+history; Viewing=scheduled_events. Add portal publication/outbox + phone_value_releases. Property ~30 typed fields + specs. Phase-2 kataster/transcription/bots = interfaces only.
status: DRAFT_FOR_MORNING_INTEGRATION
reopen_if:
  - prod schema dump contradicts tenant/property assumptions
  - UC outbound blocked indefinitely (pilot publish scope shrinks)
  - cron timeouts force worker extraction
  - founder requires phone CDR audit beyond value-release
```

---

## Relationship sketch (logical)

```
agencies 1---* profiles (role, ui_role, auth_user_id)
agencies 1---* teams 1---* profiles
agencies 1---* leads (Contact) 1---* lead_events (pipeline history)
agencies 1---* properties 1---* listing_snapshots
leads *---* properties (matches / viewings via scheduled_events)
scheduled_events (Viewing) → lead_id?, property_id?
portal_publications → property + portal_code
portal_publish_jobs (outbox) → publication + snapshot
phone_value_releases → subject lead|property
import_jobs (inbound) remains separate from portal_publish_jobs (outbound)
```

## Conditions (PASS_WITH_CONDITIONS)

1. No live prod DB verification (inherited from A).
2. Outbound UC contract artifacts/credentials still vendor-gated (C).
3. Phone value-release audit and portal outbox are **specified**, not CODE_PRESENT.
4. `agency_id IS NULL` property RLS bypass and `pipeline_moves` drift remain open engineering debt.
