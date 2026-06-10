# revolis-demo-v3 — changelog

**Zdroj:** `revolis-demo-v2.html` (Downloads) → `apps/marketing/public/revolis-demo-v3.html`

| # | Zmena | Prečo |
|---|-------|-------|
| P0-1 | GDPR FAQ text | Právne presnejšie (subdodávatelia, nie marketing) |
| P0-2 | `section[id]{scroll-margin-top:80px}` | Sticky nav neprekrýva kotvy |
| P0-3 | Plausible TODO + `sendBeacon` na `[data-cta]` | Meranie konverzie bez blokovania UX |
| P0-4 | UTM passthrough na Calendly | Zachovanie kampanových parametrov |
| P0-5 | Kalkulačka `loss<100` → „Reaguješ rýchlo“ | Edge case namiesto „−0 €“ |
| P0-6 | „kvôli pomalej reakcii“ | Gramatika SK |
| P1-7 | Hero proof riadok | Sociálny dôkaz (10 h/týždeň) |
| P1-8 | Goal CTA + `utm_content=goals_*` | Konverzia z personalizácie |
| P1-9 | Ročný odhad + počet obchodov | Silnejší ROI framing |
| P1-10 | Calc CTA `utm_content=calc_loss_*` | Atribúcia podľa straty |
| P1-11 | Klikateľné `.lead-row` + `.nba` | Interaktívny mockup |
| P1-12 | Schváliť/Upraviť tlačidlá | Human-approval vizualizácia |
| P1-13 | Sticky CTA cez IntersectionObserver | Mobilná konverzia po scrolli |
| P1-14 | Calendly `target=_blank` | UX + analytics |
| P1-15 | Poradie sekcií bez cenníka | CRO flow podľa briefu |
| P1-16 | FAQ portály | Odstránenie námietky integrácie |
| P2-17 | `<main>` + skip-link | A11y |
| P2-18–27 | Favicon, JSON-LD, badges text, noscript, … | SEO, a11y, remeslo |

## QA (manuálne overiť)

- [ ] 380px viewport — bez horizontálneho scrollu
- [ ] Klávesnica: skip-link, goals, FAQ, slidery
- [ ] `prefers-reduced-motion` — sticky viditeľný, bez animácií
- [ ] `?utm_source=test` v Calendly linkoch
- [ ] Kalkulačka T=5 min → edge case blok
- [ ] Klik na lead-row mení prioritu v `.nba`
