# Phase 5 — orchestration gate

## Rozsah

Pridať `scripts/ci/lib/orchestrate.mjs` a CLI `scripts/ci/revolis-orchestrate.mjs`. Povinná kontrola so stavom FAIL blokuje PR readiness. Príkaz nevydá merge ani deploy.

## Znovupoužitie

Poradie brán nadväzuje na `revolis-verify` a spoločný kontrakt. Nový skript nekopíruje cost governor ani vizuálne porovnanie.

## Akceptačné kritériá

- `node --test scripts/ci/__tests__/orchestrate.test.mjs` končí exit 0.
- Povinná kontrola `FAIL` dáva `prReady` false.
- Výsledok má `performsMerge` false a `performsDeploy` false.
- Skok cez stage `validate` sa nedostane do `pr_readiness`.
- Prítomnosť súboru sama nie je `PASS`.

## Riziká

- Moduly z PR 1–4 na tejto vetve z `main` nemusia byť. Chýbajúci modul je NOT_VERIFIED, nie PASS.
- Rovnaký agent nie je nezávislý recenzent.

## Brány

- Post-release sa nespúšťa. Merge a deploy vyžadujú samostatné FOUNDER GO a tento plán ich nevykoná.

## Kroky

1. Pridať stavový beh Intake až PR readiness.
2. Pridať test, že povinný FAIL blokuje a že akcie neobsahujú merge/deploy.
3. Pridať probe, ktorý neoznačí chýbajúci modul ako PASS.
4. Zapnúť test v existujúcom CI kroku helper skriptov.
5. Doplniť krátke použitie do `AGENTS.md` a `CLAUDE.md`.
6. Spustiť `node --test scripts/ci/__tests__/orchestrate.test.mjs`.

## Mimo rozsahu

- Automatický merge, deploy, post-release overenie a zlúčenie ostatných PR.
