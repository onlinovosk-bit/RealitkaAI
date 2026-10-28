# Phase 3 — API lifecycle guard

## Rozsah

Inventár reálnych providerov z kódu a klasifikácia oznámení: confirmed, unverified, missing source. Neoverené vypnutie nespustí migráciu.

## Znovupoužitie

Čítajú sa existujúce súbory `apps/crm/src/lib/ai/claude.ts`, Google Ads klient a `apps/crm/package.json`. Žiadny druhý registry modelov.

## Akceptačné kritériá

- `node --test scripts/ci/__tests__/api-lifecycle.test.mjs` končí exit 0.
- Oznámenie bez `source_url` má triedu `missing_source` a `autoMigrate` false.
- Oznámenie s URL bez `primary_source` má triedu `unverified_notice` a migrácia nie je povolená.
- Potvrdené oznámenie má `autoMigrate` false, kým chýba výslovné founder povolenie.

## Riziká

- Inventár môže vynechať dynamicky poskladaný model. Medzera sa zapíše, nevymýšľa sa ID.
- Ceny v `llm-usage-cost.ts` nie sú živý cenník a do inventára ako vendor price nepatria.

## Brány

- Žiadna automatická migrácia, žiadny zápis do PROD a žiadna zmena poskytovateľa.

## Kroky

1. Pridať `classifyNotice` a `migrationDecision` do `scripts/ci/lib/api-lifecycle.mjs`.
2. Zostaviť inventár extrakciou z citovaných súborov.
3. Pridať tri testy oznámení a test, že extrahované ID sedí so zdrojovým súborom.
4. Zapnúť test v existujúcom CI kroku helper skriptov.
5. Spustiť `node --test scripts/ci/__tests__/api-lifecycle.test.mjs`.

## Mimo rozsahu

- Výmena modelov v CRM, fetch živých deprecation stránok ako spúšťač migrácie, Onlinovo.sk.
