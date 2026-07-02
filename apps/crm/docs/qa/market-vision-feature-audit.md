# Market Vision — audit funkčnosti (Ruflo + L99 QA)

**Program:** Guardian (`market_vision` tier, UI role `owner_vision`)  
**Cena:** 199 €/mes · **Brand:** STRÁŽCA CIEN A ZISKOV  

## Súhrn auditu (2026-05-27)

| Metrika | Hodnota |
|---------|---------|
| **Funkčná pripravenosť (odhad)** | **~77 %** — licencie, navigácia, heatmapa, forecast, tím, Vitest kotvy |
| **Vitest** | `market-vision-features.test.ts` — **10/10 passed** (lokálne 2026-05-27) |
| **Build** | `npm run build` v `apps/crm` — **OK** |

### Čo funguje (high confidence)

- Program `market_vision` → guardian capabilities v registry  
- Owner menu routes (`/dashboard`, `/forecast`, `/team`, ghost tab, billing, onboarding-monitor)  
- Marketing matrix ↔ filesystem kotvy v testoch  
- Revolis AI / heatmapa pre tier s `canUseMarketIntel`  
- Protocol-only features zamknuté (`Competition Radar`, stealth recruiter, monopol)

### Čo je čiastočné / env-dependent

| Oblasť | Stav | Poznámka |
|--------|------|----------|
| **Guardian revenue alerts** | Stub / UI bez plného backendu | `canAccessGuardianAlerts` v registry; produkčný alert stream nie je 100 % e2e |
| **Rescue automation** | Env-dependent | `RESCUE_AUTOMATION_ENABLED` (default `false`); API `/api/ai/rescue/trigger` existuje, produkcia vyžaduje Vercel env + `decision-flags` |
| **Decision engine panel** | Env-dependent | `DECISION_ENGINE_ENABLED`, `CLOSING_WINDOW_ENABLED` |
| **RLS / tenant data** | Deploy-sensitive | Po PR #64 — overiť `/api/crm/tenant-health` na preview s reálnym owner účtom |
| **Realvia import** | Samostatný pipeline | Cron + queue, nie súčasť MV menu smoke |

### Odporúčaný ďalší krok (L99)

1. Merge copy/QA PR → preview smoke s `market_vision` účtom.  
2. Zapnúť rescue/decision env na staging, manuálny test z lead detail / L99 panel.  
3. Dokončiť Guardian alerts backend alebo skryť teaser v UI do ďalšieho PR.

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
