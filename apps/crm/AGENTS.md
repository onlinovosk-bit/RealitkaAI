# Revolis CRM — agent context

Monorepo root pre CRM app: tento adresár (`apps/crm`).

## Pred implementáciou

1. Build Order v `docs/briefs/BO-*.md` — bez BO žiadny kód.
2. Integration Report (reuse komponenty, API, tabuľky) — pozri `.cursor/rules/revolis-builder.mdc`.
3. Plan Mode: BO vlož do Plan Mode (Shift+Tab), plán ulož do `docs/briefs/plans/`.

## Testy (povinné v PR)

| Typ | Kedy | Príkaz |
|-----|------|--------|
| Unit/RLS | každý PR | `npm test` |
| Verification (živá špec) | zmena flagu/featury | `npx vitest run tests/verification/<súbor>.verification.test.ts` |
| Playwright smoke | route/API smoke | `npm run test:smoke` |
| Preview smoke | po Vercel Preview deploy | `npm run test:smoke:preview` |
| CI smoke | automaticky | `saas-grade-pipeline.yml` po build |

## Kľúčové cesty

- API: `src/app/api/` (~205 routes)
- UI reuse: `src/components/`, `src/app/(marketing)/landing/sections/`
- DB: `supabase/migrations/`, `public-schema-allowlist.json`
- Verification index: `docs/briefs/verification-index.md`
