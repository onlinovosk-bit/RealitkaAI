# AI Sales Operating System — Autopilot + Mesačný forecast €

## Cieľ

- **Autopilot:** AI nielen radí, ale **vykoná** kroky (úlohy, aktivity, voliteľne email).
- **Forecast €:** odpoveď na „**koľko € tento mesiac**“ — súčet `hodnota_leadu × pravdepodobnosť(skóre)`.

## Architektúra

```
signály → Sales Brain profil → autopilot-rules → action-executor → aktivity / úlohy / email
leady   → calculateMonthlyMoneyForecast → dashboard + trend snapshot
```

## Súbory

| Súbor | Účel |
|-------|------|
| `src/lib/ai/probability.ts` | `getDealProbability(score)` |
| `src/lib/ai/forecast-money.ts` | `calculateMonthlyMoneyForecast`, `calculateTrend` |
| `src/lib/ai/forecast-snapshot.ts` | Uloženie posledného € pre trend (`.data/monthly-forecast-eur-snapshot.json`) |
| `src/lib/ai/autopilot-rules.ts` | `getAutopilotActions(profile)` |
| `src/lib/ai/action-executor.ts` | `executeAutopilotAction` |
| `src/lib/ai/autopilot-runner.ts` | `runAutopilotForLead(leadId)` |
| `src/app/api/ai/monthly-forecast/route.ts` | GET — JSON pre dashboard |
| `src/app/api/ai/autopilot/run/route.ts` | POST `{ leadId }` — spustenie autopilota |

## Env (exact)

| Premenná | Predvolené | Význam |
|----------|-------------|--------|
| `AUTOPILOT_ENABLED` | zapnuté (ak nie je `0`/`false`) | Master vypínač skutočných zápisov |
| `AUTOPILOT_DRY_RUN` | vypnuté | Ak `1` / `true`, len popis akcie, žiadny DB zápis |
| `AUTOPILOT_SEND_EMAIL` | vypnuté | Ak `1` / `true`, `urgent_followup` môže odoslať AI email (`sendAiOutreachEmail`) |

## Test plan

1. `npm run build` — bez chýb TypeScript.
2. `npx vitest run src/lib/ai/__tests__/sales-ops.test.ts` — unit testy.
3. GET `/api/ai/monthly-forecast` — `ok`, `totalExpectedEur`, `breakdown`.
4. POST `/api/ai/autopilot/run` s `{ "leadId": "<uuid>" }` — prihlásený používateľ; očakávané `results` s `ok: true` (alebo dry-run text).

## Rollback

- Odstrániť API routes a UI blok z dashboardu; nechať knižnice (bez volania).
- Vypnúť `AUTOPILOT_ENABLED=0`.

## Riziká

- **Auto-email** môže naraziť na frekvenčné limity outreachu — nechaj `AUTOPILOT_SEND_EMAIL` vypnuté, kým nie je odsúhlasené.
- **Trend** porovnáva s posledným uloženým snapshotom na serveri (nie kalendárny mesiac).

## Nasadiť a overiť

1. Deploy `apps/crm`.
2. Otvoriť `/dashboard` — sekcia **„AI Sales OS — mesačný odhad (€)“**.
3. Overiť `GET https://<host>/api/ai/monthly-forecast`.
4. (Voliteľne) POST autopilot na test lead po prihlásení.
