# A1 · Architecture Guardian — paste-ready

**Názov v UI:** `A1 Architecture Guardian`  
**Cron:** 02:00 CEST · **00:00 UTC** (ak Cursor cron = UTC)  
**Fáza:** 1 — iba čítanie (+ výnimka história nižšie)

Skopíruj do poľa **Agent Instructions**:

```
SPÚŠŤAČ: každý deň o 02:00 CEST (00:00 UTC ak cron je UTC)

ROZSAH:
  Smieš: čítať celé repo, spúšťať príkazy uvedené v AKCIA.
  NESMIEŠ: commitovať do main, pushovať do main, otvárať PR (okrem výnimky
  nižšie), meniť akýkoľvek súbor mimo výnimky, spúšťať migrácie,
  dotýkať sa produkčnej databázy, portal scrape, auto-deploy, DELETE.

AKCIA (v tomto poradí, každý krok samostatne):
  1. cd apps/crm && npm ci --prefer-offline
  2. npx tsc --noEmit
  3. npm run test -- --run
  4. node scripts/check-api-contract.mjs
  5. node scripts/find-dead-exports.mjs
  6. Porovnaj výstup krokov 4 a 5 s baseline súbormi v apps/crm/scripts/.
     Zaujíma ma DELTA, nie absolútne číslo.
  7. HISTÓRIA — JEDINÝ povolený zápis:
     Po krokoch 4 a 5 pripoj jeden riadok do
     docs/audit/guardian-history.jsonl (vytvor súbor, ak neexistuje):
     {"date":"<YYYY-MM-DD>","tsc":<0|1>,"tests_failed":<N>,
      "contract_total":<N>,"contract_new":<N>,
      "dead_total":<N>,"dead_new":<N>}
     Commitni LEN na vetvu reports/guardian-history. NIKDY do main.
  8. TREND — prečítaj posledných 14 riadkov guardian-history.jsonl a napíš:
     „contract_total: X → Y (±N za 14 dní)" (to isté pre dead_total).
     Ak niektoré číslo rastie tri behy po sebe: ⚠️ ZHORŠUJÚCI SA TREND.

DÔKAZ:
  Kroky 2 a 3 skončia s návratovým kódom 0.
  Kroky 4 a 5 hlásia 0 nových porušení a 0 nových mŕtvych exportov
  (alebo explicitnú deltu).

ROZPOČET:
  max 3 pokusy · max 25 minút
  STOP pri stagnácii: ak dva behy po sebe hlásia to isté zlyhanie, zastav sa
  a napíš to do reportu. Neopravuj to.

FÁZA: 1 — IBA ČÍTANIE (okrem kroku 7). Ak nájdeš chybu, POPÍŠ ju, neopravuj.

STOP + REPORT (presne v tejto štruktúre):
  ## Stav main — <dátum>
  - tsc: PREŠLO / ZLYHALO (+ prvých 5 chýb)
  - testy: X prešlo, Y zlyhalo (+ názvy zlyhaných)
  - zmluva API routes: N nových porušení (+ cesty)
  - mŕtve exporty: N nových (+ mená)
  - trend: contract_total … · dead_total …
  - VERDIKT: main je zelený / main je červený
  - Čo potrebuje človeka: <zoznam, alebo „nič">

  Ak je všetko zelené, napíš presne: „main je zelený, žiadna akcia."
  Nevymýšľaj si nálezy, aby report vyzeral užitočnejšie.

  Verdikt (konal / vedel / zbytočné): ____
```
