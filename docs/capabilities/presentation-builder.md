# Capability: Presentation Builder

**Súbor:** `apps/crm/src/lib/capabilities/presentation-builder/build.ts`  
**Stav:** ✅ verified (Smolko 13303557 — owner + buyer deck, Guardian PASS)

## Čo robí

Vytvorí prezentačný deck (slides) z nehnuteľnosti pre dve cieľové skupiny: majiteľ (owner) alebo kupujúci (buyer).
Interne volá `generateListingDraft` — Guardian check je zahrnutý.

## Vstupy

```ts
{
  agencyId: string
  property: RealviaPropertyRow
  audience: "owner" | "buyer"
}
```

## Výstupy

```ts
PresentationDeck {
  draftId: string            // deck-{audience}-{sourceId}
  sourceId: string
  audience: "owner" | "buyer"
  slides: PresentationSlide[]  // minimum 3 slides
  guardianPass: boolean
}

PresentationSlide {
  title: string
  bullets: string[]
}
```

## Štruktúra slides

**Owner deck:**
1. "Prehľad pre majiteľa" — headline + fakty (plocha, pozemok, cena, lokalita)
2. "Popis" — body z listing generátoru (max 5 odsekov)
3. "Kontakt makléra" — meno, telefón, email

**Buyer deck:**
1. "Pre kupujúceho" — headline + SEO description
2. "Kľúčové parametre" — fakty alebo fallback "Parametre doplní maklér z inzerátu"
3. "Ďalší krok" — "Obhliadka po dohode" + telefón makléra

## HTML a cena=0

- HTML v popise je stripnutý pred vložením do slides (cez listing-generator pipeline)
- `Cena 0` sa nikdy neobjaví v faktoch (cena sa pridá len ak `price > 0`)

## Príklad — Smolko 13303557

```ts
const deck = buildPresentationDeck({ agencyId, property: REALVIA_SMOLKO_13303557, audience: "owner" });
// deck.slides[0].title === "Prehľad pre majiteľa"
// deck.slides[0].bullets[0].includes("Modrá")
// deck.guardianPass === true
```
