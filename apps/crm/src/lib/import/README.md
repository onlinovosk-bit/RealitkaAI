# `lib/import` — kontakty (Realvia / Smolko)

**Stav na `main`:** jediný produkčný modul je `contacts-import-core.ts`.

## `contacts-import-core.ts`

Čisté funkcie bez I/O — transformácia zdrojových kontaktov (Realvia export shape) na riadky tabuľky `leads`.

| Export | Účel |
|--------|------|
| `buildLeadRows(source, agencyId)` | Hlavná transformácia + dedupe v batchi |
| `normalizePhone(raw)` | Konzervatívna normalizácia SK / medzinárodných čísel |
| `cleanName(v)` | Odfiltruje garbage mená |
| `makeLeadId(dedupKey)` | Deterministické PK pre idempotentný upsert |

**Dedupe:** primárne e-mail (lowercase), sekundárne `PH:{phone}`; druhý riadok v batchi sa ticho preskočí.

**Status nových leadov:** vždy `Nový` (nie `imported`) — aby cron `OPEN_STATUSES` zachytil import.

**Testy:** `__tests__/contacts-import-core.test.ts`

## Súvisiace (mimo tohto priečinka)

- Universal Import wizard: `lib/universal-import/` (viac zdrojových systémov)
- Nehnuteľnosti.sk parser: PR [#186](https://github.com/onlinovosk-bit/RealitkaAI/pull/186) — `lib/universal-import/nehnutelnosti/`
