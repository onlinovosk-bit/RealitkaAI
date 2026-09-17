# 2026-09-15 — North-star measurement loop: LAUNCHED (W0+W1), waiting founder batch

## Verdikt
Balík `2026-09-17-north-star-measurement-loop` nainštalovaný a **LAUNCH_AUTHORIZED** (Founder GO).
Režim **`founder_batch`** — slučka čaká na SQL výsledky.

## Prečo nie readonly_role
`SUPABASE_READONLY_URL` chýba v prostredí; service-role je zakázaný. Template: pri neistote zvoľ B.

## Artefakty
- Package: `docs/overnight/2026-09-17-north-star-measurement-loop/`
- SQL: `scripts/sql/north-star-day.sql`
- Validator: `apps/crm/scripts/north-star-validate.mjs`
- Batch: `output/overnight/2026-09-15T1955-CEST-north-star/control/queries-to-run.sql`
- RUN_ID / BASE_SHA: viď `launch-record.md`

## Ďalší krok (founder)
Spusti `queries-to-run.sql` → ulož `control/results.json` → **GO** na LOOP+W2.
