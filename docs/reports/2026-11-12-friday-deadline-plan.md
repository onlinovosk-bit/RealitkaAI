# Plán: rolling Friday deadline na homepage

## Rozsah
Na vetve PR #950 (ostáva Draft) nahradiť každý hardcoded dátum `23. 10.` v countdown, sticky, FAQ a JS deadlinu na `apps/marketing/public/index.html` vypočítaným piatkom: koniec dňa 23:59:59 Europe/Bratislava. Po–pia = piatok tohto týždňa; so–ne = piatok budúceho týždňa. Zobrazenie `do piatka 13. 11.` (deň. mesiac. bez roku). Ponukový text (0 € / 49 €) sa nemení, mení sa len dátum. Žiadne slovo pilot.

## Znovupoužitie
Jedna čistá funkcia v `apps/marketing/lib/friday-deadline.ts`, testy vo vitest (`__tests__/friday-deadline.test.ts`). Statický `index.html` načíta rovnakú logiku z `public/friday-deadline.js` (ESM re-export / identická implementácia v jednom module, ktorý testy importujú). Existujúci countdown IIFE ostáva, len namiesto `new Date("2026-10-23…")` volá funkciu na klientovi.

Engineering justification: Trigger: dátum v kampani. Path: new-code (čistá TZ funkcia) + reuse (existujúci countdown v `index.html`). Alternatives: Temporal (nie všade v browsery), server dátum v HTML (hydration/stale). Contradiction: none.

## Akceptačné kritériá
- `npx vitest run __tests__/friday-deadline.test.ts` v `apps/marketing` exit 0; case: pondelok, piatok 23:59 (tento piatok), sobota 00:00 (ďalší piatok), nedeľa, týždeň so zmenou DST.
- `public/index.html` neobsahuje `23. 10.`; odkazuje na `friday-deadline.js`; countdown/sticky/FAQ majú `js-friday-label`.
- `npx vitest run` apps/marketing exit 0; `npx tsc --noEmit` exit 0.
- Žiadny výskyt `\bpilot\b` v zmenených súboroch.

## Riziká
- Preview `cursor/*` je v `apps/marketing/vercel.json` vypnutý — marketing preview URL nemusí existovať; nemením Vercel settings.
- `Intl` + offset iterácia pri DST; pokryté testom na jarný/jesenný prechod 2026.
- Statický HTML: dátum sa doplní až na klientovi (fallback „do piatka“).

## Brány
- Draft PR, žiadny merge/deploy. Founder GO na merge ostáva mimo rozsahu.

## Kroky
1. Funkcia `fridayDeadline(now)` + unit testy.
2. `public/friday-deadline.js` ako jediný runtime pre HTML; TS re-export.
3. `index.html`: dátumy → `.js-friday-label`, countdown bez fixného DEADLINE/expire.
4. Upraviť `index-html.test.ts`; spustiť vitest + tsc; push na #950.

## Mimo rozsahu
- Merge, LIVE, zmena `vercel.json` deploymentEnabled, zmena cenníka/ponuky, React landing `LandingPage.tsx`.
