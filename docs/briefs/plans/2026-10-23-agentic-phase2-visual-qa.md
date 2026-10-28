# Phase 2 — visual QA guard

## Rozsah

Pridať porovnanie RGBA snímok do `scripts/ci/lib/visual-qa.mjs`. Zámerne pokazená testovacia snímka sa musí zachytiť a nesmie ostať v produktovej ceste.

## Znovupoužitie

Playwright smoke v `apps/crm/playwright.config.ts` ostáva. Nový modul nepridáva závislosť a nevolá zákaznícke účty.

## Akceptačné kritériá

- `node --test scripts/ci/__tests__/visual-qa.test.mjs` končí exit 0.
- Regresná snímka nad prahom `0.02` vracia `FAIL` a kód `visual_regression`.
- Tá istá schválená snímka voči sebe vracia `PASS`.
- Chýbajúci prah vracia `BLOCKED`, nie `FAIL` za vkus.

## Riziká

- Ak Chromium nenaštartuje, browserová kontrola je `BLOCKED` a neuvádza sa ako PASS.
- Prah je parameter volajúceho. Modul nemá vlastný vkusový prah.

## Brány

- Žiadny merge, deploy ani produkčný účet. Syntetické pixely a prípadne lokálny HTML fixture.

## Kroky

1. Pridať `compareRgba` bez novej npm závislosti.
2. Pridať test detekcie regresnej snímky a test, že schválený fixture ostáva nezmenený.
3. Ak sa dá spustiť Playwright, porovnať dve syntetické HTML stránky; inak zapísať BLOCKED.
4. Zapnúť unit test v existujúcom kroku CI „Test CI helper scripts“.
5. Spustiť `node --test scripts/ci/__tests__/visual-qa.test.mjs`.

## Mimo rozsahu

- Nové produktové routy, účty zákazníkov, Percy/Chromatic a pád buildu za subjektívny vkus.
