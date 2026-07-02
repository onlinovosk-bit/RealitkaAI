# Production flags checklist (TRACK-F)

**Ruflo task:** `task-1779429743750-ey56j4`  
**Scope:** Decision-engine env flags + `saas-ops` dev overrides pred produkčným rolloutom Phase 5 license gating.  
**Repo path:** `apps/crm/docs/PROD-FLAGS-CHECKLIST.md`

---

## Executive summary

| Flag / override | Odporúčanie | Dôvod |
|-----------------|-------------|-------|
| `DECISION_ENGINE_ENABLED=true` | **Zapnúť ihneď** | Read-only queue endpoint; najhorší scenár = prázdny queue alebo 403 bez flagu |
| `canUseFullApp = true` v `saas-ops.ts` | **NECHAŤ zatiaľ** | Odstránenie predčasné — blokuje validáciu TRACK-D/E |
| `getFeatureFlagsForPlan()` dev override | **NECHAŤ zatiaľ** | Vracia všetko `true` pre každý plán vrátane `free` — Phase 5 gating sa inak nikdy neprejaví |

**Povinné poradie pred odstránením overrideov:**

1. TRACK-D + TRACK-E merge (`/forecast`, `/team` license gating)
2. Smolko billing fix v DB (správny Stripe plan / agency)
3. Samostatný PR na odstránenie `canUseFullApp` + plan-based `getFeatureFlagsForPlan`

---

## 1. `DECISION_ENGINE_ENABLED`

### Kde nastaviť

Vercel → Project **realitka-ai** (hostí `app.revolis.ai`) → Settings → Environment Variables → **Production** (a voliteľne Preview):

```
DECISION_ENGINE_ENABLED=true
```

Po zmene env spusti **Redeploy** Production (alebo počkaj na ďalší deploy z `main`).

### Ako to funguje v kóde

Súbor: `apps/crm/src/lib/ai/decision-flags.ts`

- Na **production/preview** (`VERCEL_ENV`) sú decision flagy **default ON**, pokiaľ env nie je explicitne `false` (kill-switch).
- Explicitné `DECISION_ENGINE_ENABLED=true` je stále odporúčané — dokumentuje intent a chráni pred náhodným `false`.

### Čo to odomkne

| Route | Metóda | Gate |
|-------|--------|------|
| `/api/ai/decision/recompute-queue` | POST | `decisionEngineEnabled` |
| `/api/ai/decision/score-lead` | POST | `decisionEngineEnabled` |
| `/api/ai/micro-actions/schedule` | POST | `decisionEngineEnabled` |
| `/api/ai/closing-window/recompute` | POST | `closingWindowEnabled` |
| `/api/ai/rescue/trigger` | POST | `rescueAutomationEnabled` |

UI: `L99DecisionOpsPanel`, lead detail (`/leads/[id]`) — akcie „Komu volať ako prvému?“ volajú `recompute-queue`.

### `recompute-queue` správanie

Súbor: `apps/crm/src/app/api/ai/decision/recompute-queue/route.ts`

- Vyžaduje auth (401 bez session).
- Bez flagu: **403** `{ ok: false, error: "Decision engine disabled by feature flag." }`.
- S flagom: načíta leady priradené aktuálnemu profilu, zoradí podľa `bri_score`/`score` a `expectedRevenue`.
- **Read-only** — nič nezapisuje do DB. Najhorší scenár = prázdny `queue` alebo chyba SELECT.

### Overenie po deployi

```bash
# 1) Prihlásený session cookie — očakávaj 200 + { ok: true, queue: [...] }
curl -sS -X POST "https://app.revolis.ai/api/ai/decision/recompute-queue" \
  -H "Cookie: <session>" \
  -H "Content-Type: application/json"

# 2) Bez session — očakávaj 401
curl -sS -o /dev/null -w "%{http_code}" -X POST \
  "https://app.revolis.ai/api/ai/decision/recompute-queue"
```

V UI: Dashboard → L99 Decision Ops → „2) Komu volať ako prvému?“ — nemá vrátiť 403 toast.

### Smoke log (2026-06-07, unauthenticated)

```text
POST https://app.revolis.ai/api/ai/decision/recompute-queue
→ {"ok":false,"error":"Unauthorized"} HTTP 401
```

401 bez session je **očakávané** — endpoint nie je verejný. Ďalší krok: Vercel `DECISION_ENGINE_ENABLED=true` + retest s prihlásenou session (očakávaj 200 alebo 403 ak flag off).

---

## 2. `canUseFullApp` dev override

### Kde je

Súbor: `apps/crm/src/lib/saas-ops.ts` (riadky ~286–287)

```typescript
// DEV OVERRIDE: Always allow full app access for development/testing
const canUseFullApp = true;
```

### Prečo je problém

- `canUseFullApp` obchádza license/trial gating v UI (settings, feature cards).
- Súvisiaci override v `getFeatureFlagsForPlan()` (riadky ~66–79) vracia **všetky** feature flagy ako `true` pre **každý** plán vrátane `free`.
- **Dôsledok:** TRACK-D (`/forecast`) a TRACK-E (`/team`) PremiumLockedOverlay sa v produkcii **nikdy reálne neprejaví**, kým tieto overridey existujú.

### Odporúčanie: NECHAŤ (zatiaľ)

Odstránenie až po:

1. Merge TRACK-D + TRACK-E
2. Smolko billing fix v DB (správny plan mapping cez Stripe `priceId`)
3. Samostatný PR: nahradiť `canUseFullApp = true` logikou z `trialGrace.state` + plan-based flags

### Bezpečné odstránenie (budúci PR)

```typescript
// Cieľový stav (nie teraz):
const canUseFullApp =
  trialGrace.state === "active" ||
  trialGrace.state === "trial" ||
  trialGrace.state === "grace";
```

A `getFeatureFlagsForPlan(plan)` musí vracať reálne limity podľa `PlanKey`, nie hardcoded `true`.

---

## 3. Smoke checklist po zapnutí flagov

- [ ] `npm run build` v `apps/crm` — zelený
- [ ] `tests/smoke.spec.ts` (ak dostupné v CI) — zelený
- [ ] `POST /api/ai/decision/recompute-queue` — 200 s auth, nie 403
- [ ] Lead detail → Decision akcie — fungujú bez „disabled by feature flag“
- [ ] `/forecast` a `/team` — **ešte neočakávaj** lock overlay (override stále aktívny)

---

## 4. Rollback

### Decision engine

1. Vercel → `DECISION_ENGINE_ENABLED=false` (explicit kill-switch)
2. Redeploy Production
3. Over: `recompute-queue` vracia 403

### Ak by bol problém po odstránení `canUseFullApp` (budúci PR)

1. Git revert PR ktorý odstránil override
2. Redeploy
3. Overiť Settings → plan card + trial stav pre Smolko test účet

### Kombinovaný rollback poradie

1. Env flag off (`DECISION_ENGINE_ENABLED=false`)
2. Vercel rollback deployment (ak build regresia)
3. Git revert code PR (ak override removal PR)

---

## Súvisiace súbory

| Súbor | Účel |
|-------|------|
| `src/lib/ai/decision-flags.ts` | Env resolution pre decision ops |
| `src/lib/saas-ops.ts` | `canUseFullApp` + `getFeatureFlagsForPlan` overrides |
| `src/app/api/ai/decision/recompute-queue/route.ts` | Prioritizovaná fronta leadov |
| `src/components/dashboard/L99DecisionOpsPanel.tsx` | UI decision akcie |
| `src/config/env.ts` | Zod schema (`DECISION_ENGINE_ENABLED` default `false` lokálne) |

---

## TRACK-F uzavretie

- [x] Checklist vytvorený
- [ ] `DECISION_ENGINE_ENABLED=true` nastavené vo Vercel Production
- [ ] Post-deploy smoke `recompute-queue`
- [ ] Override removal — **odložené** na po TRACK-D/E + billing fix
