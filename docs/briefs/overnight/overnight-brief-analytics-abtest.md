# OVERNIGHT BRIEF: Analytics, A/B Test & Email Tracking — Valuation Widget

**Cieľová cesta v repe:** `docs/briefs/overnight/overnight-brief-analytics-abtest.md`
**Dátum:** 2026-07-21 · **Kategória:** Workflow Capability (rozširuje bežiaci widget)
**Kontext:** Nadväzuje na `overnight-brief-valuation-widget.md` (Wave 1 hotová, PR #309).
Rieši tri veci naraz: (1) spor o poradie krokov formulára — riešime A/B testom,
nie jednostranným prepnutím; (2) chýbajúce GA4 z pôvodného Wave 2; (3) click
tracking pre cold e-mailové kampane.

---

## PRIORITA 1 — A/B test: kontakt-najprv vs. odhad-najprv

### Hypotéza (founder, na overenie)
"Kontakt pred odhadom prinesie viac odovzdaných kontaktov ako odhad pred
kontaktom, pretože majiteľ musí dať kontakt skôr, než dostane hodnotu."

**Konkurenčná hypotéza (z briefu a validation dokumentu):** "Odhad pred
kontaktom prinesie menej, ale kvalitnejších leadov a menší bounce na kroku 1,
lebo majiteľ vidí hodnotu skôr, než sa musí zaviazať."

Namiesto rozhodovania medzi nimi — **meriame obe súčasne.**

### Implementácia (jeden PR, disjoint od existujúcich flow súborov)
- **Súbory:** `src/lib/valuation/ab-test.ts` (assignment logika),
  `src/app/odhad/[agencySlug]/page.tsx` (vetvenie podľa varianty — úprava
  existujúceho, nie nový súbor).
- Priradenie varianty: pri prvej návšteve `/odhad/[slug]` sa vygeneruje
  `session_id` (ak neexistuje) a deterministicky (hash session_id) priradí
  variant `A` (súčasný: nehnuteľnosť→kontakt→odhad) alebo `B`
  (nehnuteľnosť→odhad→kontakt). Uložiť do cookie (30 dní), nech používateľ
  vidí konzistentne rovnaký variant pri návrate.
- Variant sa loguje ako GA4 custom dimension `ab_variant` na KAŽDOM evente.
- **Vzorka:** 50/50 split, žiadne manuálne prepínanie.
- **Minimálna doba behu pred vyhodnutením:** 14 dní ALEBO 100 návštev na
  variant (podľa toho, čo nastane neskôr) — inak je vzorka štatisticky
  nespoľahlivá.

### Čo sa meria (metriky úspechu)
| Metrika | Definícia |
|---|---|
| `funnel_start_rate` | % návštevníkov, ktorí začali krok 1 |
| `contact_capture_rate` | % z návštevníkov, ktorí odovzdali kontakt (KĽÚČOVÁ metrika pre founder hypotézu) |
| `full_completion_rate` | % návštevníkov, ktorí prešli všetky kroky |
| `lead_quality_proxy` | % leadov s platným telefónnym formátom + bez honeypot triggeru |
| `time_to_abandon` | medián času do opustenia stránky bez dokončenia |

**Rozhodovacie pravidlo (zapísať PRED spustením):** vyhráva variant s vyšším
`contact_capture_rate` PRI aspoň rovnakej `lead_quality_proxy` (± 10 %).

---

## PRIORITA 2 — GA4 eventy

Eventy s povinnými parametrami `ab_variant`, `agency_slug`, `session_id`:
- `valuation_started`, `step_completed`, `valuation_shown`, `contact_submitted`,
  `lead_submitted`, `abandon`

---

## PRIORITA 3 — UTM pre cold email (bez vlastného trackera)

`?utm_source=email&utm_medium=cold&utm_campaign=wave3&utm_content={variant}&utm_term={firma_slug}`

---

## FOUNDER BRÁNY
- GO na spustenie A/B testu (mení produkčné správanie pre 50 % návštevníkov).
- Rozhodnutie po 14 dňoch: promote variant B / zostať pri A / predĺžiť test.
