# Marketing landing copy audit (apps/marketing)

**Dátum:** 2026-10-20  
**Účel:** Mapovanie landing súborov, SK copy, cenník v3, farby, testov a tvrdení vs produkt.

---

## Ktorá stránka je LIVE na `/`

| Cesta | Stav |
|-------|------|
| `apps/marketing/next.config.ts` L17–21 | **`/` → rewrite na `public/index.html`** (kampaň cenník v3, 2026-10-19) |
| `apps/marketing/app/page.tsx` + `components/landing/LandingPage.tsx` | App Router landing (demo/Calendly, navy landing-v2) — **nie je root**, kým existuje rewrite |
| `public/demo.html`, `public/revolis-demo-v3.html` | Statické demo HTML (Calendly) |
| `/demo` | redirect na `/zakulisie/l99` |

---

## 1. Landing page files (hero, benefits, pricing, testimonials, comparison)

### A) PRODUCTION root — `public/index.html` (monolit)

| Sekcia | HTML anchor / komentár | Riadky (approx.) |
|--------|------------------------|------------------|
| Hero | `<!-- HERO -->` | 147–184 |
| Pain (nie benefits) | `<!-- PAIN -->` `#problem` | 186–201 |
| Benefits | `<!-- BENEFITS -->` `#vyhody` | 203–218 |
| How it works | `#ako-to-funguje` | 220–231 |
| Risk / comparison | `#bez-rizika` `.vs` lose/win | 233–251 |
| Testimonial | **žiadna dedikovaná sekcia** — len anonymný case v copy nie |
| Pricing | `#cennik` | 266–319 |
| FAQ | `#faq` | 321+ |
| Final CTA | `#final` | ~340+ |

### B) App Router landing v2 — `components/landing/LandingPage.tsx`

| Sekcia | id / komponent | Súbor |
|--------|----------------|-------|
| Hero | `.hero` | L50–73 |
| Product mock | `#produkt` → `ProductMock` | L75–82, `LandingInteractive.tsx` |
| Pains | `#pains` | L84–114 |
| Calculator | `#kalkulacka` → `LossCalculator` | L116–123 |
| Steps (benefits-like) | `#ako` | L125–153 |
| Testimonial / case | `#case` | L155–170 |
| Pricing | `<PricingSection />` | L172 → `PricingSection.tsx` / `PricingSectionV2.tsx` |
| Goals | `#goals` | L174–181 |
| FAQ | `#faq` | L183–196 |
| Final | `#final` | L198–219 |

### C) Demo route — `app/demo/page.tsx` + `components/demo/DemoSections.tsx`

| Sekcia | Export |
|--------|--------|
| Hero | `HeroSection` L4–39 |
| Pain | `PainSection` L65–84 |
| Solution + stats comparison | `SolutionSection` L105–159 (Revolis vs 4h12m) |
| CTA band | `DemoCTASection` |
| FAQ + pricing-aware | `FaqSection` L189+ |

### D) Legacy static demo

- `public/demo.html`, `public/revolis-demo-v3.html` — štruktúra ako LandingPage (hero, pains, calc, case, …)

### E) Iné marketing stránky

- `app/balik/page.tsx` — balík / onboarding copy
- `app/zakulisie/[token]/page.tsx` — interné demo (seat ceny 79/71/63, nie v3 root)

---

## 2. SK copy: komu volať, priorita, lead ranking

### Live kampan (`public/index.html`)

| Riadok | Reťazec |
|--------|---------|
| 7, 161 | „AI ich zoradí podľa **priority** … najvážnejšiemu záujemcovi **zavoláte prvý**“ |
| 179 | „**AI triáž a priorita dopytov**“ |
| 192 | „→ AI triáž a priorita dopytov: **prvý voláte tomu**, kto je pripravený konať“ |
| 199, 209, 228 | opak priorita / volať prvý |
| 248 | „najvážnejšiemu záujemcovi **voláte prvý**“ |

*(Presné „komu volať ako prvému“ v index.html **nie je** — používa „zavoláte prvý“ / priorita.)*

### Landing v2 (`LandingPage.tsx`)

| Riadok | Reťazec |
|--------|---------|
| 57–58 | „…povie Vášmu tímu, **komu volať ako prvému** — ešte pred prvou kávou.“ |
| 98–100 | „02 / PRIORITY“ — „**Neviete, komu volať ako prvému**“ |
| 141 | „**skóre pripravenosti kúpy**“ |
| 148 | „zoznamom **priorít**“ |

### `LandingInteractive.tsx` (mock)

| Riadok | Reťazec |
|--------|---------|
| 79 | „zoradení podľa **skóre**“ |
| 90, 101 | „Priorita: …“, „**Denná priorita**“ |
| 26–29 | Goals: horúci záujemcovia, ranný report |

### Demo HTML + layout meta

- `public/demo.html` L218, 277 — „**komu volať ako prvému**“ (tykanie)
- `app/layout.tsx` L10 — meta description s „komu volať ako prvému“

### Demo landing (`DemoSections.tsx`)

| Riadok | Reťazec |
|--------|---------|
| 19 | „**Denné priority** pre každého makléra“ |
| 97 | „5 **priorít** dňa“ |
| `__golden__/demo-sections.html` | „**komu zavolať ako prvému**“ (CTA band) |

### Pricing feature bullets (v2 view)

- `lib/pricing-v2-view.ts` L107–115 — „Denný briefing priorít“, „Skóre pripravenosti kúpy (BRI)“

### Lead modal

- `components/LeadCaptureModal.tsx` L211, 217 — prioritizovaný zoznam, HORÚCE príležitosti

---

## 3. Hero headlines & benefit section (exact SK + paths)

### PROD — `public/index.html`

**Hero (147–182)**

- Pill L150: `AI CRM pre realitných maklérov · akcia do piatka 23. 10. 2026, 12:00`
- **H1 L159:** `Kým iní ešte klikajú,` + gradient `vy už podpisujete.`
- Sub L160: `Každý dopyt v CRM, každý inzerát hotový s AI.`
- Sub L161: dopyty z portálov, **priorita**, voláte prvý, AI texty inzerátov
- CTA L175: `Vyskúšať 14 dní zadarmo`

**Benefits `#vyhody` (203–218)**

- H2 L206: `Viac obchodov, viac náberov, menej klikania`
- Lead L207: `Každá funkcia vám vráti čas alebo klienta…`
- Karty L209–214 (h3):  
  - `AI triáž a priorita dopytov`  
  - `Automatický príjem dopytov z e-mailov portálov`  
  - `AI texty inzerátov`  
  - `Evidencia leadov, kontaktov a nehnuteľností`  
  - `Viac používateľov v jednom účte`  
  - `Prechod svojpomocne za 0 €`

### Alternate — `components/landing/LandingPage.tsx`

**Hero L52–58**

- Eyebrow: `Pre realitných maklérov a majiteľov RK na Slovensku`
- **H1 L53–55:** `Získajte viac klientov. Uzatvárajte viac obchodov.` *`Bez chaosu.`*
- Lead L56–58: …**komu volať ako prvému**…

**„Benefits“ = pains `#pains` L86–112** (4 pain cards, nie `#vyhody` grid)

**Steps `#ako` L127–150** — funkčný benefit copy (dopyty na jednom mieste, skóre, priority)

---

## 4. Pricing v3 — čísla a zdroj pravdy

**Kanón (centy bez DPH):** `apps/crm/src/lib/pricing-v2.ts`

| Pásmo | `netCents` (mesačne pri ročnej) | `isFromPrice` |
|-------|----------------------------------|---------------|
| Start (1) | 2500 → **25 €** | false |
| Team (2–5) | 6500 → **65 €** | false |
| Kancelária (6+) | 7400 → **od 74 €** | true (+9 €/makléra nad 5) |
| Sieť (11+) | 11600 → **od 116 €** | true (+6 € 11–20, +5 € ďalej) |

**Vzorec:** `licenseBaseMonthlyNetCents()` L100–109 (rovnaká logika ako kalkulačka v index.html).

**Kde sa zobrazuje na webe:**

| Miesto | Riadky |
|--------|--------|
| `public/index.html` | L284–287 (karty), L290–300 (slider), L303–310 (kredit balíky), FAQ L330 |
| `components/landing/PricingSectionV2.tsx` | render z `buildPricingV2View()` — **žiadne hardcoded ceny** |
| `lib/pricing-v2-view.ts` | formátovanie z katalógu |
| `lib/pricing.ts` | re-export `buildPricingV2Catalog` z CRM |

**Marketing testy očakávajú:** `__tests__/index-html.test.ts` L8–41, `__tests__/pricing-v2.test.tsx` L69–85 (`EXPECTED_BANDS`).

**Poznámka:** Legacy seat ceny (79/71/63 €/seat) ostávajú v `PricingSection.tsx` fallback a `__tests__/__golden__/pricing-section-*.html` pri `PRICING_V2_ENABLED=false`.

---

## 5. Color palette (navy + gold) — definície (nemeň)

| Súbor | Tokeny |
|-------|--------|
| `app/globals.css` L3–18 | `--navy: #0F172A`, `--gold: #D97706`, `--dark`, `--cyan`, gradient L318 uses gold |
| `app/zakulisie/[token]/zakulisie.css` L2–7 | `--navy: #050A18`, `--navy2`, `--gold: #D4AF37` |
| `app/landing-v2.css` L2–14 | **Navy-blue brand** (`#1B4F8A`, `#143A6B`) — komentár: sync so slate-horizon-theme; **gold accent** cez `--hot: #FBBF24` na skóre HOT |
| `public/index.html` L15 | **Purple campaign** (`--p:#7c3aed`) — **iná** paleta než navy+gold landing-v2 |

---

## 6. Verification / marketing tests

### `apps/marketing/__tests__/`

| Súbor | Čo lockuje |
|-------|------------|
| `index-html.test.ts` | Celý v3 cenník v HTML, kalkulačka, kredit balíky, **zakazuje `pilot`**, SEO canonical, rewrite |
| `pricing-v2.test.tsx` | v2/v3 band labels 25/65/74/116, packs, CTA URLs, feature bullets, modal copy |
| `legacy-golden.test.tsx` | Snapshoty `__golden__/*.html` (legacy pricing 79/71, lead modals, demo-sections, zakulisie) |
| `seo.test.ts` | robots/sitemap www host |

### `apps/crm/tests/verification/` (súvisiace)

| Súbor | Väzba |
|-------|-------|
| `stripe-v2-catalog.verification.test.ts` | v3 tiers vs Stripe JSON |
| `public-site-no-lemon.verification.test.ts` | skenuje `apps/marketing/*` |
| `first-audit.verification.test.ts` | CRM `(marketing)/landing` — nie index.html |

**Žiadny** `apps/marketing/tests/verification/` — len CRM verification + marketing vitest.

---

## 7. „pilot“ → „uvítacie obdobie“

| Nález |
|-------|
| V `apps/marketing` **žiadny** aktívny copy text „pilot“ |
| `index-html.test.ts` L57–60: **assert** `expect(html).not.toMatch(/pilot/i)` |
| Skúšobné obdobie dnes: **„14 dní zadarmo“** / **„skúšobnom období“** (index.html L270, 317, 326, …) — nie „pilot“, nie „uvítacie obdobie“ |

---

## 8. Feature claims on landing (inventory)

### `public/index.html` (live) — tvrdí:

1. Automatický príjem dopytov z **e-mailov** realitných portálov (s kontaktom)
2. **AI triáž a priorita** dopytov
3. **AI texty inzerátov** z parametrov nehnuteľnosti
4. Evidencia **leadov, kontaktov, nehnuteľností**
5. **Viac používateľov** v jednom účte (Team+)
6. Import **CSV/XLSX, RealSoft**; asistovaný prechod 49 € (promo 0 €)
7. **14 dní zadarmo**, bez karty; **30 dní** money-back po platbe
8. **AI kredity** + balíky; CRM funguje bez kreditov
9. Majiteľ / asistentka / back office **zadarmo** (licencia len makléri)

### Landing v2 + demo HTML — navyše / inak:

- **Skóre pripravenosti kúpy (BRI)**, denná priorita, NBA texty, ranný report majiteľovi
- **Návrhy odpovedí / follow-up** na schválenie (nie auto-send)
- Portály menované: Nehnuteľnosti.sk, Topreality, Reality.sk, Bazoš
- Case study Prešov ~10 h/týždeň (prvý klient)

### `DemoSections.tsx` — **silnejšie / rizikové tvrdenia** (demo route redirect):

- Automatické **párovanie** klient–nehnuteľnosť
- **Notifikácie** pripravenosti na akciu
- **&lt; 2 min** odozva, **92%** follow-up, **+34%** úspešnosť (CRM verification odstránila +34% z iného marketing path)
- **Reaktivácia databázy** automaticky
- „Revolis.AI **nie je CRM**“ / integrácia — konflikt s „AI CRM“ na index.html

### Pricing v2 feature list (`pricing-v2-view.ts`):

- Denný briefing priorít, BRI, AI návrhy odpovedí, portálové dopyty; Team: tímový prehľad, ranný report; Office: prioritná podpora

---

## Tests likely to break on copy changes

| Change target | Tests |
|---------------|-------|
| `public/index.html` pricing/copy/guarantee/pilot | `index-html.test.ts` (obsahové `toContain` / `not.toMatch`) |
| PricingSection v2 render | `pricing-v2.test.tsx`, env-gated |
| Legacy pricing / modal / demo | `legacy-golden.test.tsx` → update `__golden__/*.html` |
| Demo FAQ first answer | `pricing-v2.test.tsx` (FaqSection with v2) |
| Demo CTA band text | `__golden__/demo-sections.html` |
| SEO paths | `seo.test.ts` |
| Stripe amounts | `stripe-v2-catalog.verification.test.ts` (CRM, not copy) |

---

## Súhrn pre copy edit

- **Root live copy** = fialová kampaň **`public/index.html`**, nie `LandingPage.tsx`.
- **„komu volať ako prvému“** = landing-v2 + demo HTML; **index** používa priorita / voláte prvý.
- **v3 ceny** = CRM `pricing-v2.ts`; HTML duplikuje karty + JS kalkulačka — musia zostať sync.
- **„pilot“** nikde; test zakazuje; skúšobné obdobie = „14 dní zadarmo“.
- **Dva vizuálne jazyky:** index purple vs landing-v2 navy/gold (`landing-v2.css` + `globals.css`).
