---
name: revolis-review-plan
description: >-
  Kontrola plánu PRED kódovaním: rozsah, znovupoužitie existujúceho, závislosti, riziká, merateľné
  akceptačné kritériá a brány foundera; výstupom je najmenší bezpečný plán. Použi pred každou
  implementáciou väčšou než triviálna oprava. Posudzuje formu a bezpečnosť plánu, nie obchodnú
  hodnotu úlohy (tú určuje iba founder).
---

# revolis-review-plan — najmenší bezpečný plán

Spoločný kontrakt: `docs/architecture/cross-agent-engineering-contract.md`. Vstupy do plánu:
`docs/architecture/engineering-constitution.md` (strom znovupoužitia), `docs/architecture/revolis-constitution-v2.md`
(brána rozhodnutia), `docs/architecture/master-data-sourcing-map.md` (zdroje dát). Dopĺňa `kontrolor` (audit hotových
výrokov) a `task-loop` (výber ďalšej úlohy).

## Postup

1. **Prečítaj, nehádaj.** Prejdi relevantný kód a otvorené PR (`git log`, `grep`), než navrhneš nový súbor.
   Poradie: znovupoužiť → natívne API → stdlib → existujúca závislosť → nový kód.
2. **Nájdi chýbajúce a nejasné požiadavky.** Chýba vstup (ID, odkaz, súbor)? Jedna konkrétna otázka, nič nedomýšľaj.
3. **Napíš plán** do súboru s týmito sekciami: `Rozsah`, `Znovupoužitie`, `Akceptačné kritériá`, `Riziká`,
   `Brány`, `Kroky`, `Mimo rozsahu`.
4. **Skontroluj ho nástrojom:** `node scripts/ci/revolis-verify.mjs plan-lint plan.md`
   (exit 0 = plán spĺňa pravidlá; 1 = chyba; chybu oprav pred kódovaním).
5. **Zvoľ najmenší bezpečný rez.** Zmena má byť revertovateľná, jedna logická vec na PR, ≤ 12 krokov.

## Pravidlá, ktoré plan-lint vynucuje

- Všetkých sedem sekcií je prítomných.
- Akceptačné kritériá sú neprázdne a overiteľné (príkaz, cesta, číslo, test). „Funguje správne" nestačí.
- Ak kroky zahŕňajú merge, deploy, migráciu, PROD, tajomstvo, mazanie alebo platbu, sekcia `Brány` musí
  výslovne uviesť **FOUNDER GO**.
- Viac než 12 krokov je varovanie (plán nie je najmenší).

## Bránky, ktoré plán nesmie obísť

Dáta osobné alebo externé → `master-data-sourcing-map.md` a GDPR brána. Nová funkcia → `revolis-constitution-v2.md`
(rozhodnutie BUILD/BACKLOG patrí do `memory/decisions.md`). Nový súbor, abstrakcia alebo závislosť → blok
„Engineering justification". Po implementácii nasleduje `revolis-verify-completion`.
