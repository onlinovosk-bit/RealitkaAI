# Independent review: rolling Friday deadline (PR #950 follow-up)

**Diff base:** `origin/main`  
**Reviewer note:** implementátor spustil marketing vitest + tsc; tento súbor je review artefakt pre verify workflow, nie merge GO.

## Verdikt: PASS na draft PR (nie na merge)

- Hardcoded `23. 10.` a `2026-10-23` sú z `apps/marketing/public/index.html` preč (grep v marketing zdroji; ostáva len názov testu).
- Countdown, sticky a FAQ používajú `.js-friday-label` s fallbackom `do piatka`; dátum sa dopĺňa na klientovi z `fridayDeadline()` (`/friday-deadline.js`), takže statický HTML neukáže zlý dátum.
- Ponukový text (0 € / 49 €, asistovaný prechod) ostal; zmenil sa len dátum. Žiadne `\bpilot\b` v zmenených zdrojoch.
- `expire()` a fixný `DEADLINE` sú preč — rolling piatok sa neschová po jednom termíne.
- Jedna čistá funkcia: `fridayDeadline` v `lib/friday-deadline.ts` (testy) a zhodný ESM v `public/friday-deadline.js` (HTML). Vitest porovnáva výstupy.
- Hranice: pondelok, piatok 23:59 (tento piatok), sobota 00:00 (ďalší), nedeľa, DST týždeň 2026-10-25 (CEST→CET) + jarný prechod. `npx vitest run` apps/marketing **82/82**; `npx tsc --noEmit` exit 0.

## FLAG (nie blokér draftu)

- Dve kópie algoritmu (TS + public JS) — drift drží equality test, nie jeden súbor.
- `apps/marketing/vercel.json` má `git.deploymentEnabled.cursor/*: false`. Marketing preview URL pre túto vetvu nevznikne, kým sa to nezmení (Vercel settings; mimo rozsahu, žiadny deploy).
- `data-after` na expire copy ostáva v HTML, ale JS ho už neaplikuje.

## STOP podmienky (nespustené)

Merge, LIVE, zmena `vercel.json` deploymentEnabled, publikovanie blogu.
