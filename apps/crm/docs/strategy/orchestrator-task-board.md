# L99 Orchestrator Task Board

> **Classification:** Internal execution board  
> **Orchestrator:** Chief Principal Orchestrator + Ruflo autopilot  
> **Last verified:** 2026-05-27 (`origin/main` @ `118fa58`, `gh pr list`)

---

## Ruflo session state (2026-05-27)

| Field | Value |
|-------|-------|
| **Autopilot** | ✅ Enabled (`autopilot_enable` idempotent) |
| **Session ID** | `8e749a26-0cae-42cc-8d3e-22b2af832494` |
| **Iterations** | 0 / 50 max |
| **Timeout** | 240 min |
| **Task sources** | `team-tasks`, `swarm-tasks`, `file-checklist` |
| **Board tasks** | 0 completed / 0 total (Ruflo internal counter) |

---

## Master inventory — rozbehnutá práca

| Task | % | Status | PR / evidence | Next action |
|------|---|--------|---------------|-------------|
| **Leads UI 451→0** | 85 % | Merged | [#69](https://github.com/onlinovosk-bit/RealitkaAI/pull/69) merged 2026-05-27 | Prod smoke `/leads` na `app.revolis.ai`; hotfix vetva len ak stále 0 |
| **AI Decision Ops prod** | 100 % | Merged | [#65](https://github.com/onlinovosk-bit/RealitkaAI/pull/65) | Monitor `decision-flags` v prod logoch |
| **P0 reliability (tenant, cron, Realvia backoff)** | 100 % | Merged | [#68](https://github.com/onlinovosk-bit/RealitkaAI/pull/68) | — |
| **Copy + VISIT REAL email + Market Vision audit** | 90 % | In progress | [#73](https://github.com/onlinovosk-bit/RealitkaAI/pull/73) OPEN, CI ✅ | Merge po preview smoke `/porovnanie-programov`; Andrej odošle onboarding email |
| **Stealth Recruiter production** | 85 % | In progress | [#72](https://github.com/onlinovosk-bit/RealitkaAI/pull/72) OPEN, CI ✅ | **Nemergerovať bez explicitného scope**; security + product sign-off |
| **Event Scheduler Phase 1** | 40 % | In progress | [#70](https://github.com/onlinovosk-bit/RealitkaAI/pull/70) OPEN, CI ❌ | Rebase na `main`, opraviť CI; migrácia + `/api/scheduled-events` + 7 unit testov |
| **Realvia replay + agency fail-hard** | 80 % | In progress | [#66](https://github.com/onlinovosk-bit/RealitkaAI/pull/66) OPEN, CI ✅, Vercel ❌ | Rebase + Vercel log triage → merge |
| **Competitive analysis + board (tento PR)** | 95 % | In progress | Vetva `docs/strategy-rene-myport-revolis-task-board` | Merge docs PR; zatvoriť duplicitu [#71](https://github.com/onlinovosk-bit/RealitkaAI/pull/71) ak rovnaký scope |
| **Brand parity web ↔ app** | 10 % | Not started | `PHASE-7-SALES-FUNNEL.md` checklist; žiadny dedikovaný PR | P0: tier matrix + hero sync `apps/marketing` ↔ CRM landing |
| **FinalCTA / tier pricing sync** | 50 % | In progress | `FinalCTA.tsx` + `program-tier-pricing.ts` existujú; parity otvorená | P1 PR: jeden zdroj cien + CTA copy vs `/porovnanie-programov` |
| **Proposal Generator** | 0 % | Not started | SWOT planned | P1 po Event Scheduler UI |
| **Mobile App (native)** | 15 % | Not started | PWA v `layout.tsx`; nie native iOS/Android | P2 roadmap týždeň 4+ |
| **Predictive Analytics** | 25 % | In progress | Architect W1–W4 čiastočne v `main` | P2: dokončiť batch triage + deal health podľa gap doc |
| **Banking integrations** | 0 % | Not started | — | P2 backlog |
| **Web-app content sync audit PRs** | 0 % | Not started | Audit findings nie sú v samostatných PR | P0: vytvoriť tracking PR z Phase 7 checklist |

**Poznámka k %:** Kód na `main` = 100 % merge; otvorené PR = odhad podľa fáz user spec + CI/deploy stavu.

---

## Event Scheduler — user spec vs repo

| Fáza | User spec | Repo (PR #70) | % fázy | Gap / PR |
|------|-----------|---------------|--------|----------|
| 1 DB + backend | `realvia_events` | `scheduled_events` + RLS | ~75 % | Názov tabuľky; overiť `client_phone`, `sms_sent_at` |
| 2 API | `/api/events` | `/api/scheduled-events` | ~70 % | Alias route v follow-up PR; SMS nie v #70 |
| 3 UI | `EventScheduler.tsx` | Chýba | 0 % | Nový PR `feat/event-scheduler-ui` (nie #73) |
| 4 Test + deploy | Unit + E2E + prod | 7 unit testov, CI red | ~30 % | PR po zelenej #70 |

**Odporúčanie:** Canonical = `scheduled_events`. Dokumentovať mapovanie v `event-scheduler-implementation-guide.md`. Nerenamovať tabuľku po merge bez migrácie.

---

## Task board (priorita P0–P3)

| ID | Task | Priority | Status | % | Owner / agent | Dependencies | Next action |
|----|------|----------|--------|---|---------------|--------------|-------------|
| T-01 | Leads UI prod overenie | P0 | Merged / verify | 85 % | Martin + Zuzana | #69 deploy | Smoke `/leads` |
| T-02 | Event Scheduler Phase 1 merge | P0 | In progress | 40 % | Tomáš | #70 CI green | Fix CI, apply migrácia staging |
| T-03 | Brand parity web ↔ app | P0 | Not started | 10 % | Peter + Martin | Phase 7 brief | Audit + 1 PR marketing sync |
| T-04 | Realvia replay merge | P0 | In progress | 80 % | Tomáš + Zuzana | #66 Vercel | Rebase + preview |
| T-05 | Proposal Generator MVP | P1 | Not started | 0 % | Tomáš | Event Scheduler UI | Špec + PR |
| T-06 | FinalCTA + pricing parity | P1 | In progress | 50 % | Martin | #73 copy | Jednotný pricing source |
| T-07 | Copy / VISIT REAL / MV audit | P1 | In progress | 90 % | Martin | — | Merge #73 |
| T-08 | Stealth Recruiter prod | P1 | In progress | 85 % | Tomáš | **Explicit scope** | Review #72, no merge bez OK |
| T-09 | Event Scheduler UI + SMS | P1 | Not started | 0 % | Martin + Tomáš | #70 merged | Nový PR UI |
| T-10 | Mobile App Beta | P2 | Not started | 15 % | Platform | P1 stable | RN/Expo spike |
| T-11 | Predictive Analytics | P2 | In progress | 25 % | Data + Backend | W1 columns | Cron triage hardening |
| T-12 | Banking integrations | P2 | Not started | 0 % | Integrations | Realvia stable | Partner shortlist |
| T-13 | Offline mode | P3 | Not started | 0 % | Mobile | T-10 | Backlog |
| T-14 | eSignature + SMS auth | P3 | Not started | 0 % | Compliance | Legal | Backlog |
| T-15 | Competitive docs na `main` | P0 | In progress | 95 % | Orchestrator | — | Merge tento docs PR |

---

## P0 merge queue

| PR | Title | CI | Vercel | Blocker |
|----|-------|-----|--------|---------|
| [#66](https://github.com/onlinovosk-bit/RealitkaAI/pull/66) | Realvia replay | ✅ | ❌ failed | Vercel deploy |
| [#70](https://github.com/onlinovosk-bit/RealitkaAI/pull/70) | Event Scheduler Phase 1 | ❌ Lint/test/build | Preview partial | Rebase + test fix |
| [#73](https://github.com/onlinovosk-bit/RealitkaAI/pull/73) | Onboarding copy + audit | ✅ | ✅ marketing | Merge po smoke |

**Nepáčiť:** [#72](https://github.com/onlinovosk-bit/RealitkaAI/pull/72) Stealth Recruiter — bez explicitného produktového schválenia.

---

## Agent team — najbližších 7 dní

| Persona | Lane | Owns | Deliverable |
|---------|------|------|-------------|
| **Tomáš Novák** | Backend | #66, #70 CI, Realvia | Green CI, staging migrácia |
| **Martin Kollár** | Frontend | #73, leads smoke, Event UI špec | Merge #73; scaffold EventScheduler |
| **Peter Horváth** | Platform / UX | Brand parity audit, calendar UX | Phase 7 gap list → PR |
| **Zuzana Novotná** | DevOps / QA | Smoke, Vercel #66, merge gates | Signed smoke report |

---

## Top 5 priorít — ďalší sprint

1. **Prod smoke leads** po #69 — potvrdiť, že P0 incident je uzavretý.
2. **Merge #70** (Event Scheduler backend) po zelenej CI + staging migrácii.
3. **Brand parity P0** — `apps/marketing` ↔ CRM landing tier matrix (Phase 7).
4. **Merge #66** Realvia replay po Vercel fix.
5. **Event Scheduler UI PR** — samostatný PR po #70; SMS + calendar entry z lead karty.

---

## Recently merged (kontext)

| PR | Title | Merged |
|----|-------|--------|
| #69 | Browser-first leads | 2026-05-27 |
| #68 | P0 production reliability | 2026-05-27 |
| #65 | AI Decision Ops | 2026-05-27 |

---

*Board owner: L99 Chief Orchestrator. Sync po každom merge; Ruflo `autopilot_progress` pre long-horizon beh.*
