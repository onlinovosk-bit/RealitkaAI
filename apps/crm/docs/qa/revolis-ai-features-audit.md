# Revolis.AI — kompletný audit AI features

**Scope:** `apps/crm` — UI, API `/api/ai/*`, `src/lib/ai/*`, matching, odporúčania, scoring, cron.

## Ruflo orchestrácia

| Krok | Výsledok |
|------|----------|
| `guidance_workflow` testing | tester + coder |
| `hooks_coverage-route` | skip (bez gap indexu) |

## Automatické testy

```bash
cd apps/crm
# Inventár + routy + license gates
npm run test -- --run src/lib/__tests__/revolis-ai-features.test.ts

# Jadro AI modulov
npm run test -- --run src/lib/ai/__tests__
```

**Registry:** `REVOLIS_AI_FEATURE_REGISTRY` v `revolis-ai-features.test.ts` (~31 feature specs, 11 kategórií).

## Kategórie AI

| Kategória | Príklady |
|-----------|----------|
| core | `engine.ts`, `fallback`, `multi-model` |
| scoring | BRI, Sales Brain, `/scoring`, `bri-stream` |
| matching | matching engine, `/matching`, recalculate API |
| recommendations | `recommendations-store`, `/recommendations` |
| calls | `/call-analyzer`, transcribe, analyze, coach stream |
| hub | `/revolis-ai`, insights API |
| forecast | monthly forecast, closing window |
| decision | score-lead, process-lead, lead-events |
| automation | autopilot, rescue, dead-lead, micro-actions |
| search | semantic search, embeddings |
| dashboard | insights panel, deal strategy |
| cron | daily-match, lead-ai-triage, morning-brief |

## UI — hlavné AI kapitoly

| Route | Funkcia |
|-------|---------|
| `/dashboard` | Denný briefing, AI panely, priority |
| `/leads` | BRI, Sales Brain, deal strategy |
| `/matching` | Lead ↔ nehnuteľnosť |
| `/recommendations` | Persistované AI odporúčania |
| `/scoring` | AI scoring prehľad |
| `/revolis-ai` | AI asistent, heatmapy (tier) |
| `/call-analyzer` | Analýza hovorov |
| `/l99-hub` | Prediktívna inteligencia (tier) |
| `/settings/nexus-ai-chat` | Nexus chat nastavenia |

## API `/api/ai` (17 route handlerov)

Všetky musia byť v `REVOLIS_AI_FEATURE_REGISTRY` — test to vynucuje.

## License gates (AI)

| Capability | Min. program |
|------------|----------------|
| `canUseAiTasks` | Smart Start |
| `canViewForecast` | Active Force |
| `canViewClosingWindow` | Active Force |
| `canUseMarketIntel` | Market Vision+ |
| `canUseRescueAutomation` | Market Vision+ |
| `canUseCompetitionRadar` | Reality Monopol |

## Manuálny smoke (po deploy PR #64)

1. `/qa` alebo `/system` — smoke panel (leads, matches, recommendations count)
2. `/matching` → Prepočítať matching
3. `/recommendations` → Prepočítať odporúčania
4. `/scoring` → recalculate (ak plan enabled)
5. `/call-analyzer` — upload / analyze flow
6. `/revolis-ai` — heatmap podľa tieru
7. `GET /api/crm/tenant-health` — dáta pre AI moduly nie sú prázdne

## Známe medzery (≠ 100 % produkcia)

| Gap | Poznámka |
|-----|----------|
| RLS / prázdne store | PR #64 — deploy |
| `canViewClosingWindow` | Registry bez UI hooku |
| OpenAI keys | `.env` — bez kľúča API vracia fallback |
| E2E Playwright | `tests/smoke.spec.ts` — spustiť na preview |
| Outreach AI | feature-gating + plan |

## Súvisiace program audity

- [Smart Start & Active Force](./smart-active-program-audit.md)
- [Market Vision](./market-vision-feature-audit.md)
- [Reality Monopol](./reality-monopol-program-audit.md)
