# Overnight Master Brief 8 - Cadastre WMS Display

Status: implemented on feature branch `feat/brief8-cadastre-wms-display`.

## Scope delivered

- Added display-only cadastre adapter layer in `apps/crm/src/lib/cadastre`.
- Added `CadastreMapView` with MapLibre base map + parcel overlay + click parcel info.
- Wired `l99-hub` modules with tier gating via `canRenderModule`:
  - `hub_breaking_point` = live for `market_vision` and above.
  - `hub_neighborhood_change` = live for `protocol_authority`.
- Added resilience behavior:
  - overlay errors do not break map view,
  - fallback overlay source is used,
  - user sees notice when parcel overlay is unavailable.
- Kept feature display-only:
  - no owners,
  - no database persistence,
  - no fake signal cards/badges.

## Verification checklist

- Unit tests for `WmsParcelSource` cover URL assembly, parsing, fallback, and not-supported query behavior.
- Component test for `CadastreMapView` verifies graceful outage handling.
- Existing L99 hub anchor tests updated to enforce module-policy based rendering.
