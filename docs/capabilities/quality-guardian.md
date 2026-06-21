# Capability: Quality Guardian

**Súbor:** `apps/crm/src/lib/capabilities/quality-guardian/review.ts`  
**Stav:** ✅ verified (Smolko 13303557 — PASS)

## Čo robí

Validuje vygenerovaný listing draft oproti zdrojovým faktom nehnuteľnosti.
Výsledok `pass` = draft môže pokračovať k publikácii; `flag` = blokuje publish, čaká na ľudskú opravu.

## Vstupy

```ts
GuardianReviewInput {
  agencyId: string           // UUID agentúry
  source: PropertyFacts      // fakty z reálnej zákazky (cena, plocha, lokalita, titul)
  draft: GeneratedListingDraft {
    draftId: string
    headline: string
    body: string
    claimedFacts?: Record<string, string | number>  // čo draft tvrdí
    seoTitle?: string
    seoDescription?: string
  }
  brandKit?: BrandKit        // voliteľné — farba, tón
}
```

## Výstupy

```ts
GuardianReviewResult {
  verdict: "pass" | "flag"
  reasons: string[]          // prázdne pri PASS
  blockedPublish: boolean    // true ak flag
}
```

## Pravidlá validácie

1. **missing_headline / missing_body** — headline/body nesmú byť prázdne
2. **invented_fact_field:X** — `claimedFacts` obsahuje pole, ktoré neexistuje v `source`
3. **fact_mismatch:X** — hodnota v `claimedFacts` sa nezhoduje s `source`
4. **free_text_price_mismatch:N** — číslo v tele textu (formát `12345 €/EUR`) sa nezhoduje s `source.price`
5. **free_text_area_mismatch:N** — m² v tele textu sa nezhoduje s `source.usableArea`
6. **brand_color_off_palette** — draft obsahuje `#000000` keď `brandKit.primaryColor !== #000000`

## Príklad — Smolko 13303557

```ts
// source: price=0, usableArea=76, title="Predaj novostavby RD..."
const result = reviewGeneratedListing({
  agencyId: "...",
  source: propertyFactsFromUcListing(listing),
  draft: {
    draftId: "test",
    headline: "Predaj novostavby RD v obci Modrá nad Cirochou, okr. Humenné.",
    body: "Reality Smolko ponúka... Úžitková plocha 76 m².\n\nLokalita: Školská, Modrá nad Cirochou.",
    claimedFacts: { title: "...", usableArea: 76, location: "Školská, Modrá nad Cirochou" },
  },
});
// result.verdict === "pass" ✅
```

**Prečo PASS:** cena=0 nie je v `claimedFacts`, takže žiadne mismatch. m² 76 sedí so source.

## Audit log

Každé volanie zapisuje do in-memory audit logu (`appendCapabilityAudit`).
V testoch: `clearCapabilityAuditForTests()` + `listCapabilityAudit("quality-guardian")`.
