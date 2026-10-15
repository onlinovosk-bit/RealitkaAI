# Realvia `dump=headers` — cron auth + redakcia proxy hlavičiek

**Stav:** IMPLEMENTED + TESTED (lokálne). CI — prvý beh padol na nesúvisiacom billing golden flake; retrigger. PRODUCTION — nie.
**Vetva:** `cursor/realvia-dump-headers-auth-479b`
**Zdroj:** lokálny commit `7c2ee070d` (nikdy nepushnutý) portovaný na aktuálny `main`.
**RAU route:** `GO_REQUIRED BUILD revolis` — founder zadal port + testy + jeden PR; merge/PROD sa nevykonáva.

## OBJECTIVE

Zavrieť verejný dump hlavičiek na `GET /api/webhooks/realvia?dump=headers`. Diagnostika ostáva, ale len s `Authorization: Bearer <CRON_SECRET>`. Odpoveď nesmie obsahovať auth/proxy tajomstvá.

## WHAT CHANGED

- `hasCronAuthorization` v `apps/crm/src/app/api/webhooks/realvia/route.ts` — `dump=headers` aj `diag=config` používajú ten istý helper.
- `collectRequestHeaders` rediguje navyše `authorization`, `forwarded`, `x-vercel-oidc-token`, `x-vercel-proxy-signature`, `x-vercel-proxy-signature-ts`, `x-vercel-sc-headers` a hlavičky s `signature` / `token`.
- Docs: krízový brief + onboarding curl s placeholderom, nikdy reálnou hodnotou.
- Testy: unit redakcia, route GET, verification kontrakt.

## SECURITY

- Žiadne reálne tajomstvá v kóde, testoch ani docs (iba `<CRON_SECRET>` / `test-cron-secret`).
- Plain GET health check ostáva verejný (`status: ok`).
- Pred merge musí `CRON_SECRET` existovať vo Vercel Production pre projekt `realitka-ai`. Bez neho je dump aj diag fail-closed (401).

## TESTS

Lokálny dôkaz 2026-10-15 (cwd `apps/crm`):

- Vitest 6 files / 29 tests passed (`validate`, `inboundDiagnostics`, route GET, 3 verification).
- `npm run typecheck` — 54 chýb, baseline 54 (exit 0).
- `npm run lint` — exit 0.

CI run `38744496009` (head `376c658e`): Realvia testy PASS vrátane `realvia-dump-headers-auth.verification.test.ts`. Jediný fail: `billing-page-w3.test.tsx` golden (`11318` vs `11623` B) — súbor mimo tohto PR, na `main` po #849 zelený, lokálne 8/8 PASS. Retrigger bez zmeny billing kódu.

## RISKS

- Operátori, ktorí volali `dump=headers` bez headeru, dostanú 401 — to je zámer.
- Ak `CRON_SECRET` v Production chýba, diagnostika je nepoužiteľná až do nastavenia env.

## NEXT ACTION

Founder review PR. Merge len na výslovné `merguj N` po zelenom CI a potvrdení `CRON_SECRET` v Production.
