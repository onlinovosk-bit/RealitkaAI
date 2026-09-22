# Public preview HTML audit (L4)

**Date:** 2026-09-03  
**Branch:** `docs/public-preview-audit`  
**Scope:** `apps/crm/public/preview-*.html` (READ-ONLY)  
**Files inventoried:** 11  
**Mode:** recommend only — **no deletes**, no moves, no file edits in this PR  
**Decision authority:** deletion / relocation = founder GO only

---

## Executive verdict

All 11 `preview-*.html` files live under Next.js `apps/crm/public/` and are therefore **world-readable** on any CRM deploy that ships `public/` (production + previews). There is no `apps/crm/public/robots.txt` blocking them.

**Critical:** `preview-homepage.html` and `preview-demo-page.html` attribute product claims to **named people + real companies** (notably James Thornton / Gong). That is reputation and misrepresentation risk if indexed or shared.

This audit **recommends** removing or relocating out of `public/` (options below). It does **not** delete anything.

---

## Risk ranking (all 11, highest first)

| Rank | File | Size (bytes) | Risk tier | Recommendation (not executed) |
|------|------|-------------:|-----------|--------------------------------|
| 1 | `preview-homepage.html` | 82168 | **CRITICAL** | Remove from `public/` or relocate to non-served design archive |
| 2 | `preview-demo-page.html` | 54304 | **CRITICAL** | Same — contains named James Thornton (ex Gong) quote |
| 3 | `preview-demo-conversion-funnel-v5-l99.html` | 26342 | Medium | Move out of `public/` (marketing funnel mock, unverified KPIs) |
| 4 | `preview-demo-conversion-funnel.html` | 19412 | Medium | Move out of `public/` |
| 5 | `preview-l99-workdesk-blue.html` | 18975 | Medium-low | Move out of `public/` (internal workdesk mock; still public URL) |
| 6 | `preview-landing-phase3-slate-horizon.html` | 18792 | Medium | Move out of `public/` (landing design variant) |
| 7 | `preview-landing-phase3-ab.html` | 14575 | Medium | Move out of `public/` (A/B comparison shell) |
| 8 | `preview-landing-phase3-b.html` | 6651 | Medium-low | Move out of `public/` |
| 9 | `preview-landing-phase3-a.html` | 6226 | Medium-low | Move out of `public/` |
| 10 | `preview-demo-funnel-index.html` | 3512 | Low | Move/retire with funnel siblings (index advertises the set) |
| 11 | `preview-landing-phase3-index.html` | 1846 | Low | Move/retire with phase-3 siblings |

Absolute paths (repo root): `apps/crm/public/<filename>` for each row.

---

## CRITICAL detail

### 1) `preview-homepage.html` (rank 1)

- **Title:** `Revolis.AI — Homepage Preview`
- **Size:** 82168 bytes
- **Why critical:** Full marketing homepage mock that presents **multiple fabricated “ex {Company}” expert bonuses** as if they were real endorsements / product contributions.
- **Named third-party companies observed** (non-exhaustive): Gong, HubSpot, Follow Up Boss, Wise Agent, LionDesk, Structurely, BoomTown, Notion, Market Leader, kvCORE, Salesforce Einstein, Lofty/Chime, Real Geeks, Top Producer.
- **James Thornton appearance:** expert bonus label ~line 1099 — `James Thornton · ex Gong` (plus SK/CZ conversation-intelligence copy).
- **Public URL pattern:** `/preview-homepage.html` on the CRM host.
- **Risk:** third-party brand/name attribution without clear fiction label; SEO/social scrape; customer confusion with production landing.

### 2) `preview-demo-page.html` (rank 2) — James Thornton quote

- **Title:** `Revolis.AI — AI Demo Page Preview`
- **Size:** 54304 bytes
- **Why critical:** Demo narrative attributes a product insight quote to a **named person + real company**.

**Exact text at line 602** (UTF-8, as in file):

```text
37 sekúnd pred koncom hovoru. James Thornton (ex Gong): čo maklér nepovedal je silnejší signál ako čo povedal.
```

Full HTML line 602:

```html
  <p class="section-sub">37 sekúnd pred koncom hovoru. James Thornton (ex Gong): <em style="color:#A78BFA">čo maklér nepovedal je silnejší signál ako čo povedal.</em></p>
```

**Also on this page (secondary):** other named “ex {Company}” figures (e.g. Trevor Blackwood / Market Leader) and mock personal/call scenario copy without an explicit “fictional preview” banner.

---

## Medium / lower tiers (ranks 3–11)

### Funnel previews (ranks 3–4, 10)

| File | Title (from `<title>`) | Notes |
|------|------------------------|-------|
| `preview-demo-conversion-funnel-v5-l99.html` | Revolis · Ukážka · Predajný postup v5 | Conversion funnel mock; no Thornton; unverified conversion narrative |
| `preview-demo-conversion-funnel.html` | Revolis · /demo · L99 Conversion Funnel · Preview | Earlier funnel variant |
| `preview-demo-funnel-index.html` | Revolis · /demo Funnel · Live HTML Index | Small index linking the funnel set — raises discoverability |

### Landing phase-3 set (ranks 6–9, 11)

| File | Title | Notes |
|------|-------|-------|
| `preview-landing-phase3-slate-horizon.html` | Landing Phase 3 · Slate Horizon Preview | Design exploration |
| `preview-landing-phase3-ab.html` | Landing Phase 3 · A vs B | Comparison shell |
| `preview-landing-phase3-b.html` | Verzia B · Slate Horizon Phase 3 | Variant B |
| `preview-landing-phase3-a.html` | Verzia A · Dark (produkcia) | Variant A; title claims “produkcia” while still a preview path |
| `preview-landing-phase3-index.html` | Landing Phase 3 · Index | Index for the set |

No James Thornton / Gong attribution found in these five. Residual risk = public unfinished marketing + recurring unverified KPI-style claims if present in copy.

### Workdesk (rank 5)

| File | Title | Notes |
|------|-------|-------|
| `preview-l99-workdesk-blue.html` | Revolis L99 Workdesk · Blue (Slate Horizon) | Internal UI mock; lower legal risk, still a free public surface |

---

## Exposure model

| Factor | Finding |
|--------|---------|
| Served by Next.js `public/` | Yes — static files at site root |
| `apps/crm/public/robots.txt` | **Absent** |
| App-router references to these filenames | No hard product links found under `apps/crm/src` (naming collision with unrelated test IDs only) |
| Still reachable | Anyone who knows/guesses `/preview-*.html` |

Guessability is moderate (predictable `preview-` prefix + index HTML files that list siblings).

---

## Founder options (recommend only — not executed)

| Option | Action | Notes |
|--------|--------|-------|
| **A** | Delete all 11 from `apps/crm/public/` | Cleanest public surface; loses easy design share links |
| **B** | Move to e.g. `docs/design-previews/html/` (not served) | Keeps history for designers; not world-readable via CRM |
| **C** | Minimal: remove **CRITICAL** pair first (`preview-homepage.html`, `preview-demo-page.html`) | Cuts named-person/company risk fastest |
| **D** | Keep temporarily + add explicit “FICTIONAL PREVIEW — NOT ENDORSED” banners + disallow in robots | Weaker; still attributable in screenshots |

**This PR executes none of A–D.** Recommendation stance only.

---

## Method

1. Glob `apps/crm/public/preview-*.html` → **11 files**.
2. Record filesystem sizes.
3. Scan for named persons, `ex {Company}`, Gong/Thornton, stealth client names.
4. Extract **exact** `preview-demo-page.html` line 602 quote via UTF-8 read.
5. Confirm absence of `public/robots.txt`.

**No preview HTML files were modified or deleted.**

---

## Closure

**Changed:** this audit markdown only.  
**Verified:** 11-file inventory, sizes, CRITICAL pair, exact line-602 quote.  
**Still risky until founder GO:** world-readable named third-party attributions on production/preview hosts.

### One-line summary

11 public previews are live; **homepage + demo-page are CRITICAL** (James Thornton / Gong quote exact at demo-page L602); recommend relocate/remove — **no deletes in this PR**.
