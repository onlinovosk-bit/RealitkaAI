# Nočná vlna 2.→3. 9. 2026 — orchestrátor report

**Gate:** `origin/main` = `bcf7fcb` (#496) ✓  
**Kill order respektovaný:** L4 → L3 → L2 → L1 priority (L1 dobehol; L2 STOP)

## Tabuľka lane → PR

| Lane | Vetva | PR | Stav | Čaká na foundera |
|---|---|---|---|---|
| **L1** P0 register | `fix/register-creates-own-agency` | [#499](https://github.com/onlinovosk-bit/RealitkaAI/pull/499) | PR open — **fail-closed** (Smolko dvere zatvorené); agency bootstrap **nenamontovaný** | **Merge #499 ako prvé.** Potom GO na service_role tenant bootstrap (RLS nemá agencies INSERT). |
| **L2** strážca zákazníkov | — | — | **STOP** | Chýba `task-strazca-zakaznikov.md` (nerekonštruované). Pošli súbor + GO. |
| **L3** Architecture Guardian audit | `docs/architecture-guardian-audit` | [#500](https://github.com/onlinovosk-bit/RealitkaAI/pull/500) | PR open — read-only | Review; A1 = docs + PR ratchet, nie app modul; „2/3" overstated. |
| **L4** public preview audit | `docs/public-preview-audit` | [#501](https://github.com/onlinovosk-bit/RealitkaAI/pull/501) | PR open — read-only | Rozhodni o 11× `preview-*.html` (CRITICAL: homepage + demo-page / James Thornton L602). |

## Poradie ranného review

1. **L1 #499** — merguj prvé (zatvára P0 dvere). Ak chceš plnú registráciu → GO na bootstrap PR.
2. L4 #501 — rozhodnutie o preview HTML
3. L3 #500 — info only
4. L2 — až so zadaním strážcu

## L1 — čo je / nie je

- Preč: `DEFAULT_AGENCY_ID` / `DEFAULT_TEAM_ID` / globálny `owner|agent` count
- Nové: fail-closed error namiesto zápisu do Smolko tenantu
- Nenamontované: service_role založenie agentúry (bezpečnostná hranica, chce GO)

## L2 blocker

`Test-Path Downloads/task-strazca-zakaznikov.md` = false. Nájdené len `overnight-brief-guardian-v1.md` (iný produkt) a n8n JSON.

## Notebook

Vypnutie naplánované na **02:30** (`shutdown /s /t`). Zrušenie: `shutdown /a`.

## STOP

Žiadny merge agentom. Žiadny zásah do PROD DB. Žiadny zápis do `memory/` z lanes (tento report = orchestrátor výnimka podľa plánu).
