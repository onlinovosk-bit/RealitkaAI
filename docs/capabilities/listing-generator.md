# Capability: Listing Generator

**Súbor:** `apps/crm/src/lib/capabilities/listing-generator/generate.ts`  
**Stav:** ✅ verified (Smolko 13303557 — Guardian PASS)

## Čo robí

Z UC listing záznamu vygeneruje textový listing draft (nadpis, telo, SEO, kľúčové slová)
a okamžite ho overí cez Quality Guardian. Žiadne vymyslené fakty — len polia z UC záznamu.

## Vstupy

```ts
ListingGeneratorInput {
  agencyId: string
  listing: UcListingMapped  // výstup z realviaRowToUcListing() alebo mapUcListingPayload()
}
```

## Výstupy

```ts
GeneratedListing {
  draftId: string            // listing-{externalId}-{timestamp}
  headline: string           // z listing.langData.sk.title alebo listing.title
  body: string               // popis + plocha + cena (len ak >0) + lokalita
  seoTitle: string           // headline slice 60 znakov
  seoDescription: string     // popis slice 160 znakov
  keywords: string[]         // typ, izby, lokalita
  guardian: GuardianReviewResult
}
```

## Dôležité správanie

- **Cena 0 EUR**: ak `listing.price === 0` alebo `null`, riadok `Cena X EUR` sa do body nepridá.
  Dôvod: Smolko PROD má `price=0` pri neznámej cene — Guardian by flagoval `free_text_price_mismatch`.
- **HTML v popise**: `listing.description` prichádza z `realviaRowToUcListing()`, ktorý volá
  `stripHtmlToPlainText()`. Body nikdy neobsahuje HTML tagy.

## Príklad — Smolko 13303557 (price=0)

```ts
const listing = realviaRowToUcListing(REALVIA_SMOLKO_13303557);
// listing.description = "Reality Smolko ponúka na predaj murovanú novostavbu..."
// listing.price = 0

const result = generateListingDraft({ agencyId: "...", listing });
// result.body NEOBSAHUJE "Cena 0 EUR"
// result.guardian.verdict === "pass"
```

## Závislosť na Guardian

`generateListingDraft` interne volá `reviewGeneratedListing`. Výstup vždy obsahuje
`guardian` — klient môže skontrolovať `guardian.blockedPublish` pred ďalším krokom.
