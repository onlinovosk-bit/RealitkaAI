# Demo v3 — audit `data-cta` pokrytia

**Súbor:** `apps/marketing/public/revolis-demo-v3.html`  
**Dátum auditu:** 2026-06-12 · **Typ:** docs-only (Brief 9 backlog vlna)

## Existujúce `data-cta` hodnoty (9)

| `data-cta` | Element | Akcia | Beacon |
|------------|---------|-------|--------|
| `nav` | Navbar CTA | Calendly | áno |
| `hero` | Hero primary | Calendly | áno |
| `hero-calc` | Hero secondary | anchor `#kalkulacka` | áno |
| `calc-fast` | Kalkulačka „rýchla odpoveď" | Calendly | áno |
| `calc` | Kalkulačka strata | Calendly + `utm_content=calc_loss_{N}` | áno |
| `goals` | Goals picker CTA | Calendly (skrytý do výberu) | áno |
| `final` | Záverečná sekcia | Calendly | áno |
| `sticky` | Sticky bar | Calendly | áno |

**Mechanizmus:** `click` listener → `navigator.sendBeacon('/api/t', { cta, ts })`.

## Interakcie BEZ `data-cta` (návrh chýbajúcich eventov)

| Interakcia | Aktuálny stav | Navrhovaný event (docs) |
|------------|---------------|-------------------------|
| Lead row click (mockup NBA) | JS `pick()` mení `.nba p` | `data-cta="mockup-lead-select"` alebo `sendBeacon({ event: 'lead_select', lead: 'peter' })` |
| Kalkulačka slider change | `calc()` prepočítava stratu | `calc_slider_change` s `{ dop, cas, kon, pro }` |
| Goals checkbox toggle | zobrazí `#goalCta` | `goals_toggle` s `{ goals: ['leads','import'] }` |
| FAQ accordion open | trieda `.open` | `faq_open` s `{ question: '...' }` — landing v2 už má `gtag faq_interaction` |
| Sticky bar show/hide | IntersectionObserver | `sticky_visible` / `sticky_hidden` |
| UTM append na Calendly | `appendUtmToCalendly()` | `utm_appended` s `{ utm_keys: [...] }` |
| Reduced motion path | sticky vždy visible | `a11y_reduced_motion` flag v pageview |

## Medzery v `/api/t` endpointe

- Beacon ide na `/api/t` — overiť, či marketing app route existuje a loguje do analytics (mimo scope tohto auditu).
- `hero-calc` anchor click nemá UTM — zvážiť `utm_content=hero_calc_scroll`.

## Odporúčaná priorita (Andy / ďalší release)

1. **P0:** `calc_slider_change` — koreluje s `calc_loss_*` UTM na Calendly
2. **P1:** `goals_toggle` — personalizácia demo briefu (demo-ops už parsuje `goals_*`)
3. **P2:** `mockup-lead-select` — engagement metrika, nie konverzia
4. **P3:** sticky visibility — funnel drop-off signál

**Poznámka:** Tento dokument je návrh — žiadna zmena HTML/JS v backlog vlne (Tier 1 docs).
