---
name: prod-migration
description: >-
  Postup pri migrácii / DDL / zápise do PROD databázy (Supabase): read-only preflight, izolovaný test,
  zápis iba na výslovné GO, dôkaz v transakcii s ROLLBACK, zápis do ledgera. Použi pri každej správe
  o migrácii, DROP/ALTER/CREATE INDEX, ledgeri, `db push` alebo PROD zápise.
---

# prod-migration — PROD zápis iba po preflighte a s dôkazom

Zdroj: blok `MIGRACIA` v `memory/working-agreement.md` (hook ho vkladá pri slove migrácia/DDL/ledger),
skúsenosť z `docs/reports/2026-10-20-prod-migracie-bri-a-source-id.md`. Projekt: Supabase `ypgajkhqtbriqqmyawyv`.

## 1. READ-ONLY preflight (`mcp__Supabase__execute_sql`, iba SELECT)
- identita projektu: počty `agencies`, `leads`, `properties` (je to naozaj PROD, nie kópia),
- stav objektu, ktorý sa mení: `pg_indexes`, `pg_constraint` (je index krytý constraintom? potom `DROP INDEX` nejde),
- `list_migrations` + `supabase_migrations.schema_migrations`: čo ledger už tvrdí,
- pre nový UNIQUE: 0 duplicít (`GROUP BY … HAVING count(*) > 1`).
Výsledok preflightu = tabuľka „zmerané", nikdy odhad.

## 2. Izolovaný test
Lokálny Postgres, nikdy PROD. Ak ho prostredie nedovolí, napíš v reporte len návrh testu — nič si nevymýšľaj.

## 3. Zápis (iba na výslovné GO; `apply_migration` je v settings zakázaný)
- Idempotentné príkazy (`IF NOT EXISTS` / `DROP … IF EXISTS`), jedna transakcia, kde sa dá.
- **`DROP INDEX` cez MCP vyprší** (potvrdzovacia brána sa do session nedostane; overené 3×). Bránu **neobchádzaj**
  (dynamický SQL v `DO` bloku je presne to, čo sa robiť nemá) — daj foundera jednoriadkový príkaz do SQL editora.
- Po každom kroku over stav novým SELECTom v tom istom spojení; tvrdenie foundera („spustil som") ber ako nepotvrdené, kým ho nezmeriaš.

## 4. Dôkaz, že to funguje
Test priamo v PROD **v transakcii s `ROLLBACK`**: pred/po počty riadkov rovnaké, úspešný aj zamietnutý prípad
(napr. dve agentúry s rovnakým `source_id` prejdú, duplicita v rámci jednej agentúry padne na `unique_violation`).

## 5. Ledger
`supabase_migrations.schema_migrations` zapíš **až keď je DDL celé** (ledger nesmie tvrdiť nepravdu).
`supabase migration repair` nie je nutný — píše do tej istej tabuľky ako SQL INSERT.

## 6. Výstup
Jedna správa: preflight → zápis → dôkaz → ledger, potom memory (PREPEND) a `docs/STATUS.md`. Merge až na zelené CI (skill `merge-gate`).
