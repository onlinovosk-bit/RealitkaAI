# TRACK-E — /team Phase 5 license gating

**Status:** LIVE on `main` (Brief 4.0 verification)

## Implementation

- Server gate: `getFeatureGateState("teamManagement")` in `team/page.tsx`
- Capability: `hasCapability(tier, "canAccessTeamPressure")` + `TeamPressureGate`
- Analytics: `TeamAnalyticsClient` + `useLicenseCapabilities`

## Note

Team management gating is wired; enforcement follows license tier resolution
including `agencies.manual_plan` when set.
