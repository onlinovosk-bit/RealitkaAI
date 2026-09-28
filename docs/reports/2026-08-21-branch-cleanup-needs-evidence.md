# Branch cleanup — NEEDS-EVIDENCE (2026-08-21)

## Verdikt

**GO na masové zmazanie ~208 remote vetiev je STIAHNUTÉ.** Stav: **NEEDS-EVIDENCE**.

Most (kontrolór) odmietol delete postavený na 4/208 (~2 %) overení. Founder
výhradu prijal. Cursor má ako zadanie **evidence pack**, nie delete.

Zdroj: bus `MSG-20260821-007` + `TASK-0003` (nadväzuje na inventory
`MSG-20260821-003`).

## Prijaté slabiny predchádzajúceho GO

| Bod | Prečo drží |
|-----|------------|
| Vzorka 4/208 | Nezvratné delete vyžaduje overenie celej množiny; false READY z shallow klonu to dokazuje |
| Shallow analýza | Nikto neoveril, že Cursorov beh nebežal v shallow clone — celý zoznam môže byť skreslený |
| Tip SHA | Detekcia driftu medzi analýzou a delete + obnova |
| Backup refs | `refs/cleanup/2026-08-21/<branch>` → delete je vratné jedným pushom |

## Evidence pack (povinné pred ďalším delete GO)

1. Full clone (`is-shallow-repository=false`) + dôkaz o predchádzajúcom behu.
2. `git rev-parse` tip SHA pre **každého** kandidáta (N = N).
3. Push zálohových refs: `refs/cleanup/2026-08-21/<branch>` (samostatné GO na push refs, ak ešte nie sú).
4. Znova `git cherry` / ancestry na **celej** množine vs aktuálny `origin/main`.
5. Politika: closed-unmerged PR, tagované vetvy, protected, open PR, tip ≠ snapshot SHA.

## Zákaz

Žiadne `git push origin --delete` / GitHub branch delete, kým founder nedá GO
na evidence pack **a** samostatné GO na delete.

## Ďalšia P0 mimo tohto reportu

Smolko: #422 Gmail inbound pull je na `main` — live OAuth + dual-run podľa
`docs/runbooks/gmail-pull-setup.md` (founder secrets / odoslanie).
