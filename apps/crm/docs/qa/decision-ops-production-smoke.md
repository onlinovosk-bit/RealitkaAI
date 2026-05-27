# QA: AI Decision Ops — production smoke

Panel **AI Decision Ops** na `/dashboard` (`L99DecisionOpsPanel`) volá 5 POST endpointov. Pri vypnutých feature flagoch vracia API **403** s `disabled by feature flag`.

## Env (Vercel)

| Env | Tlačidlá |
|-----|----------|
| `DECISION_ENGINE_ENABLED` | 1) Koľko mi prinesie?, 2) Komu volať…, 5) Akcia na dnes |
| `CLOSING_WINDOW_ENABLED` | 3) Kedy inkasujem? |
| `RESCUE_AUTOMATION_ENABLED` | 4) Zastav únik dealu |

Na `VERCEL_ENV=production|preview` sú flagy **zapnuté**, ak env nie je explicitne `false` (`decision-flags.ts`).

## Manuálny smoke (~5 min)

1. Prihlásenie na `https://app.revolis.ai` → `/dashboard`.
2. Vyber príležitosť v dropdowne (aspoň 1 lead priradený profilu).
3. Pre každé tlačidlo: Network → POST → **200** a `"ok": true`.

| UI | Endpoint |
|----|----------|
| 1) Koľko mi prinesie? | `POST /api/ai/decision/score-lead` |
| 2) Komu volať ako prvému? | `POST /api/ai/decision/recompute-queue` |
| 3) Kedy inkasujem? | `POST /api/ai/closing-window/recompute` |
| 4) Zastav únik dealu | `POST /api/ai/rescue/trigger` |
| 5) Akcia na dnes | `POST /api/ai/micro-actions/schedule` |

**Regresia flagov:** HTTP **403** + `error` obsahuje `disabled by feature flag`.

**Iné chyby:** 401 (session), 404 (profil/lead), 400 (chýba leadId).

## Automatizácia (L99)

- **PR A:** `decision-flags.ts` + Vitest `decision-flags.test.ts`
- **PR B:** Playwright — `request.post` na 5 endpointov s `storageState` z `tests/auth.setup.ts`
- **Syntetika:** `GET /api/healthz` — Decision Ops bez session vždy 401 (nepoužívať ako alarm)

## Kill-switch (Preview)

Nastav `DECISION_ENGINE_ENABLED=false` → tlačidlá 1/2/5 musia vrátiť 403. Po teste env odstráň.
