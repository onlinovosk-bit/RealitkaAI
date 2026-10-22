# F2: bezpečný verejný tok formulárov

**Dátum:** 2026-10-20 · **Vetva:** `cursor/f2-safe-public-form-edda` · **Základ:** `main` @ `e89deed4` (#895)

**Merge:** nie. **Deploy:** nie. **Vercel / Supabase:** bez zmeny. **Produkčný endpoint:** nevolaný. **Produkčný zápis:** nie.

## Čo bolo rozbité

`POST /api/demo/capture-lead` po #895 vyžaduje `DEMO_CAPTURE_API_KEY` v hlavičke `x-api-key`. Bez kľúča vráti 401 a nič nezapíše. `HeroEmailCapture` a `AiOdhadca` túto hlavičku z prehliadača neposielali, takže lead z oboch formulárov po nasadení #895 neprejde.

## Tok

1. Formulár pošle `POST /api/demo/public-capture` (JSON, bez tajomstva).
2. Route overí telo cez Zod (`email`, `source` len zo štyroch povolených hodnôt, `gdprConsent: true`). Neplatné telo → 400. Capture-lead ani rate limit sa nevolajú.
3. Neprázdny honeypot `website` (rovnaké pole ako pri registrácii) → `{ ok: true, duplicate: false }` a koniec. Žiadny zápis leadu. Nie je to captcha.
4. `rateLimit` z `apps/crm/src/lib/rate-limit.ts`: 8 požiadaviek / minútu / IP a 3 / hodinu / normalizovaný email. Prekročenie → 429, capture-lead sa nezavolá.
5. Chýba alebo je prázdny `DEMO_CAPTURE_API_KEY` → 503, capture-lead sa nezavolá.
6. Inak sa v tom istom procese zavolá existujúci `POST` z `capture-lead/route.ts` s hlavičkou `x-api-key` z env. Insert, duplikát 23505 a HubSpot ostanú v #895.
7. Metrika `demo_public_capture` sa zvýši len keď upstream vráti 2xx. Počíta sa na `SYSTEM_USAGE_AGENCY_ID`. RPC berie meno metriky ako text, migrácia nie je potrebná.

`/api/demo/public-capture` je v `PUBLIC_PATHS` v `proxy.ts`, inak by prehliadač bez session skončil na logine. `/api/demo/capture-lead` tam ostáva: priamy hovor bez kľúča stále dostane 401.

## Čo tu nie je

- Žiadny Turnstile, reCAPTCHA ani iné anti-bot credentials.
- Rate limit **nie je tvrdý strop**, keď chýba service role alebo RPC `rate_limit_increment` vráti chybu: `rate-limit.ts` vtedy vráti `allowed: true` (fail-open). Rovnaké správanie majú concierge, inbound a registrácia. Helper som nemenil.
- `x-forwarded-for` je prvý hop. Ak ho platforma neprepíše, klient si IP podvrhne.
- Honeypot zje odoslanie, ak správca hesiel vyplní pole `website`.

## Overenie v tomto turne

Spustené v `apps/crm` (vitest 4.1.4, Next 16.2.4):

| kontrola | výsledok |
|---|---|
| `vitest run` public-capture, capture-lead, HeroEmailCapture, AiOdhadca, leads-demo-source-check | 5 súborov, 32 testov, pass |
| `npm run lint` | pass (exit 0) |
| `npm run typecheck` | pass, 54 chýb = baseline 54, žiadna nová |
| `node apps/crm/scripts/check-api-contract.mjs --ci` | NOVÉ porušenia: 0 |
| `npm run build` (`next build --webpack`) | pass, route `/api/demo/public-capture` je v zozname |

Nespustené: Playwright smoke (`npm run test:smoke`), celý `vitest run`, RLS audit, curl na produkciu.

`next build` pri statickom generovaní vypísal existujúce hlášky `permission denied for table activities` a `missing profile agency_id`. Tento PR ich neopravuje. Capture endpoint sa počas buildu nevolal.

Ratchet hlási 2 položky „opravené od baseline“ (`events` validate, `properties` response). Sú na `main` pred touto zmenou. Baseline som neprepisoval.

## Mimo rozsahu

Route `capture-lead` je bez zmeny. Žiadny revert #895. Žiadna oprava `activities` ani `agency_id`.
