# CRITICAL review: custom XLSX parser + universal-import `/start` (124c1468 / #861)

**Scope:** `xlsx-parse.ts`, `start/route.ts`, `types.ts`, compare `csv-parse.ts`, related portal path in `integrations-store.ts`.  
**Mode:** review only — no fix.  
**Bar:** CRITICAL only (data loss, crashes, security, silent truncation/corruption of contact imports) with concrete trigger.

**Verdikt:** Nájdené **3 CRITICAL** silent-corruption chyby v parseri + **1 CRITICAL** tenant-izolácia na start ceste (learned mappings). ZIP slip na FS, 80 MB budget, shared-string index, session auth na `/start` — bez CRITICAL nálezu.

---

## CRITICAL 1 — Prvý neprázdny riadok = hlavička (title row) → tichá štrukturálna korupcia

**Kde:** `parseXlsxBuffer` — `nonEmpty[0]` je vždy header.

**Trigger:** Hárok s nadpisom v A1 a skutočnými hlavičkami v riadku 2 (bežné Excel/CRM exporty):

| A1: Export kontaktov 2024 | |
| A2: Meno | B2: Mobil |
| A3: Eva | B3: 0901 |

**Reprodukcia (tsx, 2026-10-16):**

```json
{"headers":["Export kontaktov 2024"],"rows":[{"Export kontaktov 2024":"Meno"},{"Export kontaktov 2024":"Eva"}]}
```

Parse **uspeje**. Mobil sa stratí. Riadok „Meno“ sa stane „kontaktom“. `/start` pri `headers.length >= 1` a `rows.length >= 1` job vytvorí — bez chyby o štruktúre.

**Prečo CRITICAL:** silent corruption zákazníckych kontaktov; maklér môže pokračovať v sprievodcovi s jedným zlým stĺpcom.

---

## CRITICAL 2 — Prázdna hlavička bunky → celý dátový stĺpec sa zahodí bez chyby

**Kde:** `rowToColumns` neukladá prázdny text; header pass buduje `headerByIndex` len z neprázdnych buniek; data pass mapuje len cez `headerByIndex`.

**Trigger:** Stĺpec B má telefóny, B1 je prázdne (merged header A1:B1 „Kontakt“ len v A1, alebo vymazaná hlavička):

- A1=`Name`, C1=`Email`
- A2=`Jan`, B2=`0900123456`, C2=`jan@x.sk`

**Reprodukcia:**

```json
{"headers":["Name","Email"],"rows":[{"Name":"Jan","Email":"jan@x.sk"}]}
```

Telefón **nie je** v `headers` ani v `rawData` — nejde opraviť v mapovaní.

**Prečo CRITICAL:** tichá strata phone/email stĺpca pri úspešnom parse; merged headers v Exceli sú časté.

---

## CRITICAL 3 — Duplicitné názvy hlavičiek → last-wins, skôrší stĺpec zmizne

**Kde:** `rows` sa skladajú do `Record<string, string>` — rovnaký kľúč prepíše predchádzajúci.

**Trigger:** Dva stĺpce `Email` (práca / súkromný), hodnoty `a@a.sk` a `b@b.sk`.

**Reprodukcia:**

```json
{"headers":["Email","Email","Name"],"rows":[{"Email":"b@b.sk","Name":"Jan"}]}
```

`headers` tvrdí dva Email stĺpce; `rawData` má len jeden kľúč — `a@a.sk` je nenávratne preč pred UI mapovaním.

**Prečo CRITICAL:** silent drop kontaktného poľa; UI môže ponúknuť dva „Email“ mappingy nad jednou hodnotou.

**Poznámka:** CSV/`Papa` má podobný object-key last-wins; pri XLSX je to rovnaká trieda chyby na novej ceste kontaktov.

---

## CRITICAL 4 — `loadLearnedMappings` bez `agency_id` (start route, service role)

**Kde:** `learned-mappings.ts` volané z `start/route.ts`; `createServiceRoleClient()` + filter len `source_crm`, `order created_at desc`, `limit 1`.

**Trigger:**

1. Agentúra A importuje `xlsx`/`realvia`, potvrdí mapovanie napr. `Mobil → skip`, uloží sa do `migration_cases.learned_mappings`.
2. Agentúra B uploadne súbor s jediným telefónnym stĺpcom `Mobil`.
3. `/start` načíta A-čkové learned mapping (service role obíde RLS), `applyLearnedMappings` nastaví `Mobil → skip` s `confidence: 0.99`.
4. Wizard: `setColumnMapping(data.suggestedMapping ?? {})` — predvyplnené; jeden Confirm → telefóny sa neimportujú.

**Prečo CRITICAL:** cross-tenant ovplyvnenie mapovania kontaktov + vysoká dôvera v UI; nie je to XLSX-špecifické, ale sedí na audite `/start`.

**Auth samotného uploadu:** `resolveImportAuthContext()` (session + `profile.agency_id`) a zápis `agencyId: ctx.agencyId` — bez CRITICAL IDOR na vytvorení jobu v tomto diffе. Ostatné import routes kontrolujú `job.agencyId !== ctx.agencyId`.

---

## Skontrolované — bez CRITICAL

| Oblasť | Výsledok |
|--------|----------|
| ZIP slip / FS path traversal | Extrakcia len do pamäte cez `entries.get(name)`, žiadny zápis na disk. `Target` s `..` bez literálneho ZIP kľúča padá na fallback `sheet1.xml`; literálny kľúč `xl/../evil.xml` ostáva v tom istom ZIP (nie FS). |
| Prototype pollution cez XML tagy | `fast-xml-parser@5.5.x` `sanitizeName` hodí na `__proto__`/`constructor`/`prototype` — DoS parse, nie pollution. |
| Shared strings index | 0-based; OOB → `""` (prázdne, nie posun). Chýbajúci SST pri `t="s"` → prázdne mapy → `/start` 400 „nemá hlavičky“. |
| Sparse cells podľa `@_r` | Fixtures + test: medzery sa neposúvajú doľava. |
| Date serial 1–61 / custom numFmt | Testy + nezávislý výpočet v #861; nie CRITICAL pre bežné kontaktné dátumy. |
| Row/file limity | `MAX_IMPORT_ROWS` / `MAX_IMPORT_FILE_BYTES` s **400/413**, nie silent truncate. |
| Inflated size | `uncompressedSize` check + `inflateRawSync({ maxOutputLength })` + `budget.left`; strop 80 MB drží. Peak RAM (string+DOM) môže byť >80 MB pri limity — nie nesprávne vymáhanie stropu. |
| `integrations-store` portal import | CSV-only cez `parseCsvText`; XLSX parser nepoužíva. |
| ZIP bomb nad 80 MB | Hodí `XlsxParseError` → 400. |

---

## Dôkaz

- Commit: `124c1468` (#861).
- Repro: in-memory ZIP cez `npx tsx` proti `parseXlsxBuffer` (title row, empty header B, duplicate Email, `../` Target).
- Kód: `apps/crm/src/lib/universal-import/xlsx-parse.ts`, `.../start/route.ts`, `.../learned-mappings.ts`, wizard `setColumnMapping(suggestedMapping)`.

## Odporúčanie (bez implementácie v tomto turne)

1. Explicitný výber header row / detekcia title row + chyba ak dátové stĺpce nemajú header.  
2. Unikátne header kľúče (suffix) namiesto object last-wins; varovanie pri prázdnych header bunkách s dátami pod nimi.  
3. `loadLearnedMappings(sourceCrm, agencyId)` + filter `agency_id` (alebo vypnúť cross-tenant learned).

---

## Kontrolór

| Tvrdenie | Tag | Verdikt |
|----------|-----|---------|
| Title/empty/duplicate → silent contact corruption | FAKT (repro JSON) | STOP pred dôverou v XLSX import na PROD bez warningov |
| ZIP FS slip | FAKT (no extract) | PASS |
| 80 MB enforced | FAKT (kód + maxOutputLength) | PASS |
| Cross-tenant learned mappings | FAKT (service role query) | STOP pre tenant izoláciu mapovaní |
| Shared-string off-by-one | PREDPOKLAD vyvrátený testom/OOB→"" | PASS |
