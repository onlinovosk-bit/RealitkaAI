# Perf-hotfix complement - test/build evidence

**Datum:** 2026-08-16
**Vetva:** `fix/perf-hotfix-complement`
**Base:** `origin/main` @ `0e3f90769` (`docs: draft Stage 1 plan for first real RK lead loop (#418)`)
**Rezim:** vetva + PR + **STOP**. Ziadny merge. Founder merguje.

Doplnok k #428-#432. Tento PR **nie** je merge tych lane; berie len tri Cowork patche, ktore v #428-#432 nie su.

## Aplikovane patche (iba tieto tri)

Archiv: `C:\Users\aondr\Downloads\perfhotfixpatches20260816.tar.gz`
(na disku bez pomlciek; obsah = `perf-hotfix/` z `perf-hotfix-patches-2026-08-16.tar.gz`)

`git am` presiel bez konfliktu:

| Patch | Subject | Commit |
|---|---|---|
| `0001-*.patch` | `fix(crm): include agency_id in properties summary select so tenant filter keeps rows` | `0b0543b61` |
| `0002-*.patch` | `fix(crm): thread scoped supabase client into getForecastingData` | `42e4ee276` |
| `0008-*.patch` | `fix(billing): 5s Stripe timeout + shared billing status memo` | `da5c4cd74` |

Ignorovane (uz v #428-#432): `0003`, `0004`, `0005`, `0006`, `0007`, `perf-hotfix-FULL.diff`.

## Co to riesi

1. **4-min dashboard T1** - `/api/billing/plan` spustal az 9 sekvencnych Stripe callov (`getCurrentBillingStatus` x 3, default timeout 80 s + 2 retry -> az **240 s**). Stripe klient ma timeout **5 s** + 1 retry, billing status je memoizovany (TTL 5 s).
2. **Regresia #425** - `PROPERTIES_SELECT_SUMMARY` bez `agency_id` -> `filterRowsByAgency` zahodil vsetky riadky -> properties summary = 0.
3. **Nulovy forecasting** - server-side volania `getForecastingData()` bez scoped klienta siahali na browser singleton bez session.

## Overenie (`apps/crm`)

### `npm run test` (vitest run)

```
Test Files  7 failed | 219 passed | 6 skipped (232)
     Tests  6 failed | 1011 passed | 73 skipped | 6 todo (1096)
  Duration  163.60s
```

**Povolene env-gated zlyhania (`TEST_SUPABASE_*` / local DB) - 4 testy + 1 suite:**

| Subor | Chyba |
|---|---|
| `tests/rls/rls-tenant-isolation.test.ts` | suite: RLS isolation tests require local Supabase or explicit TEST override |
| `tests/rls/enrichment-log-rls.test.ts` | Missing `TEST_SUPABASE_URL` / `TEST_SUPABASE_ANON_KEY` / `TEST_SUPABASE_SERVICE_ROLE_KEY` |
| `tests/rls/realsoft-import-logs-rls.test.ts` | Missing `TEST_SUPABASE_*` |
| `tests/rls/valuation-tenants-rls.test.ts` | Missing `TEST_SUPABASE_*` |
| `src/app/api/valuation/submit/__tests__/route.integration.test.ts` | `TEST_SUPABASE_URL must be local ephemeral DB, got: (empty)` |

**Mimo `TEST_SUPABASE_*` (pre-existujuce na `origin/main`, tento PR tie subory nemeni):**

| Subor | Chyba |
|---|---|
| `src/lib/stealth-recruiter/routes.test.ts` | `POST /scan returns 410 Gone before auth` - Test timed out in 5000ms (import tazkeho scan route) |
| `src/app/api/stealth-recruiter/scan/__tests__/route.test.ts` | rovnaky 5 s timeout na `import()` scan route |

Handler scan route uz vracia 410 pred auth; timeout je na module import (top-level supabase/openai importy). Mimo scope tohto complement PR.

**Nove testy z patchu 0008 (re-run izolovane):**

```
src/lib/__tests__/billing-store.memo.test.ts (4 tests) - 4 passed
```

- Stripe client: timeout 5 s, 1 retry
- tri concurrent calleri zdielaju JEDEN Stripe fetch
- sequential callers v TTL zdielaju memo
- Stripe reject -> fail-open na default (free) plan

### `npm run build`

**PASS.** Next.js 16.2.4 webpack.

- Compiled successfully in 120s
- Generating static pages 277/277 in 12.9s
- `/api/billing/plan` a `/api/forecasting/summary` su v route liste

Pocas collect page data: existujuce `[ERROR] getSupabaseClient Supabase client initialized` logy (ai-scoring) - build nespadol.

## STOP

- Ziadny merge do `main`.
- Production secrets sa neobnovuju.
- L24/L27 migracie sa neaplikuju.
- Stage 1 sa nespusta.
- `memory/` sa nemeni.