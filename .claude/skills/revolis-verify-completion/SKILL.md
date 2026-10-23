---
name: revolis-verify-completion
description: >-
  Overenie, že úloha je naozaj hotová: skutočný diff, akceptačné kritériá, vykonané vs preskočené
  vs nespustiteľné kontroly, stavy PASS / FAIL / BLOCKED / NOT_VERIFIED. Použi PRED každým tvrdením
  „hotovo / DONE / opravené" a pred otvorením PR. Nepoužívaj na posúdenie obchodnej hodnoty úlohy.
---

# revolis-verify-completion — „hotovo" iba s dôkazom

Spoločný kontrakt: `docs/architecture/cross-agent-engineering-contract.md`. Nástroj:
`scripts/ci/revolis-verify.mjs`. Dopĺňa (nenahrádza) `kontrolor` (audit výrokov),
`scripts/ci/prepush-gate.sh` (rýchle brány) a `merge-gate` (merge na GO).

## Postup

1. **Akceptačné kritériá.** Zapíš ich ako JSON (`[{ "id": "AC1", "text": "…", "evidence": ["check:related-tests"] }]`).
   Kritérium bez `check:` odkazu je NOT_VERIFIED. Ručné „vyskúšal som" nie je dôkaz.
2. **Spusti:** `node scripts/ci/revolis-verify.mjs completion --base origin/main --scope "apps/crm/src/lib/x/**" --criteria kriteria.json --run`
   Bez `--run` sa nič nevykoná a všetko je NOT_VERIFIED.
3. **Prečítaj správu**, nie len exit kód. Výstup oddeľuje vykonané testy od preskočených.
4. **Opakuj po oprave.** Až `DONE povolené: ÁNO` (exit 0) dovoľuje napísať „hotovo".

## Stavy (nezamieňať)

| Stav | Význam | Smiem napísať „hotovo"? |
|---|---|---|
| PASS | príkaz sa vykonal, vykonal ≥ 1 test, exit 0 | áno, ak PASS sú všetky povinné kontroly aj kritériá |
| FAIL | vykonal sa a zlyhal, alebo zmena je mimo rozsahu | nie |
| BLOCKED | nedalo sa spustiť (chýba nástroj/DB/prístup) | nie, uveď blokátor a vplyv na istotu |
| NOT_VERIFIED | nespustené, 0 testov, alebo chýba dôkaz | nie |

Preskočené testy nie sú PASS a nepočítaj ich ako vykonané. Zelené CI na inom commite nie je dôkaz
pre tento diff. Zelené CI neoprávňuje merge ani deploy.

## Čo sa kontroluje automaticky

- Zmenené súbory podľa `git diff <base>...HEAD` + neuložené zmeny.
- `vitest related` a ESLint na zmenených zdrojoch; kritické toky podľa cesty (billing, inbound, tenant-isolation, auth).
- Migrácia → `supabase db reset`; bez CLI/Dockeru je výsledok BLOCKED, nie PASS.
- Zmenený zdroj bez testu a súbory mimo deklarovaného `--scope` (rozširovanie rozsahu).

## Stavy úlohy

Okrem štyroch stavov kontroly má úloha postupnosť, ktorú nemožno preskočiť:
`PLANNED` → `IN_PROGRESS` → `IMPLEMENTED` → `TESTED` → `REVIEWED` → `PR_READY`
→ `HUMAN_APPROVED` → `MERGED` → `DEPLOYED` → `PRODUCTION_VERIFIED`.

`PR_READY` → `HUMAN_APPROVED` je ľudská hranica. Príkaz `workflow` ani `completion --task`
stavy za `PR_READY` neudeľuje a merge ani deploy nevykoná. Tvrdenie v JSON
(`assertedState`, falošné `checks`, meno aktéra) sa nepočíta: statusy kontrol berie beh.
Samotné tvrdenie agenta nedá `PR_READY`.

```bash
node scripts/ci/revolis-verify.mjs workflow --task task.json --run
```

Exit 0 znamená, že tvrdený stav nie je pred dôkazom. Nie je to povolenie na merge.

## Hranice

Skill nič nemerguje, nenasadzuje, nezapisuje do PROD a nemení tajomstvá. To vyžaduje samostatné
GO foundera (kontrakt, sekcia Autorita). Správu pridaj do popisu PR spolu s presným príkazom,
aby ju recenzent vedel zopakovať.
