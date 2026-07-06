# Capability: Banner Factory

**Súbor:** `apps/crm/src/lib/capabilities/banner-factory/build.ts`  
**Stav:** ✅ verified (Smolko 13303557 — 4 banners, všetky Guardian PASS)

## Čo robí

Pre nehnuteľnosť vygeneruje sadu bannerov (stavové varianty) s nadpisom, podnadpisom
a farbou z brand kitu. Každý banner prechádza Guardian review.

## Vstupy

```ts
{
  agencyId: string
  property: RealviaPropertyRow
  brandKit?: BrandKit        // primaryColor, tone
  states?: BannerState[]     // "for_sale" | "reduced" | "sold" | "reserved"
                             // default: všetky 4
}
```

## Výstupy

```ts
BannerSpec[] {
  state: BannerState
  headline: string           // "{STAV_LABEL} — {title}"
  subline: string            // "{location} · {price EUR}" (prázdne časti vynechané)
  primaryColor: string
  guardianPass: boolean
}
```

## Správanie pri chýbajúcich hodnotách

- **price=0 alebo null**: cena sa do subline nepridá (žiadne "0 EUR")
- **location=""**: subline bez location časti
- **obidve chýbajú**: subline je prázdny string `""`

## Príklad — Smolko 13303557

```ts
buildBannerSpecs({ agencyId, property: REALVIA_SMOLKO_13303557, states: ["for_sale"] })
// →  [{
//   state: "for_sale",
//   headline: "Na predaj — Predaj novostavby RD v obci Modrá nad Cirochou, okr. Humenné.",
//   subline: "Školská, Modrá nad Cirochou",  // cena vynechaná (price=0)
//   primaryColor: "#1e3a5f",
//   guardianPass: true
// }]
```
