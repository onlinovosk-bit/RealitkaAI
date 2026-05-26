# Market Vision — audit funkčnosti (Ruflo + L99 QA)

**Program:** Guardian (`market_vision` tier, UI role `owner_vision`)  
**Cena:** 199 €/mes · **Brand:** STRÁŽCA CIEN A ZISKOV  

## Ruflo orchestrácia (2026-05-26)

| Krok | Nástroj | Výsledok |
|------|---------|----------|
| Workflow | `guidance_workflow` type=`testing` | tester + coder, hierarchical |
| Autopilot | `autopilot_enable` | zapnutý (max 50 iter, 240 min) |
| Coverage gaps | `hooks_coverage-gaps` | žiadne reportované dáta v repe |
| Route task | `hooks_coverage-route` | skip — bez gap indexu |

## Automatické testy (Vitest)

Súbor: `src/lib/__tests__/market-vision-features.test.ts`

- Guardian capabilities pre `market_vision`
- Protocol-only capabilities zamknuté
- `owner_vision` navigácia → existencia `page.tsx`
- Marketing matrix → filesystem kotvy pre kľúčové MV features

Spustenie:

```bash
cd apps/crm
npm run test -- --run src/lib/__tests__/market-vision-features.test.ts
```

## Owner menu (Market Vision)

| Položka | Route |
|---------|-------|
| Kde sú peniaze dnes | `/dashboard` |
| Koľko zarobíme tento mesiac | `/forecast` |
| Môj tím výkonnosť | `/team` |
| Čo vidí môj tím | `/dashboard/reputation/integrity` |
| Skryté príležitosti trhu | `/l99-hub?tab=ghost` |
| Predplatné | `/billing` |
| Onboarding Automat | `/onboarding-monitor` |

**Len Protocol Authority:** `/l99-hub` (Competition Radar) — nie je v MV menu.

## Guardian capabilities (kód)

- `canUseMarketIntel` → `MarketHeatmap`, Revolis AI
- `canViewDemandHeatmap` → `DemandHeatmap`
- `canAccessTeamPressure` → `TeamPressureGate` na `/team`
- `canUseRescueAutomation`, `canAccessGuardianAlerts`

## Manuálny smoke (produkcia / preview)

Po merge PR #64 a prihlásení ako owner `market_vision`:

1. `/api/crm/tenant-health` — počty > 0
2. `/dashboard`, `/forecast`, `/team` — živé KPI (nie samé nuly)
3. `/l99-hub?tab=ghost` — Ghost tab načíta obsah
4. `/revolis-ai` — heatmapa s detailom (nie len teaser)
5. Billing zobrazuje plán Market Vision / Guardian

## Známe medzery (nie 100 % e2e bez staging login)

| Oblasť | Riziko |
|--------|--------|
| RLS / session | Opravené v PR #64 — vyžaduje deploy |
| Realvia import | Samostatný cron + queue |
| Kataster limit 100 | Závisí od externého API |
| Competition Radar | Zámerne Protocol-only |

**Cieľ 100 %:** po deploy spustiť Vitest + Playwright smoke + manuálny checklist vyššie.
