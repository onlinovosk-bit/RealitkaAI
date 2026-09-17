# Analytics PR 1 — consent-gated GA on public routes

**Date:** 2026-09-04  
**Branch:** `feat/analytics-public-layout`  
**Scope:** `apps/crm/src/app/(public)/layout.tsx` only

## Change

Public layout now mirrors the marketing layout pattern:

- `GoogleAnalytics` (consent-gated)
- `CookieConsentBanner`
- `{children}`

No component copies. No changes to `GoogleAnalytics.tsx` or the banner. No GA on dashboard/onboarding. No custom events (PR 2).

## Acceptance notes

| Check | Result |
|-------|--------|
| Consent shared via `revolis_cookie_consent_v1` | Same banner + GA stack as marketing — one consent key across public + marketing surfaces |
| Privacy / legal routes show banner | Intentional — those routes live under `(public)` and must offer consent UI |
| Dashboard / onboarding | Still no GA — not under `(public)` or `(marketing)` |
| Diff scope | Essentially one code file + this report |

## Out of scope (PR 2+)

- Sprievodca / custom analytics events
- Dashboard or onboarding instrumentation