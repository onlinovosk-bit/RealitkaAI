# Open Tasks — Prioritized Queue

> Posledná aktualizácia: 2026-06-23 | Task-loop sync

## P0 — Dokončiť rozbehnuté (vykonávacie)

- [x] Brief 15 merge (#222 B1 reconcile, #227 K3b/c) — v `main`, CI zelené
- [x] PROD reconcile `?reconcile_processed=1` — updated=5, scanned=13, skipped=8 (párovanie OK)
- [x] **Push `memory/decisions.md`** + task-loop commits — pushnuté `35224b355`
- [x] **PROD cleanup** — audit `784691` smoke probe deleted (SELECT: verify=audit-fix-probe, 0 properties)
- [ ] **Externý cron** — potvrdiť worker každých 5 min (cron-job.org)

## P1 — Smolko / hodnota pre klienta

- [ ] **Guardian PROD smoke 5/5** — bod 4 klik (`/vertical-pack/13303557` → edit slide-over); 1/2/5 manuálne
- [x] **PR #241** — merged (fixture-only disabled edit CTA)
- [ ] **Lemon Squeezy Share** — fungoval / nefungoval / pending
- [ ] **Tomáš** — dual export Realvia + Revolis? (Smolko live čaká)
- [x] **VALIDATE CLOSED:** Smolko Klienti CSV = duplikát 439 leadov + maklér; Dopyty neexportovateľné — **import nerobiť** (`memory/decisions.md` 2026-06-21)
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
