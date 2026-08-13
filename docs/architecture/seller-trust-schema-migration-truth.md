# Seller Trust Factory — schema / migration truth (LANE 16)

**Status:** evidence report on SHA `5d6500106a67a864b049dc372ee0a2d6be793c6f` (`docs/stf-p0-schema-truth`).
**Classification:** schema truth for integrator-after-G0. Not a migration. Not a GO to apply DDL.
**Lane constraints honored:** no new SQL file; no `migration repair`; no `db push` / `db reset` / linked DDL; no production catalog writes; no future migration timestamp assigned.

**UNAPPROVED DRAFT (readable, not proven):**

- `C:\RealitkaAI\docs\architecture\revolis-seller-trust-factory-l99.md` (`status: draft`)
- `C:\RealitkaAI\docs\architecture\revolis-seller-trust-factory-technical-addendum.md`
- `C:\RealitkaAI\memory\seller-trust-factory.md`

Those three files are product intent only. They do not prove catalog state, migration history, or RLS. Where this report uses them, the sentence is labeled **DRAFT-INTENT**.

---

## 0. Verdict (one screen)

| Question | Answer on this SHA | Proof class |
|---|---|---|
| Are repo migrations, local `db reset`, and linked history the same thing? | **No.** Three separate proofs. | this lane ran two of three; reset not run |
| Linked `schema_migrations` / `supabase_migrations`? | **STOP / UNKNOWN** — project is not linked in this worktree | command evidence §2 |
| Local `supabase db reset` parity? | **UNKNOWN** — not executed in this lane (would mutate local Docker DB) | CI *intends* reset; that is not this SHA's local proof |
| `2026_genome_layer2.sql`? | Illegal filename vs house convention; version token `2026`; order depends on sorter | §3 |
| Merged acquisition schema (`20260811220000_acquisition_core.sql`)? | Present in repo. Composite account→campaign FK exists. **Lead tenant binding does not.** | §4 |
| May `acquisition_events.lead_id` be non-NULL? | **FORBIDDEN** until `UNIQUE (agency_id, id)` on `public.leads` is proven **and** a composite FK is applied | §4.2 |
| STF permission receipt / suppression / journey ledger / outbox? | **Design only.** No CREATE TABLE on this SHA | §5 |
| Next SQL timestamp? | **Not assigned.** Integrator after G0 owns it after linked-history GO | §3, §7 |

**GO owner for anything that writes a database or repairs history:** Founder (policy) + designated DB integrator after G0 (execution). This PR must not merge without that GO.

---

## 1. Matrix — repo migrations ↔ local db reset ↔ linked history

These are **three proofs**. Passing one never implies the others.

| Proof | What it actually measures | How it is produced | Evidence on this SHA | Status |
|---|---|---|---|---|
| **A. Repo migrations** | Files under `apps/crm/supabase/migrations/` that a CLI *would* apply | `git ls` / directory listing at `HEAD` | 94 `.sql` files; 11 fail `^\d{14}_[a-z0-9_]+$` | **OBSERVED** |
| **B. Local `db reset`** | Ephemeral Docker Postgres after drop+replay of **A** (+ `seed.sql`) | `supabase db reset` from `apps/crm` | **Not run here.** CI *does* run it (`.github/workflows/saas-grade-pipeline.yml` step `Reset DB`; `.github/workflows/nightly-playwright.yml`) against `project_id = "revolis-crm-ci"` in `apps/crm/supabase/config.toml`. That is a different machine, CLI (`supabase/setup-cli@v1` `version: latest`), and catalog. | **UNKNOWN — separate proof** |
| **C. Linked remote history** | Rows in remote `supabase_migrations.schema_migrations` (or CLI equivalent) for the linked project ref | `npx supabase migration list --linked` from `apps/crm` | Failed: `LegacyProjectNotLinkedError` / `Cannot find project ref. Have you run supabase link?` | **STOP / UNKNOWN** |

### 1.1 Why they diverge (repo facts, not speculation)

1. **Non-standard version tokens.** House rule in `apps/crm/docs/migration-baseline-cleanup-plan.md`: `YYYYMMDDHHMMSS_description.sql`. Eleven live files violate the 14-digit regex (full list §2.1). The CLI version id for `2026_genome_layer2.sql` is **`2026`**, not a timestamp.
2. **Manual / out-of-band prod apply.** File header of `apps/crm/supabase/migrations/2026_genome_layer2.sql`: "Applied manually on PROD; this file keeps ephemeral CI DB aligned." Repo presence ≠ history row. History row ≠ identical DDL.
3. **Archive vs live path.** `apps/crm/supabase/migrations-archive/` holds retired files (`20260411_semantic_search.sql`, `20260412_enterprise_realtime_audit_rls.sql`, `20260412_google_calendar_oauth.sql`) that `db reset` will **not** apply. Linked history may still contain their version ids. **UNKNOWN** until proof C.
4. **Idempotent SQL hides order bugs.** Genome and several baselines use `IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS`. A reset can "succeed" with a different apply order than a linked push, and still look green.
5. **Governance guard is not a substitute for C.** `apps/crm/scripts/schema-governance-guard.mjs` compares live `rls_audit_snapshot()` tables to `apps/crm/config/public-schema-allowlist.json`. Workflow `.github/workflows/schema-governance-guard.yml` has **schedule disabled** (comment 2026-06-17: missing `SCHEMA_GUARD_*` secrets; alarm fatigue). `.github/workflows/code-contract-guard.yml` repeats that the guard was turned off because it stayed red. Guard state = **manual `workflow_dispatch` only; nightly proof absent.**

### 1.2 What this lane did *not* do (explicit)

- Did not run `supabase db reset`.
- Did not run `supabase link`, `migration repair`, `db push`, `db pull`.
- Did not read or copy a project-ref from any sibling checkout into this worktree.
- Did not query production `information_schema` / `pg_policies`.

A sibling working tree may contain `apps/crm/supabase/.temp/project-ref`. This worktree does **not** (`apps/crm/supabase/.temp` missing). That file was not opened and was not used.

---
## 2. Decision variants for `2026_genome_layer2.sql`

File: `apps/crm/supabase/migrations/2026_genome_layer2.sql`.

Repo facts (this SHA):

- Header: "Applied manually on PROD; this file keeps ephemeral CI DB aligned."
- Objects: `public.decisions`, `public.exclusivity_outcomes`, view `public.genome_decision_open`.
- RLS: `ENABLE ROW LEVEL SECURITY`; policies **only** `decisions_service_role` / `exclusivity_outcomes_service_role` (`FOR ALL TO service_role USING (true)`). No `authenticated` tenant policy.
- View: no `WITH (security_invoker = true)` — Postgres views bypass RLS by default unless invoker is set (PG15+).
- `agency_id uuid NOT NULL` with **no FK** to `agencies`. `lead_id text NOT NULL` with **no FK** to `leads`.
- Duplicate `ALTER TABLE ... ADD COLUMN IF NOT EXISTS agent` after `CREATE TABLE` already includes `agent`.
- Consumers on this SHA: `apps/crm/src/lib/agents/followup/predictionWriter.ts`, `outcomeWriter.ts`.
- Allowlist **includes** `decisions`, `exclusivity_outcomes` (`apps/crm/config/public-schema-allowlist.json`).
- Tenant registry **does not** list them (`apps/crm/tests/rls/tenant-table-registry.ts`).
- Stale audit `apps/crm/docs/audit/rls-schema-parity-matrix.json` (`at: 2026-06-26T06:51:26.123Z`) flagged both as P0 `missing_tenant_policy_repo` / `on_prod: true`. That snapshot is **not** a live catalog proof on this SHA.
- Prior write-up `docs/architecture/genome-layer2-audit.md` is another lane's inference. **Not treated as proven** here.

**Do not assign a replacement timestamp in this document.** Integrator after G0 owns the stamp.

### Variant G0-A — Keep filename forever

| | |
|---|---|
| Action | Leave `2026_genome_layer2.sql` as the only Genome Layer 2 migration. |
| Risk | Version id `2026` sorts **before** every `202603…` file in version-token order, but **after** `202608…` in ASCII filename order (`_` greater than digit). Fresh reset order is tool-dependent. Idempotent `IF NOT EXISTS` can hide wrong order until a non-idempotent statement fails. |
| Rollback | N/A (status quo). |
| GO owner | Founder, only if accepting a permanent exception to the 14-digit rule. |

### Variant G0-B — Repo-only rename (no linked repair)

| | |
|---|---|
| Action | Rename/copy the file to a 14-digit name **chosen later**. Do not repair remote history. |
| Risk | If linked DB already recorded version `2026`, `migration list` will diverge. A later `db push` / migrate-on-merge could try to apply the new version on prod (double-create is mostly idempotent today; **not** a license to push). |
| Rollback | Restore old filename before any remote apply. |
| GO owner | Founder + Principal Postgres **after** linked `migration list` is a proven artifact. |

### Variant G0-C — Rename + linked history repair

| | |
|---|---|
| Action | After G0-B, mark old version reverted and new version applied on the linked project. |
| Risk | Wrong repair: "applied" when objects never existed, or "reverted" when they do. Repair does not run DDL; it lies to the history table. **This lane forbids executing repair.** |
| Rollback | Reverse the two repair rows. Still does not drop/create tables. |
| GO owner | Founder + owner of the linked Supabase project. Explicit GO required. Never bundled with feature work. |

### Variant G0-D — Keep old file; add a second stamped no-op/idempotent file

| | |
|---|---|
| Action | Leave `2026_genome_layer2.sql`; add a later 14-digit file that is a no-op if objects exist. Stamp chosen by integrator after G0. |
| Risk | Two sources of truth. Future non-idempotent edits applied twice. Version `2026` remains in history forever. |
| Rollback | Delete the new file before it is applied remotely. |
| GO owner | Integrator after G0 + Founder. |

### Variant G0-E — Delete from `migrations/` (move to baseline/seed)

| | |
|---|---|
| Action | Remove the file so CLI no longer applies it. |
| Risk | CI `db reset` would **not** create `decisions` / `exclusivity_outcomes`. Follow-up writers fail. If prod objects exist only because of this file + manual SQL, deleting it does not drop prod — but CI/ephemeral parity breaks. |
| Rollback | Restore the file. |
| GO owner | Founder. **Not recommended** without a replacement seed proven on `db reset`. |

**LANE 16 recommendation (advisory, not GO):** do **not** delete (G0-E). Do **not** repair in this PR (G0-C). Prefer **G0-B or G0-D only after linked history is listed**. Default until that proof: **G0-A (keep)**.

---

## 3. Merged acquisition schema audit (this SHA)

Source of truth: `apps/crm/supabase/migrations/20260811220000_acquisition_core.sql` (commit `05ad07099`, PR #387). Additive; comments say it must **not** `ALTER public.leads` (file-content test asserts that).

### 3.1 Composite tenant / lead binding

| Binding | Present? | Evidence |
|---|---|---|
| `acquisition_accounts`: `UNIQUE (agency_id, id)` | YES | acquisition_core unique on `(agency_id, id)` |
| `acquisition_campaigns`: composite FK `(agency_id, acquisition_account_id) → acquisition_accounts(agency_id, id)` | YES | acquisition_core FOREIGN KEY |
| `acquisition_campaigns`: `UNIQUE (agency_id, id)` | YES | acquisition_core |
| `acquisition_events`: `agency_id uuid NOT NULL` | YES | no FK to accounts/campaigns |
| `acquisition_events.lead_id` | `text REFERENCES public.leads(id)` **nullable**, **not** composite | acquisition_core |
| `public.leads(agency_id, id)` unique | **NO** | `leads.id` is global `text` PK in `20260310_baseline_core_schema.sql`. `agency_id` added later in the same file (`add column if not exists agency_id`). No `UNIQUE (agency_id, id)` anywhere in `apps/crm/supabase/migrations/`. Stage 2 deferral is written in the migration header. |

**Consequence:** a row with `acquisition_events.agency_id = A` and `lead_id` pointing at a lead whose `leads.agency_id = B` is **legal DDL** today, because the FK is only on `leads.id` (globally unique PK), not on `(agency_id, lead_id)`.

**FORBID:** `acquisition_events.lead_id != NULL` until:

1. `UNIQUE (agency_id, id)` on `public.leads` exists **and** is proven on local reset **and** linked catalog, **and**
2. `acquisition_events` has composite FK `(agency_id, lead_id) REFERENCES leads(agency_id, id)`, **and**
3. a negative test (tenant A event + tenant B lead) fails with `23503`, **and**
4. GO from Founder + Principal Postgres.

Until then: insert events with `lead_id IS NULL` only. Attribution stays in `attribution_id` / `metadata` without a lead FK.

Negative test (required before any non-null `lead_id`): see N1.

### 3.2 Nullable dedupe key

DDL: `UNIQUE (agency_id, provider, provider_event_id, event_type)` with `provider_event_id text` **nullable**.

Postgres UNIQUE: `NULL` is distinct from `NULL`. Two rows with the same `(agency_id, provider, event_type)` and `provider_event_id IS NULL` **both succeed**.

Existing test `apps/crm/src/lib/acquisition/__tests__/acquisition-core-rls.test.ts` only inserts a **non-null** `provider_event_id`. It does **not** cover the NULL hole. Tests also skip when local Supabase env is absent — they are not a proof on this worktree (local DB down).

Negative test: N2.

Proposed invariant (design, not DDL): either `provider_event_id TEXT NOT NULL` or a partial unique index `WHERE provider_event_id IS NOT NULL` **plus** an application rule that NULL ids are rejected. **UNKNOWN — HUMAN DECISION** which.

### 3.3 Campaign identity per acquisition account

DDL today:

- `UNIQUE (provider, provider_campaign_id)` — **global**, not per account, not per tenant.
- `UNIQUE (agency_id, id)` on campaigns (row identity), not campaign-provider identity.

Two different `acquisition_accounts` cannot store the same `(provider, provider_campaign_id)` even if that is how Google/Meta actually names campaigns under different customers. Conversely, the same `provider_campaign_id` is **not** unique per `acquisition_account_id`.

This is **not** "campaign identity per acquisition account".

Negative tests: N3, N4.

Proposed invariant (design): `UNIQUE (acquisition_account_id, provider_campaign_id)` (and likely drop or narrow the global unique). **UNKNOWN — HUMAN DECISION**. Do not stamp a migration here.

Same class of issue on accounts: `UNIQUE (provider, customer_id)` is global, not `UNIQUE (agency_id, provider, customer_id)`. Re-connecting a customer_id to another tenant would `23505`. **UNKNOWN — HUMAN DECISION** whether global uniqueness is intended.

### 3.4 Provider parent/child invariant

`acquisition_accounts.provider` has `CHECK (provider IN ('GOOGLE', 'META', 'MICROSOFT'))`.

`acquisition_campaigns.provider` is `text NOT NULL` with **no CHECK** and **no** constraint that `campaigns.provider = accounts.provider`.

A campaign can be `provider = 'META'` under a `GOOGLE` account as long as the composite tenant FK matches.

Negative test: N5.

Proposed invariant (design): `CHECK` via trigger or composite FK that includes `provider`, e.g. `UNIQUE (agency_id, id, provider)` on accounts + FK `(agency_id, acquisition_account_id, provider)`. **UNKNOWN — HUMAN DECISION**.

### 3.5 Public-schema allowlist

File: `apps/crm/config/public-schema-allowlist.json` (103 strings on this SHA).

| Name | In allowlist? |
|---|---|
| `acquisition_accounts` | **MISSING** |
| `acquisition_campaigns` | **MISSING** |
| `acquisition_events` | **MISSING** |
| `decisions` | present |
| `exclusivity_outcomes` | present |
| `events` | present |
| `lead_events` | present |
| `lead_consents` | present |
| `lead_triage_idempotency` | present (no repo CREATE) |
| `rate_limit_buckets` | present |

Guard: `apps/crm/scripts/schema-governance-guard.mjs` compares live `rls_audit_snapshot()` table names to this JSON. Unexpected live tables fail CI; missing allowlisted tables also fail.

Workflow: `.github/workflows/schema-governance-guard.yml` — **schedule disabled** (2026-06-17) because `SCHEMA_GUARD_*` secrets were unset; `workflow_dispatch` remains. Guard state on this SHA: **recipe present, scheduled proof absent, live drift vs acquisition_* UNKNOWN**.

Backlog note still open in stale matrix: `fix/ci-ap019-guard` — CREATE TABLE in a migration should require allowlist + policy + verification in the **same** PR. Acquisition PR #387 did **not** add allowlist entries (file-content evidence on this SHA).

### 3.6 Tenant RLS registry

File: `apps/crm/tests/rls/tenant-table-registry.ts`.

`TENANT_TABLES` / `PLATFORM_TABLES` contain **none** of: `acquisition_accounts`, `acquisition_campaigns`, `acquisition_events`, `lead_consents`.

Acquisition RLS lives in a **separate** suite: `apps/crm/src/lib/acquisition/__tests__/acquisition-core-rls.test.ts` (skips without local env). Comment: existing `apps/crm/tests/rls/` suite is intentionally untouched.

Acquisition policies (repo): `acquisition_*_tenant` `FOR ALL TO authenticated` using `agency_id IN (SELECT public.profile_agencies_for_auth())`. Function defined in `apps/crm/supabase/migrations/20260419_enterprise_rls_profile_link.sql`.

Grants: authenticated gets SELECT/INSERT/UPDATE/DELETE on accounts and campaigns; events get SELECT/INSERT and `REVOKE UPDATE, DELETE FROM authenticated`. `service_role` gets `GRANT ALL` on all three — **append-only is not enforced for service_role**.

Negative tests: N6, N7, N8.

### 3.7 Schema governance guard state (summary)

| Check | State |
|---|---|
| Allowlist file | present, 103 names, **no** `acquisition_*` |
| Guard script | present, talks to **live** URL via secrets, not local reset |
| Workflow schedule | **disabled** |
| AP-019 same-PR allowlist+test | **not** satisfied for acquisition tables |
| Live unexpected-table result | **UNKNOWN — HUMAN DECISION** (no linked/live snapshot this lane) |

---

## 2. Command evidence (read-only, this worktree)

**CWD:** `C:\RealitkaAI\.worktrees\stf-p0-schema-truth`
**HEAD:** `5d6500106a67a864b049dc372ee0a2d6be793c6f`
**CLI used for linked list:** `npx supabase` resolved to **supabase@2.114.0** (no local `node_modules/.bin/supabase`; `npx` fetched the package). CI uses `supabase/setup-cli@v1` with `version: latest` — also unpinned. Do not assume the two CLIs parse version tokens identically.

### 2.1 Non-standard migration filenames

Command:

```powershell
Get-ChildItem apps/crm/supabase/migrations -File | Where-Object { $_.BaseName -notmatch '^\d{14}_[a-z0-9_]+$' }
```

Result (11 files):

| File | Version token (leading digits) | Notes |
|---|---|---|
| `apps/crm/supabase/migrations/2026_genome_layer2.sql` | `2026` | **Highest risk** — see §3 |
| `apps/crm/supabase/migrations/20260310_baseline_core_schema.sql` | `20260310` | 8-digit date; creates `leads` PK `id text` |
| `apps/crm/supabase/migrations/20260320_rls.sql` | `20260320` | |
| `apps/crm/supabase/migrations/20260411_performance_fee.sql` | `20260411` | Active; archived sibling `migrations-archive/20260411_semantic_search.sql` |
| `apps/crm/supabase/migrations/20260412_activity_stream_view.sql` | `20260412` | Active; two archived `20260412_*` files |
| `apps/crm/supabase/migrations/20260413_ai_insight_alias.sql` | `20260413` | |
| `apps/crm/supabase/migrations/20260418_enterprise_ai_intelligence.sql` | `20260418` | Creates `lead_events` |
| `apps/crm/supabase/migrations/20260419_enterprise_rls_profile_link.sql` | `20260419` | Defines `profile_agencies_for_auth()` |
| `apps/crm/supabase/migrations/20260424_google_calendar_oauth.sql` | `20260424` | |
| `apps/crm/supabase/migrations/20260602_agency_billing_and_credits.sql` | `20260602` | `credit_ledger.idempotency_key` **global** UNIQUE |
| `apps/crm/supabase/migrations/20260603_dashboard_insights_cache.sql` | `20260603` | |

Total live migrations: **94**. Duplicate *live* version prefixes among those 94: **none** (archive collisions are historical, not current directory duplicates).

### 2.2 Linked migration list

Command (from `apps/crm`):

```powershell
Set-Location apps/crm
npx supabase migration list --linked
```

Result (exit code 1):

```text
{"_tag":"Error","error":{"code":"LegacyProjectNotLinkedError","message":"Cannot find project ref. Have you run supabase link?"}}
```

`apps/crm/supabase/config.toml` `project_id = "revolis-crm-ci"` is the **local CI** project id, not a linked remote ref.

**STOP:** remote history is **UNKNOWN — HUMAN DECISION**. Do not invent applied/pending rows. Do not run `supabase migration repair`.

### 2.3 Sorter disagreement for `2026_genome_layer2.sql` (measured on this Windows Node)

Same 94-file set, three sorts:

| Sorter | Index of `2026_genome_layer2.sql` (0-based) | First file | Last file |
|---|---|---|---|
| JS default `Array.sort()` (UTF-16 / ASCII-ish) | **93 (last)** | `20260310_baseline_core_schema.sql` | `2026_genome_layer2.sql` |
| JS `localeCompare` (this Windows ICU locale) | **0 (first)** | `2026_genome_layer2.sql` | `20260811220000_acquisition_core.sql` |
| Leading-digit version token | **0 (first)** — token `2026` < `20260310` | `2026_genome_layer2.sql` | `20260811220000_acquisition_core.sql` |
| PowerShell `Sort-Object Name` (this session) | **first** | `2026_genome_layer2.sql` | `20260811220000_acquisition_core.sql` |

Prior repo note `docs/architecture/genome-layer2-audit.md` (LANE 4, 2026-08-11) reported Node `localeCompare` as **last**. That result is **not reproduced** on this agent host. The disagreement itself is the operational risk: CI Linux default sort ≠ Windows Explorer ≠ version-id parser.

Supabase CLI apply order is **UNKNOWN** for this CLI 2.114.0 without running reset (forbidden here). Genome SQL currently has **no FK to `agencies`**, so "apply first" can still succeed and hide the defect.

---

## 3. Decision variants for `2026_genome_layer2.sql`

**Do not execute any variant in this PR.**
**Do not assign a 14-digit replacement name here.** Integrator after G0 picks the timestamp after proof C.

### 3.1 What the file is (repo)

- Path: `apps/crm/supabase/migrations/2026_genome_layer2.sql` (71 lines).
- Introduced `fbcce7dbf` (PR #247); `agent` column patched `b8b4e7181` (PR #249).
- Objects: `public.decisions`, `public.exclusivity_outcomes`, view `public.genome_decision_open`.
- RLS: `ENABLE`; policies `decisions_service_role` / `exclusivity_outcomes_service_role` (`FOR ALL TO service_role` only). **No authenticated tenant policy** in this file.
- Allowlist: both table names **are** in `apps/crm/config/public-schema-allowlist.json` (`decisions`, `exclusivity_outcomes`).
- Tenant RLS registry `apps/crm/tests/rls/tenant-table-registry.ts`: **neither table listed**.
- RLS parity snapshot `apps/crm/docs/audit/rls-schema-parity-matrix.json` (`at`: 2026-06-26): `decisions` / `exclusivity_outcomes` = `on_prod: true`, `severity: P0`, gap `missing_tenant_policy_repo`. Snapshot is **stale relative to this SHA** (pre-dates July/August tables) but the repo policy gap is still visible in the SQL itself.
- Consumers: `apps/crm/src/lib/agents/followup/predictionWriter.ts`, `outcomeWriter.ts` (repo references; runtime prod presence **UNKNOWN** without catalog proof).

### 3.2 Exact options

| ID | Option | What changes | Risk | Rollback | Who owns GO |
|---|---|---|---|---|---|
| **G-KEEP** | Keep filename forever | Nothing | Permanent sorter/version-token hazard; every future CLI upgrade can reorder reset; `2026` collides conceptually with every 2026 timestamp | N/A (status quo) | Founder may accept residual risk **in writing**. Default: **reject as long-term**. |
| **G-RENAME** | Rename to a 14-digit file **after** proof C | Git mv of the same idempotent body; **no DDL change** if body stays identical | If remote history has version `2026`, CLI will see a new pending version and may try to **re-apply**. Re-apply of current idempotent SQL is *probably* safe, **not proven**. If history has no `2026` row (manual SQL only), a new version may apply on next push — still idempotent, still needs a dry-run GO. | Restore old filename + history row (requires repair — extra GO). | **Founder** (approve rename). **DB integrator after G0** (choose timestamp, run proof C, decide whether repair is required). |
| **G-ARCHIVE** | Move file to `apps/crm/supabase/migrations-archive/` and add a **new** stamped file with the same body | CI reset stops seeing the illegal name; linked DBs need an explicit history plan | Easy to double-create objects if both old version and new version apply on a DB that never had them; easy to **drop CI coverage** if archive happens before the new file is in the live path | Reverse the move | Same as G-RENAME. **Forbidden** to archive without the replacement file in the **same** PR. |
| **G-REPAIR** | `supabase migration repair` to mark `2026` reverted / new version applied | History only (if used correctly) | Repair against the wrong ref = silent prod history corruption. This lane **forbids** the command. | Repair in the opposite direction (also dangerous) | **Founder + integrator after G0**, only after proof C printout is attached to the PR. |
| **G-DELETE** | Delete the file | CI ephemeral DB loses `decisions` / `exclusivity_outcomes`; follow-up writers 500 | Breaks Loop 1/2 paths that assume the tables | Restore from git | **Rejected.** Header + PR #249 claim prod dependence. |
| **G-SPLIT-DDL** | Keep name for CI, put "real" history elsewhere | Two sources of truth | Worst option — guarantees A/B/C drift | Painful | **Rejected.** |

**Recommended sequence (still not execution):** proof C (linked list) → Founder picks **G-RENAME or G-ARCHIVE** → integrator after G0 assigns timestamp → **only if** remote has version `2026`, a **separate** GO for G-REPAIR → never bundle with STF feature DDL.

Negative test for any rename/repair PR (must exist before merge):

1. Linked list before/after attached as artifacts (proof C).
2. Fresh local reset (proof B) still creates `decisions.agent` NOT NULL default.
3. Negative: applying the new version on a DB that already has the tables does not `DROP` data (idempotence).
4. Negative: CI Linux ASCII sort and CLI version sort produce the **same** apply order as documented in that PR.

---
## 4. Design (not implementation): STF durability primitives

The technical addendum is an **unapproved draft**. The following is design against **repo-proven** tables, not a CREATE statement.

### 4.1 Immutable permission receipt

**Need (draft):** purpose, channel, legal basis, wording hash, evidence, recipient, expiry, withdrawal — not a boolean.

**Today:** `public.lead_consents` (`20260722120000_sandbox_gdpr_consent.sql`): `lead_id`, `tenant_slug`, `privacy_policy_version`, `acknowledged_at`, `marketing_opt_in boolean`, `created_at`. RLS via lead to `leads.agency_id` + `profile_agencies_for_auth()`. Authenticated has UPDATE/DELETE. Not in `tenant-table-registry.ts`.

**Verdict: NEW table** (do not stretch `lead_consents` into an append-only receipt). Keep `lead_consents` as the valuation-widget boolean audit it is.

Design invariants (no SQL file in this PR):

- Insert-only for `authenticated` and for `service_role` except a dedicated withdrawal RPC that inserts a new row (`status = withdrawn`) rather than updating.
- `REVOKE UPDATE, DELETE` from `anon` and `authenticated`.
- Optional: `BEFORE UPDATE OR DELETE` trigger raising an exception even for `service_role` (otherwise GRANT ALL bypasses REVOKE, as on `acquisition_events` today).
- Tenant column `agency_id NOT NULL` with RLS `profile_agencies_for_auth()` — do not rely only on `tenant_slug` text.
- No FK to `leads` until lead tenant binding is the same composite story as section 3.1. Receipts may exist **before** a CRM lead. Prefer `subject_id` / `anonymous_session_id` first.

Negative tests: N9, N10.

### 4.2 Service-only suppression

**Need:** global/tenant suppression checked synchronously before every send/call; withdrawal propagation.

**Today:** no `suppression` table in `apps/crm/supabase/migrations/`. Closest: `rate_limit_buckets` (not suppression) and `lead_consents.marketing_opt_in` (not a blocklist).

**Verdict: NEW table**, `service_role` only (RLS enabled, **no** authenticated policies — same pattern as `20260504100000_rate_limit_buckets.sql`). Keys hashed (see 4.5). Tenant-scoped `UNIQUE (agency_id, channel, hashed_identifier)` plus a platform-level row namespace for global suppression (`agency_id` sentinel **or** a separate table). **UNKNOWN — HUMAN DECISION** whether global lives in the same table.

Negative tests: N11, N12.

### 4.3 Journey event ledger

**Need:** append-only business events with `event_id`, schema version, tenant, subject/anonymous id, journey id, consent snapshot id, idempotency key, payload **without raw PII**. Authority for history; CRM remains operational state; GA4 is a destination.

**Today:** several event-ish tables — none match. See section 5.

**Verdict: NEW table** (name chosen by integrator after G0; do not reuse `events` / `lead_events` / `acquisition_events`).

Design invariants:

- `agency_id NOT NULL`, RLS tenant policy, `REVOKE UPDATE, DELETE` from authenticated.
- `lead_id` **nullable** and **forbidden non-null** until section 3.1 is proven (same forbid as acquisition events).
- Unique idempotency: `UNIQUE (agency_id, idempotency_key)` with `idempotency_key NOT NULL`.
- No `agency_id IS NULL` escape hatch (Wave A closed that class for `lead_events` in `20260616123000_rls_wave_a_hardening.sql`; do not reintroduce it).

Negative tests: N13, N14.

### 4.4 Transactional outbox

**Need:** capture RPC writes lead/consent/event/outbox atomically; consumer is idempotent with retry/DLQ.

**Today:** no `outbox` / `transactional_outbox` table in repo migrations. Notifications are described as fire-and-forget in the unapproved addendum — not re-proven here.

**Verdict: NEW table**, same transaction as capture. Columns (design): `id`, `agency_id`, `topic`, `payload jsonb` (no raw PII), `created_at`, `available_at`, `attempts`, `locked_at`, `processed_at`, `error`. Unique `(agency_id, dedupe_key)`.

Do not use `acquisition_events.processing_status` as a general outbox (wrong domain; authenticated INSERT allowed; service_role can UPDATE).

Negative tests: N15.

### 4.5 Tenant-scoped idempotency and hashed bearer tokens

**Idempotency today:**

| Mechanism | Tenant-scoped in DDL? | Notes |
|---|---|---|
| `credit_ledger.idempotency_key` UNIQUE INDEX (`20260602_agency_billing_and_credits.sql`) | **NO** — global unique | App prefixes `purchase:${agencyId}:…`. Two tenants using the same raw key would collide. |
| `lead_triage_idempotency` | **UNKNOWN** | In allowlist + June prod snapshot; **no CREATE** in `apps/crm/supabase/migrations/`; **no** `apps/crm/src` references found this SHA. |
| `rate_limit_buckets` PK `(key, window_end)` | N/A (not idempotency of a business write) | Platform; no agency_id. |
| Acquisition event unique | Partial; NULL hole | section 3.2 |

**Verdict:** STF submission idempotency = **NEW** `UNIQUE (agency_id, idempotency_key)` table (or column on the capture ledger). Do **not** extend global `credit_ledger` unique. Do **not** assume `lead_triage_idempotency` shape until linked `\d` is proven.

**Bearer tokens today:** `public.api_keys.api_key TEXT UNIQUE NOT NULL` (`20260426193000_b2b_data_api.sql`) stores the **lookup secret in plaintext**, indexed as `(api_key, is_active)`. Parity matrix (June): `api_keys` `on_prod: false`.

**Verdict: NEW** hashed-token store for STF/public capture (HMAC/SHA-256 of the secret, store only hash + prefix). Never extend `api_keys.api_key` plaintext. Unique `(agency_id, token_hash)`.

Negative tests: N16, N17.

---

## 5. Extend vs new vs existing tables

| Existing | Path | Why |
|---|---|---|
| `public.events` (`20260425231407_event_pipeline.sql`) | **Do not extend** for journey ledger | Scoped to `profile_id` (not `agency_id`). `entity_type` CHECK is CRM entities (`lead`,`property`,…). Mutable grants not append-only. Registry: `scope: profile_id`. Wrong grain. |
| `public.lead_events` (`20260418_enterprise_ai_intelligence.sql` + Wave A policies) | **Do not extend** | `lead_id text NOT NULL` — cannot record pre-lead journey. `type`/`value` text, no schema version, no consent snapshot. `agency_id` historically nullable (`ON DELETE SET NULL`). Operational CRM stream, not business ledger. |
| `public.lead_consents` | **Do not extend** into receipt | Boolean opt-in; authenticated UPDATE/DELETE; requires `lead_id NOT NULL`. Keep as widget audit. **NEW** receipt table. |
| `public.lead_triage_idempotency` | **Do not extend** until proven | No repo DDL. Allowlist-only ghost. **UNKNOWN — HUMAN DECISION** whether to document-and-migrate or drop from allowlist. |
| `public.rate_limit_buckets` | **Do not extend** | Sliding-window counter. No tenant. Right pattern to **copy** (RLS on, zero authenticated policies) for suppression/rate-limit, not to overload. |
| `public.acquisition_events` | **Do not extend** into journey ledger | Ads/provider ledger. `lead_id` forbid. Authenticated INSERT. Different unique key. |
| `credit_ledger` idempotency | **Do not extend** | Billing unique is global. |
| `api_keys` | **Do not extend** | Plaintext secret. |

**NEW (after G0, integrator stamps):** permission receipt; suppression; journey ledger; outbox; tenant idempotency keys; hashed bearer tokens.

Reuse **patterns**, not tables: Wave A `profile_agencies_for_auth()` RLS; acquisition append-only REVOKE; `rate_limit_buckets` service-only RLS; `credit_ledger` app-prefixed keys but with **DDL** `UNIQUE (agency_id, key)`.

---

## 4. Audit — merged acquisition schema (this SHA)

**Source of truth:** `apps/crm/supabase/migrations/20260811220000_acquisition_core.sql` (merged `05ad07099`, PR #387).
**File-level tests:** `apps/crm/src/lib/acquisition/__tests__/acquisition-core-migration.test.ts` (always runs; asserts SQL text).
**DB tests:** `apps/crm/src/lib/acquisition/__tests__/acquisition-core-rls.test.ts` — **skip if local env missing**; not a substitute for proof B on this agent.

Blueprint comments inside the SQL (not independently re-verified against a locked PDF): `lead_id` is text (live `leads.id`); `UNIQUE(agency_id,id)` on `leads` deferred to Stage 2.

ZISTI (`docs/architecture/acquisition-os-stage0-zisti-report.md`): same deferral; Stage 0 FK is simple `leads(id)`, nullable.

### 4.1 Composite tenant / lead binding

| Binding | Present? | Evidence | Gap |
|---|---|---|---|
| `acquisition_accounts.agency_id` → `agencies(id)` | Yes | column + `REFERENCES public.agencies(id)` | None for parent agency |
| `UNIQUE (agency_id, id)` on accounts | Yes | enables composite FK from campaigns | |
| Campaigns composite FK `(agency_id, acquisition_account_id)` → `acquisition_accounts (agency_id, id)` | Yes | SQL + negative test in `acquisition-core-rls.test.ts` ("rejects composite FK mismatch") | |
| `UNIQUE (agency_id, id)` on **`leads`** | **No** | `leads` created `id text primary key` in `20260310_baseline_core_schema.sql`; `agency_id` added nullable `REFERENCES agencies(id) ON DELETE SET NULL` in the same file; no later migration adds `UNIQUE (agency_id, id)` (repo search on this SHA) | **Blocks composite `(agency_id, lead_id)` FK** |
| `acquisition_events.lead_id` → `leads(id)` | Yes, **simple, nullable** | `lead_id text REFERENCES public.leads (id)` | Cross-tenant attach possible: event `agency_id=A` + `lead_id` belonging to agency B |
| Events → account or campaign | **No** | no `acquisition_account_id` / `acquisition_campaign_id` columns | Cannot prove which ad account produced the event |

**FORBIDDEN until tenant binding is proven:**

```text
acquisition_events.lead_id IS DISTINCT FROM NULL
```

"Proven" means, on the **same** database that will take writes:

1. Proof B or C shows `UNIQUE (agency_id, id)` (or equivalent) on `public.leads`.
2. A composite FK `(agency_id, lead_id)` → `leads(agency_id, id)` exists (or an equivalent CHECK/TRIGGER that rejects `leads.agency_id <> events.agency_id`).
3. Negative test N1 is green on that database.

Until then: ingest paths must persist `lead_id = NULL`. Application code that writes a non-null `lead_id` is a **spec violation**, even if Postgres accepts it today.

### 4.2 Nullable dedupe key

```sql
UNIQUE (agency_id, provider, provider_event_id, event_type)
```

`provider_event_id text` is **nullable** (no `NOT NULL`). In PostgreSQL unique constraints, `NULL` values are distinct (unless `NULLS NOT DISTINCT`, not used here). Multiple rows with the same `(agency_id, provider, event_type)` and `provider_event_id IS NULL` **will all insert**.

Partial unique index `WHERE provider_event_id IS NOT NULL` is also absent.

`acquire_dedup_keys` (`apps/crm/supabase/migrations/20260629120000_acquire_dedup_keys.sql`) is a **different** table: PK `key text` **global**, `agency_id` not in the key. Cross-tenant key collision is possible if two agencies hash to the same `key`. Not in allowlist. Not in tenant registry.

### 4.3 Campaign identity per acquisition account

| Constraint | SQL | Meaning |
|---|---|---|
| `UNIQUE (provider, provider_campaign_id)` | global per provider | Two **accounts** (even two **agencies**) cannot store the same provider campaign id |
| `UNIQUE (agency_id, id)` on campaigns | surrogate | Does **not** scope provider campaign id to an account |
| Missing | `UNIQUE (acquisition_account_id, provider_campaign_id)` or `UNIQUE (agency_id, provider, provider_campaign_id)` | Blueprint "campaign identity per acquisition account" is **not** what shipped |

Google campaign ids are usually globally unique at the provider, so this may be harmless — **UNKNOWN — HUMAN DECISION** whether MCC/child accounts can ever reuse ids. Do not "fix" without a GO and a negative test.

### 4.4 Provider parent/child invariant

- `acquisition_accounts.provider CHECK (provider IN ('GOOGLE','META','MICROSOFT'))`.
- `acquisition_campaigns.provider text NOT NULL` — **no CHECK**, **no** `CHECK (provider = parent.provider)`, **no** trigger.
- Events also carry independent `provider text NOT NULL` with no FK to an account.

A campaign row can be `provider='META'` while its composite-FK parent account is `GOOGLE`. Postgres will accept it. RLS will not catch it.

### 4.5 Public-schema allowlist

File: `apps/crm/config/public-schema-allowlist.json` (**103** strings on this SHA).

| Table | In allowlist? |
|---|---|
| `acquisition_accounts` | **NO** |
| `acquisition_campaigns` | **NO** |
| `acquisition_events` | **NO** |
| `lead_consents` | YES |
| `lead_triage_idempotency` | YES |
| `events` / `lead_events` / `rate_limit_buckets` | YES |
| `acquire_dedup_keys` | **NO** |
| `decisions` / `exclusivity_outcomes` | YES |

If schema-governance-guard ever runs against a catalog that includes the three `acquisition_*` tables, it will fail as **unexpected** (guard treats snapshot tables not in the JSON as drift). Conversely, allowlisted names missing from a catalog fail as **missing**. Current scheduled guard = off (§1.1).

Allowlist also contains non-table strings (`AI AGENT AUTOMAT ONBOARDING`, `gpmmfashion@gmail.com tabulka`). That is existing dirt; do not silently clean in an STF PR.

### 4.6 Tenant RLS registry

**Live test registry:** `apps/crm/tests/rls/tenant-table-registry.ts` (consumed by `apps/crm/tests/rls/rls-tenant-isolation.test.ts`, included from `apps/crm/vitest.config.js`).

On this SHA the registry lists **`events`** (scope `profile_id`) and **`lead_events`** (scope `agency_id`) and **`rate_limit_buckets`** under `PLATFORM_TABLES`. It does **not** list:

- `acquisition_accounts` / `acquisition_campaigns` / `acquisition_events`
- `lead_consents`
- `lead_triage_idempotency`
- `acquire_dedup_keys`
- `decisions` / `exclusivity_outcomes`

Acquisition RLS is a **parallel** suite (`acquisition-core-rls.test.ts`) that skips without env. It is **not** wired into `TENANT_TABLES`.

**Stale prod snapshot registry:** `apps/crm/docs/audit/rls-schema-parity-matrix.json` / `.md`, generated **2026-06-26T06:51:26.123Z** via `rls_audit_snapshot()` (`apps/crm/supabase/migrations/20260613000001_rls_audit_snapshot_rpc.sql`). Snapshot: 96 prod tables. It cannot know August acquisition tables or July `lead_consents`. Treat as historical, not current prod.

Wave A policy rewrite list (`apps/crm/supabase/migrations/20260616123000_rls_wave_a_hardening.sql`) also omits acquisition / consents / genome.

Helper used by acquisition policies: `public.profile_agencies_for_auth()` from `apps/crm/supabase/migrations/20260419_enterprise_rls_profile_link.sql`.

### 4.7 Schema governance guard state

| Piece | State on this SHA |
|---|---|
| Script | `apps/crm/scripts/schema-governance-guard.mjs` — compares `rls_audit_snapshot()` to allowlist |
| Workflow | `.github/workflows/schema-governance-guard.yml` — **cron commented out**; `workflow_dispatch` only; requires `SCHEMA_GUARD_SUPABASE_URL` + `SCHEMA_GUARD_SUPABASE_SERVICE_ROLE_KEY` |
| RPC grants | `rls_audit_snapshot` executable by `service_role` only |
| Acquisition coverage | **None** (tables not allowlisted; guard not on PR path) |
| Code-contract comment | Guard was disabled because it trained "always red" fatigue |

### 4.8 Negative test scenarios (required before any follow-on DDL)

Every invariant below needs a failing-insert/update test. Existing coverage is marked.

| ID | Invariant | Negative scenario | Today | Required test |
|---|---|---|---|---|
| **N1** | Event cannot bind a lead from another tenant | `INSERT acquisition_events (agency_id=A, lead_id=<lead of B>)` | **SUCCEEDS** (simple FK) | Must become `23503` or trigger reject **after** composite binding. Until then, **do not write non-null lead_id** |
| **N2** | Event lead_id stays NULL pre-binding | App/service inserts `lead_id <> NULL` | Allowed by SQL | Test **must fail the pipeline** (lint/verification) even if Postgres accepts |
| **N3** | Composite campaign FK | Campaign `agency_id=A` + `acquisition_account_id` of B | Rejected (`23503`) — covered in `acquisition-core-rls.test.ts` | Keep |
| **N4** | Provider parent/child | Campaign `provider='META'` under account `provider='GOOGLE'` | **SUCCEEDS** | Must fail (`23514`/CHECK/trigger) if invariant is adopted |
| **N5** | Dedupe with NULL provider_event_id | Two inserts same `(agency_id, provider, event_type)` and `provider_event_id NULL` | **SUCCEEDS** (NULL≠NULL) | Either forbid NULL **or** use `UNIQUE NULLS NOT DISTINCT` / partial unique; test both duplicates |
| **N6** | Dedupe with non-null id | Duplicate `(agency_id, provider, provider_event_id, event_type)` | `23505` — covered | Keep |
| **N7** | Campaign id per account | Two accounts, same `(provider, provider_campaign_id)` | `23505` global | If per-account identity is required, this test **inverts** (must succeed across accounts, fail within one) — **HUMAN DECISION** |
| **N8** | Global account customer_id | Two agencies, same `(provider, customer_id)` | `23505` | Confirm whether MCC share / client-owned ids can collide — **UNKNOWN — HUMAN DECISION** |
| **N9** | Append-only events | Authenticated `UPDATE`/`DELETE` on `acquisition_events` | Privilege revoked in SQL; test expects error | Keep; also test `service_role` **can** update `processing_status` (ops need) vs must not rewrite `payload_hash` |
| **N10** | Cross-tenant RLS | User A `SELECT` B's accounts/campaigns/events | Empty — covered | Keep; add `WITH CHECK` insert of B's `agency_id` as user A |
| **N11** | Allowlist drift | Guard vs catalog containing `acquisition_*` | Would fail unexpected | Add names **in the same PR** as first proof-B that creates them in the guarded catalog |
| **N12** | Registry drift | `TENANT_TABLES` omits `acquisition_*` | Isolation suite never touches them | Add three rows + fixtures in `apps/crm/tests/rls/` in the same PR as N1–N10 DB tests are made non-skipping in CI |

---
## 6. Proposed invariants to negative test scenarios

Every invariant below is **proposed**. None are GO to ship SQL. Tests that already exist are marked.

| ID | Invariant | Negative scenario (must fail) | Status |
|---|---|---|---|
| N1 | **FORBID** non-null `acquisition_events.lead_id` until composite binding | Insert event `agency_id=A`, `lead_id=<lead of B>`. Must not succeed as a bound lead. Until composite FK exists, **application must reject any non-null `lead_id`**. After FK: must be `23503`. | **FORBIDDEN** now. Not covered by current RLS tests (they insert events **without** `lead_id`). |
| N2 | Dedupe unique must not ignore NULLs | Two inserts same `(agency_id, provider, event_type)` with `provider_event_id NULL`. Today both succeed — **known hole**. After fix: second `23505` or first rejected by NOT NULL. | Missing test |
| N3 | Campaign identity per account (proposed) | Same `provider_campaign_id` on **two accounts** of same provider. Today: global unique blocks. After per-account unique: should succeed if that is the product rule — **UNKNOWN — HUMAN DECISION**. Write the test to the chosen rule. | Missing |
| N4 | Inverse of N3 | Two campaigns on **one** account with the same `provider_campaign_id`. Must `23505`. Today may already fail via global unique — not the same invariant. | Missing |
| N5 | Parent/child provider match | Campaign `provider='META'` + account `provider='GOOGLE'` (composite tenant FK still valid). Must fail after CHECK/FK. Today succeeds. | Missing |
| N6 | Cross-tenant RLS | User of A SELECTs B's accounts/campaigns/events. Must return 0 rows. | Written in `acquisition-core-rls.test.ts`; **not executed** on this worktree (no local DB). |
| N7 | Composite tenant FK | Campaign `agency_id=A` + `acquisition_account_id` belonging to B. Must `23503`. | Written; not executed here. |
| N8 | Append-only authenticated | Authenticated UPDATE/DELETE on `acquisition_events`. Must fail. | Written; not executed here. **Does not** cover `service_role` UPDATE. |
| N9 | Receipt immutability | Authenticated UPDATE/DELETE on a permission receipt row. Must fail. Withdrawal = new row. | Design only |
| N10 | Receipt without tenant | Insert receipt with `agency_id` of B as user of A. Must fail RLS. Insert with `agency_id` NULL. Must fail NOT NULL. | Design only |
| N11 | Suppression service-only | `authenticated` SELECT/INSERT on suppression. Must fail (no policy / revoke). | Design only |
| N12 | Suppression bypass | Outbound send when a matching suppression row exists. Must not send (application + DB check). | Design only |
| N13 | Journey ledger append-only | Authenticated UPDATE of payload. Must fail. | Design only |
| N14 | Journey `lead_id` forbid | Same as N1 on the journey table. **Non-null forbidden** until tenant binding proven. | Design only |
| N15 | Outbox same-transaction | Capture RPC inserts lead then throws before outbox. After rollback: **zero** leads, consents, events, outbox rows. | Design only |
| N16 | Tenant idempotency | Tenant A and B both insert key `'dup'`. Must both succeed. Second insert for A must `23505`. Global-only unique (`credit_ledger` style) is the **wrong** behavior. | Design only |
| N17 | Hashed bearer | Insert plaintext token into hash column; lookup with raw token must not match a stored raw secret. Duplicate `(agency_id, token_hash)` must `23505`. Cross-tenant same hash: **UNKNOWN — HUMAN DECISION** (global vs tenant unique). | Design only |
| N18 | Allowlist drift | After any future CREATE TABLE, `schema-governance-guard.mjs` against a DB that has the table while JSON omits it must exit 1. Acquisition tables already have this gap **if** they exist live. | Guard exists; live result UNKNOWN |
| N19 | Registry gap | `tests/rls/` suite does not enumerate `acquisition_*` or `lead_consents`. Adding them without GO still required before claiming tenant isolation in the main suite. | Gap |

---

## 7. What this lane did not do

- No new SQL file.
- No `supabase db reset`, `db push`, `migration repair`, `link`, or production DDL.
- No future timestamp assigned.
- No treat-as-proven of unapproved STF drafts.
- No claim that CI `db reset` equals linked history.

---

## 8. Blockers and GO

| Blocker | Owner |
|---|---|
| Linked `npx supabase migration list --linked` — not linked (`LegacyProjectNotLinkedError`) | Human with access to run **read-only** list (or explicit GO to `supabase link`). Not this lane. |
| Local reset proof — `:54322` down | Human/CI. Separate from linked. |
| `acquisition_events.lead_id` non-null | **Forbidden** until composite binding proven. |
| `acquisition_*` missing from allowlist + `tenant-table-registry.ts` | Integrator after G0 (same PR as any follow-up DDL, AP-019). |
| `2026_genome_layer2.sql` version token | Founder chooses G0-A through G0-E; integrator stamps only after linked list. |
| `lead_triage_idempotency` ghost | **UNKNOWN — HUMAN DECISION** |
| Schema-guard secrets / schedule | Ops. Disabled workflow is not a live proof. |

**Next GO (one task):** human produces a **read-only** artifact: `npx supabase migration list --linked` output (or documented STOP if still unlinkable) **and** a local `migration list --local` after an explicit `supabase start` GO — still **no** repair, **no** reset of linked, **no** prod DDL. Owner: Founder / ops of project ref commented in `apps/crm/supabase/config.toml`. Integrator after that proof owns whether Genome is G0-B/D and whether acquisition allowlist backfill is its own PR.

Merge of this docs PR: **GO REQUIRED**. This lane does not merge.

### Cited paths (this worktree)

- `apps/crm/supabase/migrations/20260811220000_acquisition_core.sql`
- `apps/crm/supabase/migrations/2026_genome_layer2.sql`
- `apps/crm/supabase/migrations/20260310_baseline_core_schema.sql`
- `apps/crm/supabase/migrations/20260418_enterprise_ai_intelligence.sql`
- `apps/crm/supabase/migrations/20260419_enterprise_rls_profile_link.sql`
- `apps/crm/supabase/migrations/20260425231407_event_pipeline.sql`
- `apps/crm/supabase/migrations/20260426193000_b2b_data_api.sql`
- `apps/crm/supabase/migrations/20260504100000_rate_limit_buckets.sql`
- `apps/crm/supabase/migrations/20260602_agency_billing_and_credits.sql`
- `apps/crm/supabase/migrations/20260616123000_rls_wave_a_hardening.sql`
- `apps/crm/supabase/migrations/20260722120000_sandbox_gdpr_consent.sql`
- `apps/crm/config/public-schema-allowlist.json`
- `apps/crm/scripts/schema-governance-guard.mjs`
- `.github/workflows/schema-governance-guard.yml`
- `.github/workflows/saas-grade-pipeline.yml`
- `.github/workflows/nightly-playwright.yml`
- `apps/crm/tests/rls/tenant-table-registry.ts`
- `apps/crm/src/lib/acquisition/__tests__/acquisition-core-rls.test.ts`
- `apps/crm/src/lib/acquisition/__tests__/acquisition-core-migration.test.ts`
- `apps/crm/docs/audit/rls-schema-parity-matrix.json` (stale: 2026-06-26)
- `apps/crm/supabase/config.toml`
## 5. Design only — STF persistence (not implementation)

**DRAFT-INTENT** source: unapproved technical addendum (canonical entities, consent receipt minimum, business event contract, P0 "capture is not atomic").
**Repo fact:** no `CREATE TABLE` for these names on this SHA (`rg` over `apps/crm/**/*.sql` empty for outbox / permission_receipt / suppression / journey_event).

Integrator after G0 implements **after** proofs B+C and Founder GO. No timestamp in this document.

### 5.1 Immutable permission receipt

**Intent:** one append-only row per captured permission (purpose × channel × recipient × wording), not a boolean on `leads`.

Minimum columns (design): `id`, `agency_id`, `subject_id` (or `lead_id` **only after N1 is green**), `purpose`, `channel`, `recipient_id`, `legal_basis`, `status`, `notice_version`, `wording_hash`, `source`, `captured_at`, `evidence_hash`, `valid_from`, `expires_at`, `withdrawn_at`.

| Invariant | Negative test |
|---|---|
| `UNIQUE (agency_id, id)` + tenant RLS via `profile_agencies_for_auth()` | User A reads B's receipt → 0 rows |
| Authenticated: `INSERT`/`SELECT` own tenant; **REVOKE UPDATE, DELETE** | Authenticated `UPDATE status` / `DELETE` → error (same pattern as `acquisition_events`) |
| Withdrawal = **new** receipt or status change **only via security-definer RPC** | Direct `UPDATE withdrawn_at` as `authenticated` → fail |
| `wording_hash` / `evidence_hash` `NOT NULL` | Insert with null hashes → `23502` |
| Do not FK `lead_id` until N1 | Non-null `lead_id` → forbidden (same rule as §4.1) |

**Extend vs new:** do **not** mutate `lead_consents` into this shape in-place (see §6). New table (name owned by integrator). Optional later backfill from `lead_consents` is a separate GO.

### 5.2 Service-only suppression

**Intent:** global/tenant stop-list consulted synchronously before send/call. AI/CRM must not bypass.

Design: `agency_id`, `channel`, `identifier_hmac` (not raw email/phone), `reason`, `source_receipt_id`, `created_at`, `UNIQUE (agency_id, channel, identifier_hmac)`.

| Invariant | Negative test |
|---|---|
| RLS enabled; **no** `authenticated` policies (mirror `rate_limit_buckets` / `acquire_dedup_keys`) | Anon/authenticated `SELECT`/`INSERT` → 0 / error |
| Grants: `service_role` only | `GRANT` to `authenticated` present → CI fail |
| Raw PII column absent | Insert `email text` → schema test fail |
| Cross-tenant HMAC isolation | Same raw email, two tenants, keyed HMAC → two rows; **unkeyed** SHA collision across tenants → fail the design review |

### 5.3 Journey event ledger

**Intent:** append-only business history. GA4/Meta are destinations, not master. **DRAFT-INTENT** event names live in the addendum; they are not a schema.

Design: `event_id` (client or server UUID), `event_name`, `schema_version`, `occurred_at`, `received_at`, `agency_id`, `subject_id` **nullable until N1**, `journey_id`, `source`, `consent_receipt_id`, `idempotency_key`, `payload jsonb` **without raw PII**, `UNIQUE (agency_id, idempotency_key)`.

| Invariant | Negative test |
|---|---|
| Append-only for `authenticated` | `UPDATE`/`DELETE` revoked |
| Tenant RLS on `agency_id` | Cross-tenant select empty |
| `idempotency_key` tenant-scoped unique | Same key, two agencies → **both succeed**; same key same agency → `23505` |
| No reuse of `public.events.entity_type` CHECK list without a migration that expands it | Insert `event_name=service_contact_requested` into current `events` → **CHECK fail** (`entity_type IN (lead,property,...)` in `20260425231407_event_pipeline.sql`) |

### 5.4 Transactional outbox

**Intent:** close P0 "notification is not durable" (`void runInboundLeadTriageAndNotify` — **DRAFT-INTENT** / code not re-audited in this lane). Capture RPC writes ledger + outbox in **one** transaction.

Design: `id`, `agency_id`, `aggregate_type`, `aggregate_id`, `payload jsonb`, `status` (`pending`/`published`/`dead`), `attempt_count`, `available_at`, `published_at`, `UNIQUE (agency_id, idempotency_key)`.

| Invariant | Negative test |
|---|---|
| Row inserted in same transaction as receipt + ledger | Kill after lead insert, before outbox → **zero** leads (RPC rollback). Today's compensatory delete is the anti-pattern to replace |
| Consumer is `service_role` only | Authenticated `UPDATE status='published'` → fail |
| Retry does not duplicate side effects | Re-publish same `idempotency_key` → no second downstream send (consumer test) |
| Poison message → `dead`, not infinite loop | `attempt_count` cap |

Existing adjacent pattern: `credit_ledger.idempotency_key` is **globally** unique (`credit_ledger_idem_uq` in `20260602_agency_billing_and_credits.sql`) — **do not copy that**. STF keys must be tenant-scoped.

### 5.5 Tenant-scoped idempotency and hashed bearer tokens

**Idempotency (capture + webhook + Ads):** `PRIMARY KEY (agency_id, key)` or `UNIQUE (agency_id, key)` + RLS. Negative: agency B replays agency A's key → **insert succeeds** (no collision) and does not reveal A's row.

**Hashed bearer (widget / magic link / unsubscribe):**

- Store `token_hash = HMAC-SHA256(raw, server_secret)` (or per-tenant key). **Never** store raw bearer.
- `UNIQUE (agency_id, token_hash)`.
- Lookup: hash then select; timing-safe compare in app.

| Invariant | Negative test |
|---|---|
| Raw token column absent | Schema contains `token text` without `hash` → fail |
| Dictionary-attack resistance | Plain `sha256(email)` used as match key → reject in review (addendum: keyed HMAC) |
| Cross-tenant token | Stolen hash from tenant A must not match tenant B even if raw token identical **if** HMAC is tenant-keyed |
| Authenticated cannot `SELECT` hashes of other agencies | RLS |

Do not reuse `rate_limit_buckets.key` (unscoped text PK) as a bearer store.

---

## 6. Extend vs new vs existing tables

| Existing object | Path | Why | What would break if misused |
|---|---|---|---|
| `public.events` (`20260425231407_event_pipeline.sql`) | **Do not extend** as STF journey ledger | Scoped by `profile_id`, not `agency_id`. `entity_type` CHECK is a closed list. RLS: "users see/insert own **profile** events". Registry: `scope: profile_id`. | Tenant journey events would either fail CHECK or leak/mix with product analytics under profile RLS |
| `public.lead_events` (`20260418_enterprise_ai_intelligence.sql`) | **Do not extend** as permission/journey ledger | CRM activity crumbs (`type`/`value` text); `lead_id NOT NULL` FK to `leads(id)` (same simple FK problem as N1); historical policies allowed `agency_id IS NULL` (later Wave A). Isolation suite **does** cover it as tenant table | Mixing Ads/consent/journey types into `type text` has no schema_version, no append-only revoke, no wording hash |
| `public.lead_consents` (`20260722120000_sandbox_gdpr_consent.sql`) | **Keep**; **do not morph** into permission receipt | Valuation-widget GDPR audit: `lead_id NOT NULL`, `tenant_slug`, `privacy_policy_version`, `marketing_opt_in boolean`, `acknowledged_at`. RLS via `lead_id IN (leads where agency_id IN profile_agencies_for_auth())`. **No `agency_id` column.** Not in `TENANT_TABLES`. Comment: "queryable without parsing notes." | Adding purpose/channel/withdrawal in place couples widget consents to STF receipts and still inherits simple `leads(id)` FK |
| `public.lead_triage_idempotency` | **UNKNOWN origin — do not extend** | Allowlisted; parity snapshot 2026-06-26 says `on_prod: true`, `in_repo_migrations: false`, `has_agency_id: false`. **No `CREATE TABLE` in `apps/crm/supabase/migrations/` or `apps/crm/src`.** | Extending a table with no repo DDL is schema fiction. **UNKNOWN — HUMAN DECISION** how it was created |
| `public.rate_limit_buckets` (`20260504100000_rate_limit_buckets.sql`) | **Keep as platform limiter**; **not** outbox/idempotency/bearer | `PRIMARY KEY (key, window_end)`; RLS on, **no policies** (service_role implicit). Registry: `PLATFORM_TABLES`. Parity snapshot incorrectly flagged `in_repo_migrations: false` (parser miss: table created **without** `public.` prefix) | Putting STF capture keys here loses tenant uniqueness and retention semantics |
| `public.acquire_dedup_keys` | **Do not reuse for STF** | Global PK `key`; service_role policy only; not allowlisted | Cross-tenant collision; parallel to Ads ingest, not seller capture |
| `public.credit_ledger` idempotency | **Pattern only** (tenant column exists, unique is **global**) | Shows how **not** to unique-index STF keys | Global unique would leak "key already used" across tenants |
| **New tables** (receipt, suppression, journey ledger, outbox, tenant idempotency, token hashes) | **Default** | Closed CHECK lists, append-only grants, composite tenant FKs, service-only surfaces | Must ship with N-tests §4.8 / §5, allowlist rows, and `TENANT_TABLES` / `PLATFORM_TABLES` updates **in the same PR** |

`lead_consents` / `lead_events` / `events` remain valid for their current jobs. STF capture RPC should **write new objects** (and may also insert a `lead_consents` row for the widget path) rather than overload one table as five.

---
