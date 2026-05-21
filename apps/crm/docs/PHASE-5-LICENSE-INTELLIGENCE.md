# Phase 5 — License Intelligence System

**Status:** Foundation shipped in code (capability registry + premium locked UX + upgrade analytics).  
**Priority:** P0 after UI stabilizácia.

## Produktová pravda

Revolis nie je „SaaS subscription“. Je to **progresívny AI operating system** — každý program mení psychológiu, hĺbku AI a revenue logiku.

| Program | Psychológia | Pocit makléra | Technický tier (min) |
|---------|-------------|---------------|----------------------|
| **Smart** | kontrola | „Konečne mám poriadok“ | `starter` |
| **Radar** | príležitosti | „AI mi ukazuje príležitosti“ | `pro` |
| **Guardian** | ochrana | „AI mi chráni peniaze“ | `market_vision` / `enterprise` |
| **Monopol** | dominancia | „AI mi pomáha ovládať trh“ | `protocol_authority` / `command` |

## Implementované (Team 3 Engineering)

| Súbor | Účel |
|-------|------|
| `src/lib/license/types.ts` | Typy programov, capabilities, upgrade events |
| `src/lib/license/capability-registry.ts` | **Centrálny config** — nikdy hardcoded hide v komponentoch |
| `src/lib/license/capability-registry.test.ts` | Unit testy gating logiky |
| `src/hooks/useLicenseCapabilities.ts` | Client hook `can('canUseMarketIntel')` |
| `src/components/license/PremiumLockedOverlay.tsx` | PR4A/C — blur + premium teaser (nie disabled) |
| `src/components/license/UpgradeModal.tsx` | PR4B — upgrade modal |
| `src/lib/license/upgrade-analytics.ts` | Client tracker |
| `src/app/api/analytics/upgrade-intent/route.ts` | Server log upgrade intentov |

**Wire-up:**
- `MarketHeatmap` → `PremiumLockedOverlay` + `canUseMarketIntel`
- `DemandHeatmap` → MapLibre (bez Mapbox tokenu) + `canViewDemandHeatmap`
- `RevolisAIClient` → `useLicenseCapabilities` namiesto hardcoded tier stringov

## Capability registry (target API)

```ts
can('canViewForecast')
can('canUseMarketIntel')
can('canAccessTeamPressure')
can('canViewDemandHeatmap')
can('canUseRescueAutomation')
can('canUseMonopolDominance')
```

## Upgrade analytics (Team 4)

Trackované eventy:
- `locked_feature_view`
- `upgrade_cta_click`
- `forecast_attempt`
- `market_intel_attempt`
- `guardian_teaser_open`
- `upgrade_modal_open` / `upgrade_modal_dismiss`

Log: Vercel → filter `[upgrade-intent]`. Ďalší krok: persist do Supabase `upgrade_intent_events`.

## Locked-state UX pravidlo (Team 2)

❌ Nikdy: skryté features, sivé disabled tlačidlá  
✅ Vždy: visible teaser, blur, premium glow, CTA na upgrade

## Otvorené — vyžaduje ľudský zásah

1. **Zjednotiť tier enums** — `billing-store` (`command`) vs `intelligence-hub` (`protocol_authority`) vs `saas-ops` (`scale`).
2. **Vypnúť DEV override** v `saas-ops.ts` (`canUseFullApp: true`, všetky flags true) pre produkciu.
3. **Stripe → program mapping** — marketing názvy Radar/Guardian/Monopol v checkout copy.
4. **Wire ďalšie surfaces** — `/forecast`, `/team`, L99 Decision Ops, dashboard NBA strips.
5. **Decision engine feature flags** — `DECISION_ENGINE_ENABLED` vo Vercel Production.
6. **MapLibre tile SLA** — OpenFreeMap free; pri scale zvážiť self-hosted tiles.

## Phase 6 — Demo System (next)

`demo.revolis.ai` — cinematic AI simulation, nie marketing web.  
Flow: scan → opportunity → prioritization → revenue risk → dominance signal → upgrade CTA.

---

## Paralelná práca s ChatGPT

**Áno, môžete simultánne**, ak rozdelíte scope:

| Cursor (tento repo) | ChatGPT |
|---------------------|---------|
| Kód, PR, deploy, testy | Copy, sales skripty, demo scenáre |
| Capability registry, API | License psychology copy, onboarding narratívy |
| MapLibre, gating wire-up | Phase 6 demo storyboard |

**Pravidlo:** Jeden zdroj pravdy pre tier keys = `capability-registry.ts`. ChatGPT generuje copy; Cursor implementuje config.
