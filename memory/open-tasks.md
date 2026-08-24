# Open Tasks — Prioritized Queue

> Posledná aktualizácia: 2026-08-24 | Task-loop sync

## P0 — Search workdesk

- [ ] Founder merge #463 — **bez labelu automerge** (Tier 2)
- [ ] `GO SEARCH-PAGING` — paging + `SEARCH-TOPBAR-GLOBAL-VS-LOCAL` (až po merge auditu)

## P0 — Action Center / Pricing (spec only)

- [ ] Merge spec PR (BO-A + BO-B docs) — **žiadny runtime**
- [ ] `GO IMPLEMENT PRICING V2` — neudelené; pred ním Stripe `tax_behavior` + volume discount zámer
- [ ] `GO IMPLEMENT ACTION CENTER V0` — neudelené; nezávislé od pricing

## P0 — Agent OS V0 blocked (baseline)

- [ ] **Push `feat/bridge-harness`** — 9 staged Phase 0 blobs from
      `docs/reports/2026-08-22-agent-os-v0-baseline-manifest.md`; then re-issue
      `GO IMPLEMENT V0`. Evidence:
      `docs/reports/2026-08-22-agent-os-v0-implementation-stop.md`

## P0 — Smolko (zákazník)

- [ ] **Gmail inbound dual-run** — #422 na main; Preview secrets + curl smoke (`docs/runbooks/gmail-pull-setup.md`); draft email v `docs/reports/2026-08-21-smolko-gmail-dual-run-next.md` — GO odoslať?
- [ ] 24–48 h dual-run; forward nevypínať bez GO

## P0 — Branch cleanup (NEEDS-EVIDENCE)

- [ ] **TASK-0003 evidence pack** — full clone, tip SHA N=N, backup refs, full cherry, edge policy
- [ ] Žiadny mass delete bez samostatného founder GO na pack

## P0 — Billing (done on main)

- [x] Merge #451 legacy unknown≠free
- [x] Merge #452 credits expire guard
- [ ] Close superseded #371 / #374 (ak ešte open)
- [ ] A1 remediation — only if `11111111-…` is real customer

## P0 — Dokončiť rozbehnuté (vykonávacie)

- [x] Brief 15 merge (#222 B1 reconcile, #227 K3b/c) — v `main`, CI zelené
- [x] PROD reconcile `?reconcile_processed=1` — updated=5, scanned=13, skipped=8 (párovanie OK)
- [x] **Push `memory/decisions.md`** + task-loop commits — pushnuté `35224b355`
- [x] **PROD cleanup** — audit `784691` smoke probe deleted (SELECT: verify=audit-fix-probe, 0 properties)
- [ ] **Externý cron** — agent: lokálny CRON_SECRET → PROD 401; overiť cron-job.org + Vercel Production secret (každých 5 min)

## P1 — Smolko / hodnota pre klienta

- [ ] **L99 Lead Factory** — founder GO na definíciu C0/C1/C2 (`docs/briefs/l99-lead-factory-initiative.md` §2); merací BO až potom
- [ ] **Smolko SLA otázka** — koľko nových dopytov na ocenenie stíha zavolať do 4 h (draft v premorteme 2026-08-14)

- [ ] **Guardian PROD smoke 5/5** — agent: login blocked (TEST_USER ≠ Smolko); skript `apps/crm/scripts/prod-guardian-smoke-once.mjs` pripravený
- [x] **PR #241** — merged (fixture-only disabled edit CTA)
- [ ] **Lemon Squeezy Share** — fungoval / nefungoval / pending
- [ ] **Tomáš** — dual export Realvia + Revolis? (Smolko live čaká)
- [x] **VALIDATE CLOSED:** Smolko Klienti CSV = duplikát 439 leadov + maklér; Dopyty neexportovateľné — **import nerobiť** (`memory/decisions.md` 2026-06-21)
- [ ] **K3 UI route** — banner/deck pre property (lib hotová, chýba `/app` route) — VALIDATE pred BUILD
- [ ] Realvia re-test od Bereczovej — delete + create/update export

## P2 — Realvia / ops

- [ ] Preskúmať ~8 `realvia_webhook_logs processed=false` (skipped bez property match — delete/unknown?)
- [ ] **Schema Guard** — agent: workflow_dispatch FAIL (secrets chýbajú v GitHub Actions)

## P3 — Product / tech debt (nie teraz ak nie P0/P1)

- [ ] Demo funnel v5 HTML schválenie
- [ ] Dead routes cleanup (po potvrdení)
- [ ] Staršie otvorené PR (#189, #191, #186…) — triage

## BRI — uzavreté rozhodnutie (2026-06-19)

- **Honest pending** pre 439 leadov — žiadny backfill, žiadny enrichment engine na prázdnych poliach
- Detail: `memory/decisions.md`, `docs/audit/bri-diagnostic.md`
