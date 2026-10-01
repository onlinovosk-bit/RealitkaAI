# Capability: Listing Score

**Súbor:** `apps/crm/src/lib/capabilities/listing-score/score.ts`  
**Stav:** ✅ verified (Smolko 13303557 — 44%, Guardian PASS)

## Čo robí

Hodnotí úplnosť záznamu nehnuteľnosti z 9 sledovaných polí.
Skóre = počet vyplnených polí / 9. Zahrňuje Guardian review na completeness summary.

## Sledované polia (9)

| Kľúč | Label | Podmienka |
|------|-------|-----------|
| photos | Fotky | `images.length >= 1` |
| video | Video | kľúčové slová video/youtube/vimeo v `payload_raw` |
| virtual_tour | Virtuálna prehliadka | kľúčové slová matterport/3d_tour/panorama v `payload_raw` |
| description | Popis | plain text `description.length >= 40` |
| price | Cena | `price != null && price > 0` |
| gps | GPS | `latitude != null && longitude != null` (alebo z `payload_raw.advert.geo_point`) |
| energy_cert | Energetický certifikát | `payload_raw.advert.building_energy_rating_certificate` |
| category | Kategória | `type` nie je prázdny |
| location | Lokalita | `location` nie je prázdny |

## Vstupy / Výstupy

```ts
// Vstup
{ agencyId: string; property: RealviaPropertyRow }

// Výstup
ListingCompletenessScore {
  sourceId: string
  scorePercent: number       // 0–100
  filledCount: number
  totalCount: number         // 9
  missing: string[]          // labely chýbajúcich polí (lowercase)
  fields: CompletenessField[]
  summary: string
  guardian: GuardianReviewResult
}
```

## HTML v popise

`score.ts` volá `stripHtmlToPlainText()` priamo na `row.description` pred meraním dĺžky.
Takže raw HTML padding (napr. desiatky `<br/>`) nezvýši score na description field.

## Príklad — Smolko 13303557

```
scorePercent: 44  (4/9 polí)
filledCount: 4   → photos, description, category, location
missing: video, virtuálna prehliadka, cena, gps, energetický certifikát
guardian.verdict: "pass"
```

Cena je 0 → `price` pole `present=false`. Guardian PASS pretože `claimedFacts` neobsahuje cenu 0.
