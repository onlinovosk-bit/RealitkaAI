# CURSOR ZADANIE — Vlna 2: zastaviť falošné zlyhania CI

**Cieľová cesta:** `docs/prompts/pr-ci-vlna2.md`
**Riziko:** LOW — CI-only, žiadny produkčný dopad, nedotýka sa aplikačného kódu
**Rozsah:** 2 PR, môžu ísť paralelne (menia rôzne súbory)
**Nočný beh: ÁNO** — toto je jediná dnešná práca, ktorá sa smie spustiť bez teba pri klávesnici

---

## Prečo to robíme teraz

Zo 4 posledných zlyhaní CI bolo 44 % z jednej príčiny: **generovaný brain index sa
commituje a potom sa porovnáva.** Každé takéto zlyhanie ťa stojí pozornosť a učí ťa
ignorovať červenú — čo je horšie než samotné zlyhanie. Druhý workflow volá skript,
ktorý neexistuje, takže zlyháva vždy.

Kým je CI nespoľahlivé, nemáš ako overiť valuačné PR. Toto je preto **predpoklad
Vlny 3, nie vedľajšia úloha.**

---

## PR-C1 — brain index drift

```
KONTEXT
Repo RealitkaAI, monorepo. Overené cesty: docs/architecture/repo-inventory-2026-08-05.md

PROBLÉM
.github/workflows/memory-engine-report.yml zlyháva s "brain index drift".
Inventarizácia POTVRDILA, že brain:ingest je deterministický — používa git commit
dates a stableJson. Drift teda NEVZNIKÁ z nedeterminizmu ingestu, ale z toho, že
merge checkout v CI nemá plnú históriu, takže git commit dates vyjdú inak.
Komentár priamo v memory-engine-report.yml:19-20 to naznačuje.

NEROB TO, ČO SA PONÚKA
Neprepisuj brain:ingest, aby bol "viac deterministický" — už je.
A hlavne: NEZNIŽUJ prísnosť kontroly a NEPREPISUJ baseline, aby prešla.
To je obídenie brány, nie oprava. Ak sa ti zdá, že jediná cesta je vypnúť
kontrolu, NAPÍŠ MI TO namiesto toho, aby si to urobil.

NAJPRV ZISTI (napíš mi, kým začneš)
1. Aký checkout používa memory-engine-report.yml — je tam actions/checkout
   s fetch-depth? Aká hodnota?
2. Porovnáva workflow commitnutý index s regenerovaným, alebo generuje nanovo?
3. Používa brain:ingest git commit dates aj vtedy, keď história nie je úplná —
   čo vráti pri shallow clone?

ÚLOHA (v tomto poradí preferencie)
A) Ak je príčina shallow clone: doplň fetch-depth: 0 do checkout kroku.
   Jednoriadková zmena, najmenšia možná.
B) Ak to nestačí: workflow nech index REGENERUJE a použije, namiesto toho,
   aby porovnával commitnutý s vygenerovaným. Generovaný artefakt nepatrí
   do porovnania proti commitnutej verzii.
C) Ak ani jedno nesedí s tým, čo v repe vidíš: napíš mi diagnózu a NEROB nič.

TEST
Workflow prejde na PR vytvorenom z aktuálneho main a prejde aj na PR, ktorý
sa merguje po tom, čo do main pribudol iný commit. Druhý prípad je ten,
ktorý dnes zlyháva — bez neho oprava nie je overená.

ROLLBACK
git revert, iba workflow súbor.
```

---

## PR-C2 — chýbajúci smoke skript

```
PROBLÉM
.github/workflows/preview-playwright-smoke.yml:38 volá
  npm run test:smoke:preview
Tento skript v apps/crm/package.json NEEXISTUJE. Workflow teda zlyháva vždy.

NAJPRV ZISTI
1. Existuje v repe Playwright smoke test, ktorý ten skript mal spúšťať?
   Kde? Aké skripty s Playwrightom v apps/crm/package.json sú?
2. Bol ten skript niekedy v histórii? (git log -p apps/crm/package.json)

ÚLOHA — vyber podľa nálezu, nie naslepo
A) Ak smoke test existuje: doplň do apps/crm/package.json skript
   test:smoke:preview, ktorý ho spúšťa. Playwright browser NEINŠTALUJ
   nanovo v postinstalle.
B) Ak smoke test NEEXISTUJE: workflow nesmie tvrdiť, že testuje niečo,
   čo neexistuje. Buď ho vypni s komentárom a odkazom na tento PR,
   alebo doplň minimálny smoke test (načíta / a /odhad/demo, čaká 200).
   Napíš mi, ktorú cestu si zvolil a prečo.

NEROB
- Žiadna nová npm závislosť.
- Nemeň iné workflowy.
- Nemeň aplikačný kód.

TEST
Workflow prejde. Ak si zvolil variant B s vypnutím, PR description musí
explicitne povedať "tento workflow nič netestuje, kým nepribudne smoke test".

ROLLBACK
git revert.
```

---

## Poradie a paralelizmus

**C1 a C2 sú disjunktné** — C1 mení `memory-engine-report.yml`, C2 mení
`preview-playwright-smoke.yml` alebo `apps/crm/package.json`. Žiadny spoločný
súbor, žiadna dátová závislosť, žiadna migrácia. **Smú bežať paralelne, aj v noci.**

Toto je zároveň jediná trojica dnešných PR, kde dôkaz neprekrytia existuje.
Valuačné PR (Vlna 3) a PR-1 Memory Engine bežia sekvenčne s tebou pri klávesnici.
