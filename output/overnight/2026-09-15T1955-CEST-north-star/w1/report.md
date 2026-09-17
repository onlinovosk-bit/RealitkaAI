# W1 — seed (SQL + validator)

## Artefakty

| Súbor | Účel |
|---|---|
| `scripts/sql/north-star-day.sql` | kanonický denný SELECT s `:den` (slučka ho nemení) |
| `apps/crm/scripts/north-star-validate.mjs` | duplicitné/chýbajúce dni |
| `control/queries-to-run.sql` | **founder_batch** — 31 dní naraz |

## Čo urobiť (founder)

1. Otvor Supabase SQL editor (produkcia, **iba SELECT**).
2. Spusti `output/overnight/2026-09-15T1955-CEST-north-star/control/queries-to-run.sql`.
3. Export výsledku ako JSON pole riadkov do:
   `output/overnight/2026-09-15T1955-CEST-north-star/control/results.json`
   Formát:
   ```json
   { "rows": [ { "date": "2026-08-17", "realvia_webhooks": 0, "...": 0 }, ... ] }
   ```
4. Napíš **GO** — agent doplní metrics jsonl + merged_prs atribúciu + W2 PR.

## Poznámka

Agent **nespustil** žiadny SQL proti produkcii. MCP Supabase v tomto prostredí nemá token; readonly URL chýba.
