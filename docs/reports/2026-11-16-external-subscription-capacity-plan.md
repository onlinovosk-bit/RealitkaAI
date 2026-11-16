# External Subscription Capacity — plán

## Rozsah
Rozšíriť AI Control Tower o percentuálne subscription pooly (Grok weekly shared, Claude session, Claude weekly, ďalší z snapshotov). Manuálny zápis len pre `profiles.is_platform_admin === true`. Nová idempotentná migrácia v repe, bez PROD apply.

## Znovupoužitie
Existujúci `usage.ts` (EUR pool, `snapshotConfidence`, prahy 50/70/85/95), tabuľky `ai_quota_pools` / `ai_quota_snapshots`, `requirePlatformAdmin`, `createServiceRoleClient`, RLS deny-by-default. Žiadny druhý Model Gateway, governor ani ledger.

## Akceptačné kritériá
- `node --test packages/model-gateway/tests/subscription-capacity.test.ts` exit 0
- `npm run model-gateway:test` exit 0
- CRM vitest na zmenených testoch exit 0
- `npx tsc -p packages/model-gateway/tsconfig.json --noEmit` exit 0
- CRM eslint zmenených súborov exit 0
- `npm run typecheck` v `apps/crm` (baseline) a `npm run build` v `apps/crm`
- Migrácia obsahuje RLS deny a žiadny GRANT pre anon/authenticated
- PR otvorený, merge/deploy/PROD SQL nie

## Riziká
- UNIQUE `(provider, account_ref)` na pooloch musí prejsť na `(provider, account_ref, quota_window)`
- Percentá sa nesmú prepočítať na EUR
- FOUNDER_EMAILS smie čítať stránku, nesmie zapisovať snapshot

## Brány
- FOUNDER GO na implementáciu: toto zadanie (P0).
- FOUNDER GO na apply migrácie na PROD: **nie v tomto PR**.
- Merge/deploy: **nie v tomto PR**.

## Kroky
1. Doménový modul subscription capacity v model-gateway.
2. Idempotentná migrácia stĺpcov a identity poolu.
3. Load + UI sekcia + admin formulár + POST API.
4. Testy, typecheck, lint, CRM build.
5. Commit, push, PR.

## Mimo rozsahu
Merge, LIVE, produkčná migrácia, platené API, vypínanie agentov, zmena tajomstiev, druhý gateway.
