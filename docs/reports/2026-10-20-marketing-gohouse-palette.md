# www.revolis.ai — navy + gold paleta (2026-10-20)

**Stav:** IMPLEMENTED + TESTED (lokálne). Draft PR, **nemergovať**. `app.revolis.ai` nedotknuté.
**RAU route:** AUTO-SAFE CONTENT revolis (FAST). PR #878 už bolo zmergované 2026-10-17 — SEO súbory som nemenil.

## OBJECTIVE

Premaľovať marketing (`apps/marketing`, www.revolis.ai) na paletu z referenčného webu: tmavá navy, teplá off-white, gold/amber CTA. Len paleta a nálada — nie layout, text, logo, tvrdenia.

## WHAT CHANGED

Jeden zdroj tokenov: `apps/marketing/public/palette.css` (`:root --rev-*`).
Next stránky ho ťahajú cez `@import` v `app/globals.css`. Kampaňový `/` (`public/index.html`, rewrite v `next.config.ts`) ho linkuje ako `/palette.css`.

| Povrch | Čo sa zmenilo | Čo nie |
|---|---|---|
| `/` `public/index.html` | `:root` aliasy + hardcoded light/purple → tokeny | copy, ceny, CTA href, canonical, og, countdown, kalkulačka |
| `/demo` `demo.css` | light cyan → navy/gold tokeny | markup, copy, CTA ciele |
| `/balik` `balik.css` | light cyan → navy/gold tokeny | markup, ceny, checkout |
| `landing-v2.css` | staré purple/blue tokeny remapované na `--rev-*` (rollback homepage) | copy |
| `apps/crm` | nič | — |
| `layout.tsx` / `robots.ts` / `sitemap.ts` / `lib/site.ts` | nič | — |

Slovo `pilot` sa v zmenených súboroch nevyskytuje (guard v existujúcom aj novom teste).

## Paleta a kontrast (namerané v tomto turne)

| Token | Hex | Použitie |
|---|---|---|
| `--rev-bg` | `#0A1020` | stránka |
| `--rev-bg-mid` | `#0F1A2E` | alt sekcie |
| `--rev-surface` | `#121C30` | karty |
| `--rev-text` | `#F5EFE6` | nadpisy |
| `--rev-muted` | `#B8C0CC` | body |
| `--rev-gold` / `--rev-gold-hi` | `#D9B26A` / `#E2BC78` | accent, highlight, CTA fill |
| `--rev-ink` | `#0A1020` | text na gold tlačidle |

Kontrast (WCAG 2.1 AA, 4.5:1): headline 16.58 · muted na karte 9.27 · gold label 9.50 · ink na gold CTA 9.50. Pin v `apps/marketing/__tests__/palette.test.ts`.

Tailwind v `apps/marketing` nie je — tokeny sú CSS custom properties.

## EVIDENCE

- `GET /palette.css` → 200 `text/css`
- Computed na `http://127.0.0.1:3001`: `body` `rgb(10, 16, 32)` / `rgb(245, 239, 230)`; `h1` off-white; CTA text `rgb(10, 16, 32)`
- Screenshoty: `/opt/cursor/artifacts/before/` a `/opt/cursor/artifacts/after/` (`home|demo|balik` × `desktop|mobile`, plus hero cropy after)

## TESTS

```
cd apps/marketing && npx vitest run
# Test Files  5 passed (5)
# Tests  60 passed (60)
```

Nové: `palette.test.ts` (tokeny, AA, import/link, no-pilot, ceny/CTA/canonical ostávajú).

## CI / DEPLOY / PRODUCTION

- Lokálny `npx next build --webpack` v `apps/marketing`: Compiled successfully, 11/11 static pages.
- CI na draft PR — po push. Merge zakázaný.
- PRODUCTION: nezmenené. Preview pre `cursor/*` je v `apps/marketing/vercel.json` vypnutý (existujúci stav).

## RISKS

- `/` je stále kampaňový `public/index.html` (rewrite). `landing-v2` je premaľovaný pre rollback, ale dnes nie je `/`.
- `LeadCaptureModal` a `zakulisie` som nenechal prefarbiť — golden HTML snapshoty ostali bajtovo zhodné.
- Demo comparison box v `DemoSections.tsx` má stále inline `#f0fdf4` (golden). Na tmavom pozadí ostáva ako svetlá „win“ ostrovček.
- Gradient na CTA sa v `getComputedStyle().backgroundColor` hlási ako `rgba(0,0,0,0)` — vizuálne je gold fill (screenshot).

## NEXT ACTION

Founder: review draft PR + screenshoty. Merge len na výslovné GO.
