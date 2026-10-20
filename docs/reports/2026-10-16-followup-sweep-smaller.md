# Bod 6 — menší follow-up sweep po zavretí #853

**ZMERANÉ z GitHubu** (`gh pr view 853`, `gh api` komentáre a review, 2026-10-16):

- PR #853 `feat(cron): bod 6 — follow-up sweep po sebe nechá stopu v cron_runs` je `CLOSED`, `mergedAt: null`. Zavrel ho `onlinovosk-bit` 2026-10-16 05:41 UTC.
- Review komentáre: **0**. Issue komentáre okrem Vercel bota: **0**. V diskusii nie je veta, prečo sa nemerglo.
- CI na head: `Lint, test, build` SUCCESS, `Zmluva kódu` SUCCESS. Červené CI to nebolo.
- Diff: +250 / −2, 3 súbory. Okrem zápisu do `cron_runs` menil HTTP kód cez `cronHttpStatus`, pri 401 s cron hlavičkou volal `recordUnauthorizedCronRun` a v `capability-truth-matrix.md` tvrdil, že sweep „odteraz zapisuje“ (ešte pred mergom) plus vetu o 522 z 523 leadov.

Číslo 522/523 je citát tela #853, **nie** nový dotaz v tomto behu. PROD som znova nečítal.

## Čo je v menšej verzii

Sweep po autorizovanom behu zapíše `cron_runs` na troch cestách: chyba dotazu (`failed`, HTTP 500 ako doteraz), nula kandidátov (`empty`, HTTP 200), dokončený beh (`deriveCronStatus`, HTTP 200). Odpoveď má navyše `scanned` a `run_log_error`.

Nie je tu zápis pri 401, zmena stavového kódu úspešnej odpovede, ani úprava matice schopností. Návrhy sa naďalej neodosielajú.
