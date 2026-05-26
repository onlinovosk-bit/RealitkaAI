# Reality Monopol (Protocol Authority) — audit funkčnosti

| Pole | Hodnota |
|------|---------|
| **Brand** | Reality Monopol (`PROGRAM_BRAND_LABEL.protocol`) |
| **Tier** | `protocol_authority` (alias `command`) |
| **UI role** | `owner_protocol` |
| **Program ID** | `monopol` |
| **Cena** | 449 €/mes (`PLAN_PRICES_EUR.protocolAuthority`) |

## Ruflo orchestrácia

| Krok | Nástroj | Výsledok |
|------|---------|----------|
| Workflow | `guidance_workflow` testing | tester + coder |
| Route | `hooks_coverage-route` | skip (bez gap indexu) |

## Vitest

```bash
cd apps/crm
npm run test -- --run src/lib/__tests__/reality-monopol-program-features.test.ts
```

## Exkluzívne oproti Market Vision

| Capability | UI / route |
|------------|------------|
| `canUseCompetitionRadar` | `/l99-hub` — `CompetitionMap` |
| `canUseMonopolDominance` | registry (UI hook doplniť) |
| Nav „Kde konkurencia spí“ | **iba** `owner_protocol` |

Market Vision (`owner_vision`) **nemá** položku `competition` v menu.

## Owner menu (Protocol = MV + navyše)

Všetko z Market Vision plus:

- **Kde konkurencia spí** → `/l99-hub` (Competition Heatmap, IntelBrief)

## Marketing — protocol-only riadky (vzorka)

- Prehľad majiteľa / AI mozog tímu / API / white-label
- Živý radar obchodov (nie v MV matrix)
- Kataster bez limitu, detektor konkurencie, skryté ponuky

## Manuálny smoke (produkcia)

1. `account_tier=protocol_authority`, `ui_role=owner_protocol`
2. Sidebar: položka **Kde konkurencia spí** viditeľná
3. `/l99-hub` — `CompetitionMap` aktívna, `IntelBrief` odomknutý
4. `/team`, `/forecast`, `/dashboard` — dáta pod RLS (po PR #64)
5. Market Vision účet **nevidí** competition menu

## Známe medzery (≠ 100 % live)

| Gap | Poznámka |
|-----|----------|
| `canUseMonopolDominance` | Cap v registry, **bez samostatného UI** |
| `canUseCompetitionRadar` | Nie je v `useCapabilities()` na všetkých stránkach — hub používa `isProtocolAuthority` z `/api/hub/get-tier` |
| RLS / CRM nuly | PR #64 — deploy na `main` |
| API / white-label / AM | marketing matrix — overiť manuálne v settings/billing |

## Súvisiace audity

- [Market Vision](./market-vision-feature-audit.md)
- [Smart Start & Active Force](./smart-active-program-audit.md)
- [CRM zero data](../incidents/crm-zero-data-audit.md)
