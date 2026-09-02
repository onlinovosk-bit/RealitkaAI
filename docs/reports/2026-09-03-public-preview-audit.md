# Public preview HTML audit

**Date:** 2026-09-03  
**Branch:** `docs/public-preview-audit`  
**Scope:** `apps/crm/public/preview-*.html` (read-only)  
**Files:** 11  
**Decision authority:** Deletion / relocation = founder only

## Executive verdict

All 11 files ship under Next.js `public/` → world-readable on CRM deploys. Two files attribute product ideas/quotes to **named people + real companies**. Recommend remove-from-public as minimum; **no deletes in this PR**.

## Risk ranking (highest first)

| Rank | File | Bytes | Rec |
|------|------|------:|-----|
| 1 | `preview-homepage.html` | 82168 | **delete** or move out of `public/` |
| 2 | `preview-demo-page.html` | 54304 | **delete** or move out of `public/` |
| 3 | `preview-landing-phase3-slate-horizon.html` | 18792 | move out of `public/` |
| 4 | `preview-landing-phase3-ab.html` | 14575 | move out of `public/` |
| 5 | `preview-landing-phase3-a.html` | 6226 | move out of `public/` |
| 6 | `preview-landing-phase3-b.html` | 6651 | move out of `public/` |
| 7 | `preview-demo-conversion-funnel-v5-l99.html` | 26342 | move out of `public/` |
| 8 | `preview-demo-conversion-funnel.html` | 19412 | move out of `public/` |
| 9 | `preview-l99-workdesk-blue.html` | 18975 | move out of `public/` |
| 10 | `preview-demo-funnel-index.html` | 3512 | move / delete with siblings |
| 11 | `preview-landing-phase3-index.html` | 1846 | move / delete with siblings |

## CRITICAL detail

### `preview-homepage.html`

Full marketing mock with **14 fabricated “ex {Company}” experts** (Gong, HubSpot, Follow Up Boss, Wise Agent, …). Public URL + third-party attribution = reputation risk.

### `preview-demo-page.html` — James Thornton (ex Gong)

- **Line 602**
- **Exact wording:**

```text
37 sekúnd pred koncom hovoru. James Thornton (ex Gong): čo maklér nepovedal je silnejší signál ako čo povedal.
```

Also: Trevor Blackwood (ex Market Leader) ~L702; mock personal names / street stats without “fictional” label.

## Medium / low

Phase-3 landing + funnel previews: no named third parties; recurring unverified KPIs (`92%`, `+34%`, `<2 min`). Workdesk/index files: low content risk, still advertise the set.

## Founder options (not executed)

| Option | Action |
|--------|--------|
| A | Delete all 11 from `public/` |
| B | Move to `docs/design-previews/html/` (not served) |
| C | Minimal: remove CRITICAL pair first |

## Method

Glob `apps/crm/public/preview-*.html` → 11. Sizes from filesystem. Claims scan: named persons, `ex Company`, proof metrics. **No files modified or deleted.**
