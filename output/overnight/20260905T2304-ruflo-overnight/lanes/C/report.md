# Lane C — Portal contracts (Nehnutelnosti.sk / Reality.sk / Topreality)

**RUN_ID:** `20260905T2304-ruflo-overnight`  
**lane_id:** `C`  
**BASE_SHA:** `cf3604613cdbb6a7a279e175f2c792fb25591461`  
**accessed_at:** `2026-09-05`  
**status:** `PASS_WITH_CONDITIONS`  
**scope:** research_and_specs only (no product code writes)

## Executive summary

All three portals are operated under **United Classifieds (UC)** / Realsoft admin ecosystem. Public sources confirm **automated listing sync exists**, but **full production import credentials, per-portal activation, and downloadable XSD/OpenAPI artifacts are vendor-gated** (commercial order + UC activation). Same owner **does not** prove identical per-brand public endpoints; no invented XSD/endpoints below.

**Direction clarity (critical):**
- **Export-from-CRM (publish to portals)** = CRM/software produces listings that UC **imports** into portal inventory (UC Import docs / Realsoft-facing feed).
- **Import-into-CRM (ingest from portals/admin)** = UC/Realsoft **exports** to a callback URL that CRM hosts (UC Export docs — POST to integrator URL).

Repo already has **inbound** Realsoft/UC receivers (`/api/realsoft/import`, `/api/uc/import`) for import-into-CRM. **Outbound publish-to-portal adapter is NOT present** as a production-ready module (scraping source is not a publish contract).

---

## 1. Integration matrix

| Concern | Nehnutelnosti.sk | Reality.sk | Topreality.sk | Notes |
|---|---|---|---|---|
| Operator | United Classifieds | United Classifieds | United Classifieds | Confirmed by third-party CRM vendors + Topreality ToS |
| Public open publish API (no contract) | **NO** (third-party: no public API) | **NO** (admin + paid 3rd-party import) | **NO** (ToS: Realsoft package; unauthorized import/export forbidden) | Scrapers are not vendor contracts |
| Documented UC Import (CRM to portals) | Shared UC Realsoft Import docs | Shared UC Realsoft Import docs | Shared UC Realsoft Import docs | Docs titled for Realsoft; activation per UC account UNKNOWN per brand |
| Documented UC Export (portals/admin to CRM/web) | Shared UC Realsoft Export docs | Shared UC Realsoft Export docs | Shared UC Realsoft Export docs | Push POST to integrator URL |
| Protocol (publicly evidenced) | REST/JSON validation + full-file import cadence | Same UC family | Same UC family | Agency blogs mention XML; **no public XSD retrieved** |
| SOAP | UNKNOWN / not evidenced | UNKNOWN / not evidenced | UNKNOWN / not evidenced | Do not invent |
| Auth (publish) | Vendor-activated UC import service | Import zo softveru 3. stran + portal linking | Realsoft firemny ucet + UC package | Production import credentials: UNKNOWN beyond export login fields |
| Auth (ingest into CRM) | Login user/pass on export callback (Wrong login data code 10) | Same pattern via Realsoft export | Same pattern | Repo implements bcrypt-mapped agency credentials |
| Testing | Public validation POST + swagger note; test-only caution | Same | Same | Validation URL public; schema.json HEAD returned 400 here |
| Access conditions | Paid/ordered UC import activation | Contract + activate 3rd-party import + email Reality.sk | ToS Balik + Realsoft registration; no unauthorized import/export | Commercial terms UNKNOWN (no public price sheet) |
| Create | Via full inventory file / export push | Same family | Same family | Exact create semantics per brand: UNKNOWN |
| Update | Same | Same | Same | Export ack codes 1=added, 2=edited |
| Deactivate | UNKNOWN as distinct from delete | UNKNOWN | UNKNOWN | JM Support (Realsoft to web) uses status to trash; portal deactivate API not separately public |
| Delete | Export payload `deleted` bool; ack code 3 | Same family | Same family | Import-direction delete beyond full replace cadence: UNKNOWN |
| Stable external IDs | Import: source_id / internal_reference; Export: import_id / user_id | Same family | Same family | Portal public listing ID mapping: UNKNOWN |
| Images | Import: Image[]; Export: images[{url,changed}] | Same family | Same family | Size/count limits: UNKNOWN |
| Limits | Validation: max ~1 min; avoid hundreds at once (test) | Import cadence every **12 hours** (full file) | Same family | Prod rate limits / listing caps: UNKNOWN |
| Errors | Validation HTTP 200/422; Export codes 1-4, 10-13 + field errors | Same family | Same family | Brand-specific error pages: UNKNOWN |
| Publish confirmation | Export returns importId + url | Same family | Same family | Import-direction (CRM to UC) confirmation channel: UNKNOWN |
| Per-portal distinct API | UNKNOWN | UNKNOWN | UNKNOWN | Public evidence = shared UC/Realsoft docs, not three OpenAPI sites |

### Direction glossary

| Term in UC docs | Revolis meaning | Flow |
|---|---|---|
| UC **Import** | Export-from-CRM / publish | CRM (or Realsoft) supplies inventory; UC pulls/validates; listings appear on UC portals |
| UC **Export** | Import-into-CRM | Realsoft/UC POSTs listing/agent JSON to CRM callback; CRM stores/maps |

Do **not** confuse with export na vlastny web (agency website ingest), which uses the same Export callback pattern but a different destination.

---

## 2. Per-portal findings

### 2.1 Nehnutelnosti.sk

**Known (public):**
- Third-party scrapers state **no public API / no bulk export** for consumers.
- Commercial CRMs (backOFFICE) state publish uses **UC import API** after RK orders activation with UC.
- UC publishes Import/Export API documentation under Realsoft path (`plt.unitedclassifieds.sk/.../realsoft/`).
- Import validation endpoint documented: `POST https://plt.unitedclassifieds.sk/import/api/v1/realsoft/validation` (test-oriented; swagger mentioned).
- Full inventory import interval documented as **every 12 hours**.
- Stable IDs in import schema examples: office/user `source_id`, advertisement `internal_reference`.
- Images present in schema as `Image` array.

**Blocked / UNKNOWN:**
- Downloadable production XSD / OpenAPI `schema.json` (relative link in docs; HEAD from research environment returned HTTP 400 — treat artifact availability as UNKNOWN/fragile).
- Production auth method for CRM to UC publish (API key vs pull URL vs cert): **UNKNOWN**.
- Whether Nehnutelnosti-only vs multi-portal fan-out is one UC import: **UNKNOWN**.
- Per-listing publish confirmation webhook to CRM after UC import: **UNKNOWN**.
- Image count/size/format limits: **UNKNOWN**.
- Deactivate vs delete semantics on portal UI vs API: **UNKNOWN**.

### 2.2 Reality.sk

**Known (public):**
- Reality.sk page documents RealSoft export path: activate **Import zo softveru 3. stran** and request linking via `info@reality.sk`.
- Placement/edit of listings also referenced via **Nehnutelnosti Admin** for agencies.
- Same UC trio naming in backOFFICE export page (nehnutelnosti + reality + topreality).

**Blocked / UNKNOWN:**
- Any Reality.sk-branded public OpenAPI distinct from UC Realsoft docs: **not found**.
- Whether Reality.sk still accepts non-UC XML feeds: **UNKNOWN**.
- Auth credentials issuance workflow beyond email/admin activation: **UNKNOWN**.
- Error catalog specific to Reality.sk brand: **UNKNOWN** (use UC shared codes only as documented).

### 2.3 Topreality.sk

**Known (public):**
- ToS (2025 PDF on beta.topreality.sk): business users access via **Realsoft** registration; package may redistribute listings across UC real-estate sites.
- ToS clauses: user must **not** import/export listings via third-party systems **without prior company consent**.
- Apify scrapers exist; they are **not** vendor contracts and conflict with ToS if used for ingestion.

**Blocked / UNKNOWN:**
- Topreality-specific REST base URL separate from UC: **not found publicly**.
- Exact mapping of ToS Balik portals list at any given date: **UNKNOWN** without vendor schedule.
- Testing sandbox for Topreality-only: **UNKNOWN** (UC validation is Realsoft-labeled).

---

## 3. UC technical contract (publicly documented — shared)

### 3.1 Export-from-CRM = UC Import docs

Source: `https://plt.unitedclassifieds.sk/import/docs/v1/realsoft/docs/import/intro` (accessed 2026-09-05)

- Purpose: validate brokers + listings for UC platform (Realsoft-labeled).
- Test validation: `POST .../import/api/v1/realsoft/validation`.
- Caution: test-only intent; do not send hundreds of ads at once; max processing ~1 minute.
- Hierarchy: `OfficeData` to `Office` + `UserData[]` to `User` + `Advertisement[]` (+ `GeoPoint`, `Extra`, `MultiExtra`, `Location`, `Image[]`).
- Cadence for full inventory file: **12 hours**.
- Response: `200` data OK; `422` schema-invalid.
- Location counters referenced at `admin.realsoft.sk/api/counter/{state|county|district|region|citypart|street}`.

**NOT claimed:** production pull URL, auth headers, or that this is three separate brand APIs.

### 3.2 Import-into-CRM = UC Export docs

Source: `https://plt.unitedclassifieds.sk/import/docs/v1/realsoft/docs/export/intro` (accessed 2026-09-05)

- UC/Realsoft POSTs to integrator URL with `action` = `1` (listing) or `2` (agent).
- Ack JSON: `data`, `code`, `importId`, `message`, `url` (url optional for agents).
- Codes: 1 added, 2 edited, 3 deleted, 4 not found, 10 wrong login, 11 missing data, 12 wrong data, 13 custom.
- Agent stable id: `user_id` (never changes); `deleted` bool.
- Listing: `import_id`, `deleted`, category/action matrices, `images[{url,changed}]`, `medias` for video/VR.
- Field validation errors: required / wrong value / must be int or float / unknown item.

### 3.3 What is NOT public

- Complete production OpenAPI/XSD package as a stable downloadable artifact (schema.json not reliably fetchable here).
- Commercial price for import cez API.
- Written SLA for publish latency beyond 12h cadence note.
- Per-portal fan-out control flags in public docs.

---

## 4. Repo adapters (read-only cite)

| Path | Role | Evidence class |
|---|---|---|
| `apps/crm/src/app/api/realsoft/import/route.ts` | Inbound Realsoft/UC export receiver | CODE_PRESENT |
| `apps/crm/src/app/api/uc/import/route.ts` | Shared UC protocol import route | CODE_PRESENT |
| `apps/crm/src/app/api/integrations/portal/import/route.ts` | Portal import integration route | CODE_PRESENT |
| `apps/crm/src/lib/realsoft/{auth,mapper,payload,responses,store}.ts` | Auth hash resolve, mapper, ack helpers | CODE_PRESENT |
| `apps/crm/src/lib/importers/realsoft-parser.ts` | Parser | CODE_PRESENT |
| `apps/crm/src/components/integrations/portal-import-panel.tsx` | UI for portal import | CODE_PRESENT |
| `apps/crm/supabase/migrations/20260616070500_realsoft_import_adapter.sql` | realsoft_import_logs + adapter schema | CODE_PRESENT |
| `apps/crm/supabase/migrations/20260616103500_realsoft_auth_hash_hardening.sql` | bcrypt credential resolve | CODE_PRESENT |
| `apps/crm/supabase/migrations/20260618120000_realsoft_import_logs_upsert_constraint.sql` | idempotency (agency_id, action, external_id) | CODE_PRESENT |
| `apps/crm/tests/rls/realsoft-import-logs-rls.test.ts` | RLS isolation tests | TEST_EVIDENCE |
| `apps/crm/src/infra/scraping/PortalNehnutelnostiSource.ts` | Prospecting scrape helper — NOT publish contract | CODE_PRESENT (deny for publish) |
| `scripts/prospecting/lib/denylist.ts` | Blocks fetch of nehnutelnosti/topreality/reality hosts | CODE_PRESENT |
| `docs/briefs/overnight/overnight-master-brief-10.md` | Realsoft import adapter brief; mapper gated on sample | DECISION_DOC |
| `docs/briefs/overnight/overnight-master-brief-14-uc-mapper.md` | UC mapper reuse of /api/realsoft/import | DECISION_DOC |
| `docs/architecture/master-data-sourcing-map.md` | Portals as listing-facts sources; GDPR/ToS gates | ARCHITECTURE |

**Gap:** no `apps/crm/src/**` module found that implements **CRM to UC Import publish** (outbound feed generation + UC credentials). Outbound portal publish remains **NOT STARTED / vendor-blocked**.

---

## 5. Feasible pilot scope (conditions)

**In scope for pilot (after vendor GO):**
1. Continue/harden **import-into-CRM** using existing `/api/realsoft/import` + `/api/uc/import` against a **real payload sample** from pilot RK (already identified blocker in briefs).
2. Commercially activate UC **import service** for one pilot agency covering the portals the client actually pays for.
3. Build **one** outbound UC Import generator behind vendor-provided schema package (not invent XSD) — single adapter; multi-portal fan-out only if UC confirms same payload.
4. Contract tests: validation POST sandboxes + ack code matrix for inbound export.

**Out of scope / stop rules:**
- Scraping Nehnutelnosti/Topreality/Reality for publish or contact harvesting (ToS + repo denylist).
- Claiming three independent public APIs without vendor docs.
- Production publish without written UC activation + sample round-trip evidence.

---

## 6. Missing vendor inputs (checklist)

1. Written confirmation which portals are enabled by one UC import activation for the pilot ICO.
2. Production credentials / pull URL / auth scheme for CRM to UC Import.
3. Authoritative schema package (OpenAPI/XSD) with version + changelog.
4. Image limits, listing caps, rate limits, publish SLA.
5. Confirmation semantics (callback vs poll vs admin UI only).
6. Deactivate vs delete product rules per portal UI.
7. Reality.sk linking ticket outcome (`info@reality.sk`) if Reality is in pilot set.
8. Topreality ToS consent for Revolis as allowed import/export system.

---

## Decision Contract

### 1. Decisions
- **Recommend:** Treat Nehnutelnosti.sk / Reality.sk / Topreality as **UC/Realsoft-gated**, not as three open public APIs. Pilot = (a) inbound UC Export into existing CRM receivers, (b) outbound UC Import only after vendor package + activation.
- **Do not:** invent XSD/endpoints or use scrapers as integration.
- **Status:** `PASS_WITH_CONDITIONS` — research complete; implementation blocked on vendor inputs.
- **Would change if:** UC provides distinct per-portal public OpenAPI with different auth/payloads, or a non-UC Reality-only feed is contractually documented.

### 2. Evidence
- UC Import intro: `https://plt.unitedclassifieds.sk/import/docs/v1/realsoft/docs/import/intro` — accessed 2026-09-05 — validation URL, 12h cadence, 200/422, Office/User/Advertisement hierarchy.
- UC Export intro: `https://plt.unitedclassifieds.sk/import/docs/v1/realsoft/docs/export/intro` — accessed 2026-09-05 — POST callback, codes 1-4/10-13, import_id/deleted/images.
- backOFFICE exporty: `https://www.backoffice.sk/realitny-software/exporty/` — accessed 2026-09-05 — UC import activation required for nehnutelnosti/reality/topreality.
- Reality.sk RealSoft page: `https://www.reality.sk/realitysk-export-inzercie-z-realsoftu/` — accessed 2026-09-05 — 3rd-party import service + info@reality.sk linking.
- Topreality ToS PDF: `https://beta.topreality.sk/tos/podmienky_inzercie.pdf?20250628=` — accessed 2026-09-05 — Realsoft admin; unauthorized import/export prohibited.
- Apify Nehnutelnosti scraper docs — accessed 2026-09-05 — claims no public API (third-party; not vendor).
- Repo paths listed in section 4 (path existence verified 2026-09-05 on BASE_SHA workspace).

### 3. Assumptions
- UC Realsoft-labeled docs are the **current public technical surface** for agency automation toward these portals (working assumption, not a signed vendor statement that brand APIs are identical).
- XML feed mentions in agency marketing refer to integrator-side formats or legacy paths, not a currently published public XSD for these three brands.
- Repo Realsoft/UC inbound adapters target the **Export** direction documented by UC.

### 4. Unknowns
- Production CRM to UC auth + schema package (owner: UC sales/tech; blocks outbound publish).
- Per-portal vs shared fan-out controls (owner: UC; blocks product UX publish only to X).
- Image/rate limits and publish confirmation channel (owner: UC; blocks SLA claims).
- Whether Reality.sk still has a non-UC path (owner: Reality.sk ops; blocks architecture choice).
- Prod readiness of repo mappers without real sample (REALSOFT_SAMPLE_READY style gates in briefs).

### 5. Experiments
- **H1:** With pilot RK UC activation + sample payload, inbound export ack codes 1/2/3 reproduce on `/api/uc/import` within 1 business day.
  - Metric: percent accepted payloads with stable external_id logged in realsoft_import_logs.
  - Sample: at most 20 listings + 2 agents.
  - Cost: vendor activation fee (UNKNOWN) + at most 1 eng-day.
  - Stop: if auth fails or payload diverges from docs, freeze mapper and escalate to UC.
- **H2:** Outbound validation POST accepts a synthetic OfficeData fixture derived only from public docs.
  - Metric: HTTP 200 from validation endpoint.
  - Stop: if only 401/403 without credentials, outbound blocked until vendor unlock.

### 6. Product Implications
- **Reuse:** inbound `/api/realsoft/import` + `/api/uc/import` + realsoft_import_logs + agency credential columns.
- **Change later:** new outbound UC Import generator module (separate from scraping); do not share scrape parser as publish contract.
- **Defer:** per-portal custom adapters until vendor proves divergence.
- **Dependency:** commercial UC activation + schema package + ToS consent.

### 7. Decision Memory Payload (draft for morning integration — NOT written to canonical memory)
- `decision`: portals_nehnutelnosti_reality_topreality_are_uc_gated
- `status`: PASS_WITH_CONDITIONS
- `implication`: pilot_inbound_first_outbound_after_vendor_package
- `blocked_on`: uc_activation_credentials_schema_package
- `run_id`: 20260905T2304-ruflo-overnight
- `lane`: C
- `base_sha`: cf3604613cdbb6a7a279e175f2c792fb25591461

---

## Short status board

| Portal | Known | Blocked |
|---|---|---|
| Nehnutelnosti.sk | UC-operated; import/export docs exist; no public open API | Prod auth/schema/limits/confirm; outbound adapter missing |
| Reality.sk | RealSoft 3rd-party import activation path; UC trio claim | Brand-specific API docs; linking process details |
| Topreality | ToS requires Realsoft; unauthorized auto import/export forbidden | Consent + same vendor package unknowns |
