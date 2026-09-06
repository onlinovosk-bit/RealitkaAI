# Sprievodca analytics events (PR 2)

**Branch:** `feat/sprievodca-analytics-events`
**Depends on:** PR #525 (GA on public layout) merged for live collect — code is independent.

## Events
- `sprievodca_started` / `sprievodca_submitted`
- `results_shown` / `results_empty` (taxonomy damage signal)
- `unknown_section_shown` (Neznáme section)
- `listing_clicked`

No PII. Counts from `partitionPublicListings` (#523). Client reporters only — pages stay RSC.

## Manual after merge
Filter that returns nothing → Network `en=results_empty`.
Unknown section visible → `en=unknown_section_shown`.
