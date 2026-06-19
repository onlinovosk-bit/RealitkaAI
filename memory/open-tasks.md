# Open Tasks — Prioritized Queue

> Posledná aktualizácia: 2026-06-19 | Task-loop sync

## P0 — Dokončiť rozbehnuté (vykonávacie)

- [x] Brief 15 merge (#222 B1 reconcile, #227 K3b/c) — v `main`, CI zelené
- [x] PROD reconcile `?reconcile_processed=1` — updated=5, scanned=13, skipped=8 (párovanie OK)
- [ ] **Push `memory/decisions.md`** commit `8dea0dda1` na `origin/main`
- [ ] **PROD cleanup** — test audit riadok `784691` v `realsoft_import_logs` pred Smolko live
- [ ] **Externý cron** — potvrdiť worker každých 5 min (cron-job.org)

## P1 — Smolko / hodnota pre klienta

- [ ] **Tomáš** — dual export Realvia + Revolis? (Smolko live čaká)
- [ ] **VALIDATE:** Smolko admin export Klientov/Dopyty (CSV) — zdroj kvalifikácie pre BRI (nie backfill)
- [ ] **K3 UI route** — banner/deck pre property (lib hotová, chýba `/app` route) — VALIDATE pred BUILD
- [ ] Realvia re-test od Bereczovej — delete + create/update export

## P2 — Realvia / ops

- [ ] Preskúmať ~8 `realvia_webhook_logs processed=false` (skipped bez property match — delete/unknown?)
- [ ] Schema Guard — nastaviť `SCHEMA_GUARD_*` secrets, re-enable cron

## P3 — Product / tech debt (nie teraz ak nie P0/P1)

- [ ] Demo funnel v5 HTML schválenie
- [ ] Dead routes cleanup (po potvrdení)
- [ ] Staršie otvorené PR (#189, #191, #186…) — triage

## BRI — uzavreté rozhodnutie (2026-06-19)

- **Honest pending** pre 439 leadov — žiadny backfill, žiadny enrichment engine na prázdnych poliach
- Detail: `memory/decisions.md`, `docs/audit/bri-diagnostic.md`
