# Independent review: SEO homepage + robots + draft blog

**Diff base:** `origin/main`  
**Reviewer note:** implementátor spustil testy; tento súbor je review artefakt pre verify workflow, nie merge GO.

## Verdikt: PASS na draft PR (nie na merge)

- Rozsah sedí so zadaním: homepage SEO, CRM privacy metadata + robots, draft blog článok.
- Žiadny merge, deploy, Vercel, secrets, PROD DB.
- Homepage title/description/OG sú zadané SK reťazce; hero už neobsahuje „23. 10.“; `data-after` je zhodné s novým title/description, takže JS expire() ich neprepíše späť na deadlinu.
- Článok je `published: false` — nie v sitemap. Keyword, H1, sekcie a CTA sú v teste.
- Tvrdenia o featurách v článku majú kotvy v kóde (acquire email adapter, listing-content, contacts/properties, CSV/XLSX/RealSoft import). Článok netvrdí publikovanie na portál ani text z fotiek.
- `palette.test.ts` mal na `main` zastaranú CTA URL `realitka-ai.vercel.app/register` (v `index.html` už bol `app.revolis.ai`). Úprava je oprava assertu, nie zmena CTA.

## FLAG (nie blokér draftu)

- Na homepage mimo hero ostávajú zmienky o 23. 10. (countdown, sticky, FAQ) — zadanie žiadalo title, meta a hero.
- `/privacy` aj `/privacy-policy` majú rovnaký title (duplicitné URL, existujúci stav).
- CRM `typecheck` hlási pokles baseline 54→53; `--write-baseline` sa nespúšťal.

## STOP podmienky (nespustené)

Merge, LIVE, Vercel settings, publikovanie článku (`published: true`).
