# Performance Audit — 2026-06-08

**Branch:** `chore/performance-audit` | **Agent:** J (Brief 2.0)

## Build

- `npm run build` (apps/crm) — **OK** (~53s)
- Next.js 16 App Router — default build output **neuvádza First Load JS** per route (odporúčanie: `@next/bundle-analyzer` v ďalšom sprinte)
- `@next/bundle-analyzer` — **nie je** v package.json (brief: nepridávať)

## Bundle size (odhad z architektúry)

| Route | Typ | Poznámka |
|-------|-----|----------|
| `/dashboard` | ƒ Dynamic | Veľa panelov — kandidát na code splitting |
| `/leads` | ƒ Dynamic | Tabuľka + filtre |
| `/import/universal` | ƒ Dynamic | Wizard + CSV parse |
| `/sales-funnel` | ƒ Dynamic | SaaS funnel tabuľky |
| `/revolis-ai` | ƒ Dynamic | AI panely |

## Nájdené problémy

### Large routes (> 300kB First Load)
- Presná kB metrika vyžaduje bundle analyzer — **TODO** pre Andy schválenie
- `/dashboard` — 15+ synchronných importov panelov (najväčší kandidát)

### Unoptimized images (`<img>` namiesto `next/image`)
- **0 súborov** s raw `<img>` v `apps/crm/src/**/*.tsx`

### Chýbajúce lazy loading
- `EnterpriseSalesIntelligencePanel` — dashboard (opravené)
- `BrokerCoach` — dashboard (opravené)
- `RevenueView` — dashboard (opravené)
- `AssistantPanel` — už lazy cez `AssistantPanel.dynamic.tsx`

## Vykonané opravy

| Zmena | Súbor |
|-------|-------|
| dynamic() pre EnterpriseSalesIntelligencePanel | `DashboardPageClient.tsx` |
| dynamic() pre BrokerCoach | `DashboardPageClient.tsx` |
| dynamic() pre RevenueView | `DashboardPageClient.tsx` |
| img → Image konverzií | **0** (žiadne `<img>`) |

## Existujúce optimalizácie (bez zmeny)

- `next.config.js` → `optimizePackageImports: ["lucide-react", "framer-motion"]`

## Odporúčania pre ďalší sprint

1. Pridať `@next/bundle-analyzer` len na CI preview (nie prod dependency lock)
2. Lazy load `L99DecisionOpsPanel` + `AiInsightsPanel` na dashboarde
3. Route-level loading.tsx pre `/leads` a `/import/universal`
4. Skontrolovať duplicitné načítanie `leads-store` na dashboarde vs. server props
