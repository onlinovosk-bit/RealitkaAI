# Smoke Test Report

**Dátum:** 2026-06-05  
**Súbor:** `apps/crm/tests/smoke.spec.ts`  
**Runner:** Playwright (`--project=smoke`)  
**Base URL:** `http://localhost:3000` (dev server + `E2E_BYPASS_AUTH=1` v webServer env)

---

## Výsledok

| Metrika | Hodnota |
|---------|---------|
| **Passed** | 19 |
| **Skipped** | 11 (CRON_SECRET auth acceptance — secret nie je v CI env) |
| **Failed** | 0 |
| **Čas** | ~5 s (workers=1) |

```bash
cd apps/crm && npx playwright test tests/smoke.spec.ts --project=smoke
```

---

## Pokrytie — `engineering_live` (market-vision-capabilities.json)

### Cron endpoints (Vercel + external)

| Endpoint | Bez auth | S CRON_SECRET |
|----------|----------|---------------|
| `GET /api/cron/pulse` | 401 ✓ | skip (no secret) |
| `GET /api/cron/bri-snapshot` | 401 ✓ | skip |
| `GET /api/cron/morning-brief` | 401 ✓ | skip |
| `GET /api/cron/lead-ai-triage` | 401 ✓ | skip |
| `GET /api/cron/follow-up-sweep` | 401 ✓ | skip |
| `GET /api/cron/dashboard-insights` | 401 ✓ | skip |
| `GET /api/cron/arbitrage-scan` | 401 ✓ | skip |
| `GET /api/cron/price-trail-sync` | 401 ✓ | skip |
| `GET /api/cron/realvia-process` | 401 ✓ | skip |

### Deprecated

| Endpoint | Očakávaný status | Výsledok |
|----------|------------------|----------|
| `GET /api/scoring` | 410 + `{ error }` | ✓ |
| `GET /api/segmentation` | 410 + `{ error }` | ✓ (po proxy allowlist pre 410 shim) |
| `GET /api/scrape` | 404 | ✓ |

### Dashboard + API

| Test | Výsledok |
|------|----------|
| Routes `/dashboard`, `/forecast`, `/team`, … | ✓ (nie 404/500; 307 login redirect OK) |
| `GET /api/leads` | ✓ (nie 500) |
| Sidebar / JS errors | skip ak redirect na `/login` |

---

## Zmeny pre zelený run

1. **`playwright.config.ts`** — nový project `smoke` (workers=1, timeout 90s).
2. **`proxy.ts`** — `DEPRECATED_API_SHIMS` pre `/api/segmentation` (inak 401 pred route handlerom).
3. **`smoke.spec.ts`** — engineering_live crony, deprecated 410/404, response shape.

---

## CI odporúčanie

Nastaviť v GitHub Actions / Vercel preview:

```env
CRON_SECRET=<from secrets>
```

Potom odpadne 11 skipped testov pre cron acceptance.

---

## Otvorené

- Cron acceptance testy vyžadujú `CRON_SECRET` v test env.
- Dashboard UI testy vyžadujú auth storage state alebo `E2E_BYPASS_AUTH=1`.
