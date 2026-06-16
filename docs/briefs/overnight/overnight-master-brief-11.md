# OVERNIGHT MASTER BRIEF 11 — Revival Wave (Zhluk 4 + Zhluk 2)
**Dátum:** 2026-06-16 · **Status:** in-progress (waves split into dedicated PR branches)

## Scope delivered by wave
- **Wave A (`feat/brief11-wave-a-enrichment`)**
  - Real phone/email data quality enrichment (including invalid/missing flags) with audit writes to `enrichment_log`.
  - RPO V2-backed company profile enrichment (IČO-only), with in-memory cache and lightweight rate-limiting.
  - Removed fake company enrichment stub output from default flow.
- **Wave B (`feat/brief11-wave-b-kataster-wms`)**
  - Cadastre map kept display-only (no automatic address geocoding/autocenter from leadAddress).
  - Added regression test to prevent accidental reintroduction of address-based auto-centering.
- **Wave C (`feat/brief11-wave-c-tile-reconcile`)**
  - Revenue tile registry reconciled with real source availability:
    - `ai_priority_strip` -> `live` (wired to real `leads.ai_priority`)
    - `kataster_context` -> `live` (wired to real ZBGIS WMS display layer)
  - Dashboard now renders these two tiles from real data/source state.

## Guardrails kept
- No fake metrics rendered in revenue dashboard guard test.
- No synthetic company enrichment payloads; when RPO does not resolve, value remains empty.
- Cadastre stays display-only (no ownership data, no storage, no geocoded lead assumption).

## Verification
- Wave A tests:
  - `src/lib/enrichment/__tests__/engine.test.ts`
  - `tests/rls/enrichment-log-rls.test.ts`
- Wave B tests:
  - `src/lib/cadastre/__tests__/wms-parcel-source.test.ts`
  - `src/components/l99/__tests__/CadastreMapView.test.tsx`
  - `src/lib/modules/__tests__/registry.test.ts`
- Wave C tests:
  - `src/lib/modules/__tests__/revenue-intelligence.test.ts`
  - `tests/verification/revenue-intelligence-guard.verification.test.ts`
- Build:
  - `npm run build` (apps/crm) green.

## Pending / honest hold
- Portal-derived tiles remain hidden/pending until legal data inflow is operational.
- RealSoft mapper remains blocked by real payload fixture (from Brief 10 guardrail).
- RPO endpoint remains configurable via env for production networking specifics.

