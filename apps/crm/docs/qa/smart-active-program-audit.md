# Smart Start & Active Force — audit funkčnosti (Ruflo + L99 QA)

| Program | Billing tier | `account_tier` | Program ID | Cena |
|---------|--------------|----------------|------------|------|
| **Smart Start** | starter | `starter` / `free` demo | `smart` | 49 €/mes |
| **Active Force** | Radar makléra | `pro` / `active_force` | `radar` | 99 €/mes |

## Ruflo orchestrácia

| Krok | Nástroj | Výsledok |
|------|---------|----------|
| Workflow | `guidance_workflow` testing | tester + coder |
| Route | `hooks_coverage-route` | skip (bez gap indexu) |

## Vitest

```bash
cd apps/crm
npm run test -- --run src/lib/__tests__/smart-active-program-features.test.ts
```

Súbor: `src/lib/__tests__/smart-active-program-features.test.ts`

### Smart Start overuje

- Program `smart` na tier `starter`
- Capabilities: dashboard, leads, AI tasks — **nie** forecast / market intel
- Menu `agent_solo`: `/dashboard`, `/leads`, `/tasks`, `/properties`, …
- `/contacts` → redirect na `/leads`
- Marketing matrix → filesystem kotvy

### Active Force overuje

- Program `radar` na tier `pro` + dedičnosť `smart`
- `canViewForecast`, `canViewClosingWindow` zapnuté
- Guardian / Market Intel zamknuté
- Rozšírené menu `agent_team` (tímový pipeline, shared contacts)
- Forecast modul (`ForecastPageClient` + `canViewForecast`)
- AF-only matrix: Realvia auto import, digitálny štart, analytika

## Agent menu (Smart Start / Active Force)

| Položka | Route | Smart | Active Force |
|---------|-------|-------|--------------|
| Dnes uzavriem | `/dashboard` | áno | áno |
| Pipeline / leady | `/leads` | áno | áno |
| Moji klienti | `/contacts` → `/leads` | áno | áno |
| Úlohy | `/tasks` | áno | áno |
| Výkonnosť | `/performance` → `/dashboard` | redirect | redirect |
| Ponuky | `/properties` | áno | áno |
| Revolis AI | `/revolis-ai` | áno | áno |
| Tímový forecast | `/forecast?scope=team` | — | `agent_team` |

## Manuálny smoke (po deploy PR #64)

**Smart Start (`starter`):**

1. Prihlásenie makléra so `account_tier=starter`
2. `/dashboard`, `/leads`, `/tasks`, `/properties` — dáta pod RLS (nie 0)
3. `/forecast` — paywall / upgrade CTA (bez `canViewForecast`)

**Active Force (`pro`):**

1. `account_tier=pro` alebo `active_force`
2. Všetko ako Smart Start +
3. `/forecast` — plný obsah (nie blur lock)
4. Realvia queue / auto import beží (cron)

## Známe medzery (nie 100 % bez produkcie)

| Feature | Stav |
|---------|------|
| `canViewClosingWindow` | V registry, **bez UI hooku** — doplniť v samostatnom PR |
| `/performance` | Redirect na `/dashboard` — analytika nie je samostatný modul |
| RLS nuly | Fix v PR #64 — vyžaduje merge + deploy |
| Scoring / matching / outreach | Stránky existujú, gating cez `feature-gating` — manuálny smoke |

## Súvisiace audity

- [Market Vision](./market-vision-feature-audit.md)
- [CRM zero data](../incidents/crm-zero-data-audit.md)
