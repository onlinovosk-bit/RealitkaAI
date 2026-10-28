# Phase 1 — completion evidence gate

## Rozsah

Rozšíriť `scripts/ci/lib/verify-core.mjs` a `scripts/ci/revolis-verify.mjs` o stavy PLANNED → PRODUCTION_VERIFIED. Tvrdenie agenta samo osebe nesmie overiť nedokončenú prácu.

## Znovupoužitie

Existujúce `evaluateCriteria`, `aggregate`, `scopeCheck` a štyri stavy PASS/FAIL/BLOCKED/NOT_VERIFIED ostávajú. Nový prechod stavov je funkcia v tom istom module.

## Akceptačné kritériá

- `node --test scripts/ci/__tests__/revolis-verify.test.mjs` končí exit 0.
- Test očakáva `assertion_not_evidence`, keď `assertedState` je `PR_READY` a dôkaz chýba.
- Test očakáva `invalid_transition` pre skok `PLANNED` → `TESTED` a pre `PR_READY` → `MERGED`.
- Test so stavom kontroly `FAIL` alebo rozsahom `FAIL` nedosiahne `TESTED`.

## Riziká

- Falošné `actor: founder` v JSON nie je kryptografická identita. Príkaz aj tak nerobí merge ani deploy.
- Bez `--task` sa doterajší exit kód `completion` nemení.

## Brány

- Founder GO na tento PR-only workflow je v zadaní. Merge a deploy nie sú kroky tohto plánu.
- Ľudská hranica začína na `PR_READY` → `HUMAN_APPROVED`.

## Kroky

1. Doplniť stavový stroj a `evaluateWorkflow` do `verify-core.mjs`.
2. Pridať podpríkaz `workflow`, ktorý berie stavy kontrol z behu, nie z JSON tvrdenia.
3. Doplniť testy chýbajúceho dôkazu, zlyhaného testu, rozsahu a neplatného prechodu.
4. Doplniť použitie do existujúceho skillu a `AGENTS.md`.
5. Spustiť `node --test scripts/ci/__tests__/revolis-verify.test.mjs`.

## Mimo rozsahu

- Merge, deploy, PROD, vizuálna brána, lifecycle a zmena limitov cost governor.
