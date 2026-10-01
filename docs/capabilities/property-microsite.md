# Capability: Property Microsite

**Súbor:** `apps/crm/src/lib/capabilities/property-microsite/build.ts`  
**Stav:** ✅ verified (Smolko 13303557 — Guardian PASS, publishBlocked=true bez human approval)

## Čo robí

Generuje špecifikáciu micrositu nehnuteľnosti. Bez explicitného `humanApproved=true`
je microsite nastavená na `noindex=true` a `publishBlocked=true` — human approval gate je povinná
pred každým reálnym publishom.

## Vstupy

```ts
{
  agencyId: string
  property: RealviaPropertyRow
  humanApproved?: boolean    // default: false → publishBlocked=true
}
```

## Výstupy

```ts
MicrositeSpec {
  draftId: string            // microsite-{sourceId}
  propertyId: string
  sourceId: string
  noindex: boolean           // true ak nie je guardian PASS + human approval
  heroTitle: string          // listing headline
  heroSubtitle: string       // listing.location
  body: string               // listing body (plain text, bez HTML)
  imageUrls: string[]
  broker: { name, email, phone }
  guardianPass: boolean
  publishBlocked: boolean
}
```

## Human approval gate

`publishBlocked = !guardianPass || !assertPublishAllowed().ok`

`assertPublishAllowed` vždy vracia `{ ok: false }` pokiaľ nie je externý signál ľudského schválenia.
Bez toho je `publishBlocked=true` aj pri Guardian PASS.

## Pomocná funkcia

```ts
micrositeGuardianCheck(agencyId, property, headline, body): GuardianReviewResult
```

Znovu spustí Guardian na ľubovoľnom headline/body páre pre ten istý `property`.
Použitie: QA po manuálnej úprave kópie.

## HTML v popise

`body` prichádza z `generateListingDraft` ktorý stripuje HTML pred generovaním.
`spec.body` nikdy neobsahuje HTML tagy.

## Príklad — Smolko 13303557

```ts
const spec = buildPropertyMicrosite({ agencyId, property: REALVIA_SMOLKO_13303557 });
// spec.heroTitle.includes("Modrá")
// spec.noindex === true        (bez human approval)
// spec.publishBlocked === true
// spec.imageUrls.length > 0
// spec.guardianPass === true
// spec.body — žiadne HTML tagy
```
