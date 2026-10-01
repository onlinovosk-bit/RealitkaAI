# Capability: Vertical Pack Demo

**Súbor:** `apps/crm/src/lib/capabilities/vertical-pack-demo/build.ts`  
**Stav:** ✅ verified (Smolko 13303557 — plný demo pack)

## Čo robí

Agreguje všetky Wave 1 capabilities pre jednu nehnuteľnosť do jedného volania.
Určené pre demo / capabilities preview — nie pre produkčný publish flow.

## Vstupy

```ts
{
  agencyId: string
  property: RealviaPropertyRow
}
```

## Výstupy

```ts
VerticalPackDemo {
  sourceId: string
  propertyTitle: string
  listing: GeneratedListing        // listing-generator výstup
  banners: BannerSpec[]            // banner-factory (všetky 4 stavy, brandKit: #1e3a5f)
  deckOwner: PresentationDeck      // presentation-builder audience=owner
  deckBuyer: PresentationDeck      // presentation-builder audience=buyer
  microsite: MicrositeSpec         // property-microsite
  completeness: ListingCompletenessScore  // listing-score
}
```

## Príklad — Smolko 13303557

```ts
const demo = buildVerticalPackDemo({ agencyId, property: REALVIA_SMOLKO_13303557 });
// demo.sourceId === "13303557"
// demo.listing.headline.includes("Modrá")
// demo.banners.length === 4
// demo.completeness.scorePercent === 44
// demo.deckOwner.slides.length >= 3
// demo.microsite.publishBlocked === true  (bez human approval)
```

## Poznámka k HTML

`buildVerticalPackDemo` nezávisle nestripa HTML — to robí `realviaRowToUcListing` na vstupe.
Každá capability dostane čistý `UcListingMapped` bez HTML v description.
