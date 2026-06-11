# `lib/metrics` — founder dashboard

**Stav:** modul **nie je na `main`** — doručený v PR [#187](https://github.com/onlinovosk-bit/RealitkaAI/pull/187), rozšírený v [#191](https://github.com/onlinovosk-bit/RealitkaAI/pull/191) (M2).

## Štruktúra (vetva `feat/founder-metrics`)

| Súbor | Účel |
|-------|------|
| `access.ts` | Gate cez `FOUNDER_EMAILS` (comma-separated allowlist) |
| `compute.ts` | MRR, seaty, Cockpit attach %, kredity, credit revenue % |
| `fetch.ts` | Supabase queries — **žiadne nové migrácie** v M |
| `guardrails.ts` | Pásma z `pricing-v1.md` (>40 % attach, credit revenue 10–25 %) |
| `types.ts` | Typy metrík a trendov |

## M2 doplnky (#191)

- CSV export API: `/api/internal/metrics/export?kind=summary|ai-cost|trends`
- 4-týždňové weekly trendy + sparklines na `/internal/metrics`
- `ai_cost_daily` view — graceful fallback ak migrácia nie je aplikovaná

## Smolko výnimka

`manual_plan = market_vision` → samostatný riadok **199 €** (grandfathered), mimo self-serve seat MRR.

## Testy

`lib/metrics/__tests__/` — access, compute, fixtures (11+ testov na #187; +6 na #191)

## Env

```
FOUNDER_EMAILS=andy@example.com,founder@example.com
```

Bez nastavenia → route vráti `notFound()`.
