# L99 Orchestrator Task Board

> **Classification:** Internal execution board  
> **Orchestrator:** Chief Principal Orchestrator + Ruflo autopilot  
> **Last verified:** 2026-05-27 (git `main`, `gh pr list --state open`)

---

## Ruflo autopilot status

| Field | Value |
|-------|-------|
| **Enabled** | ✅ `true` |
| **Session ID** | `8e749a26-0cae-42cc-8d3e-22b2af832494` |
| **Max iterations** | 50 |
| **Timeout** | 240 min |
| **Task sources** | `team-tasks`, `swarm-tasks`, `file-checklist` |

---

## 🔴 CRITICAL

### Leads UI 451 → 0

| Item | Detail |
|------|--------|
| **Symptom** | 451 leads in DB, 0 visible in browser UI |
| **Fix** | PR [#69](https://github.com/onlinovosk-bit/RealitkaAI/pull/69) — browser-first leads |
| **Merge status** | ✅ Merged to `main` @ 2026-05-27T10:35:26Z (`fix/contacts-leads-zero`) |
| **Prod verification** | ⏳ Pending smoke on `app.revolis.ai` |
| **Hotfix fork** | Local branch `fix/contacts-leads-zero-prod` exists — use only if prod still shows 0 after deploy |
| **Owner** | Martin (Frontend) + Zuzana (QA/DevOps smoke) |

---

## P0 merge queue

| PR | Title | CI | Vercel | Blocker | Next action |
|----|-------|-----|--------|---------|-------------|
| [#66](https://github.com/onlinovosk-bit/RealitkaAI/pull/66) | Realvia replay failed queue + missing agency fail | ✅ Green | ❌ Preview failed | Rebase on `main`; Vercel deploy failure | Tomáš rebase → Zuzana inspect Vercel logs → merge when both green |
| [#70](https://github.com/onlinovosk-bit/RealitkaAI/pull/70) | Event Scheduler Phase 1 | ❌ Test fail (`program-brand-names` import) | ✅ Preview (realitka-ai canceled by ignored step) | Unrelated test failure on branch base | Tomáš fix CI or rebase on green `main` → merge after green CI |

**Rule:** Do not merge until CI + Vercel preview are green (L99 golden rule).

---

## Event Scheduler — phase map

| Phase | User spec | Repo / PR #70 | Gap | Recommended PR |
|-------|-----------|---------------|-----|----------------|
| **1 — DB + backend** | `realvia_events` table | `scheduled_events` + migration `20260527143000_event_scheduler_phase1.sql` | Table name + route prefix differ | **#70** (fix CI first) |
| **2 — API** | `POST/GET/PATCH/DELETE /api/events` | `GET/POST /api/scheduled-events`, `GET/PATCH/DELETE /api/scheduled-events/[id]` | Route naming; SMS/calendar hooks not in user spec | **#72** — alias `/api/events` → store OR rename in follow-up |
| **3 — UI** | `EventScheduler.tsx` (calendar, quick schedule, conflicts) | Not in #70 | Full UI missing | **#73** — `feat/event-scheduler-ui` |
| **4 — Tests + deploy** | Unit + E2E + prod smoke | 7 unit tests in #70 only | E2E + smoke missing | **#74** — `feat/event-scheduler-e2e-smoke` |

### Align vs rename (recommendation)

**Recommend:** Keep `scheduled_events` as canonical internal name (tenant-scoped, not Realvia-specific). Add thin `/api/events` alias in PR #72 for API ergonomics. Document mapping in `event-scheduler-implementation-guide.md`. Do **not** rename table post-merge unless migration cost is acceptable — prefer view/alias layer.

User spec fields to verify in #70 schema: `property_id`, `client_phone`, `client_name`, `sms_sent_at`, `confirmation_status` — confirm parity or add columns in #72.

---

## Backlog — priority matrix

| Initiative | Impact | Effort | Priority | Target window | Owner lane |
|------------|--------|--------|----------|---------------|------------|
| **Event Scheduler P1** | High | Low | P0 | Week 1 (May 27–Jun 3) | Backend + Frontend |
| **Proposal Generator** | High | Medium | P1 | Weeks 2–3 | Full-stack |
| **Mobile App Beta** | High | High | P1 | Week 4+ | Platform + Mobile |
| **Predictive Analytics** | High | High | P2 | Jun+ | Data + Backend |
| **eSignature + SMS Auth** | Medium | High | P3 | Backlog | Backend + Compliance |
| **Banking Integrations** | Medium | High | P4 | Backlog | Integrations |
| **Offline Mode** | Low | Low | P3 | Backlog | Mobile |

---

## Agent team — next 7 days (May 27 – Jun 3)

L99 personas mapped to functional lanes:

| Persona | Lane | Owns (next 7 days) | Deliverables |
|---------|------|-------------------|--------------|
| **Tomáš Novák** | Backend / Full-stack | PR #66 rebase + merge; PR #70 CI fix; Event Scheduler API alias (#72 prep) | Green CI on #66/#70; `/api/events` RFC in PR #72 |
| **Martin Kollár** | Frontend | Leads prod smoke (#69); EventScheduler.tsx scaffold (#73); lead-card “Schedule viewing” entry | Prod leads count > 0; UI branch ready for review |
| **Peter Horváth** | Platform / UX | Calendar UX spec; conflict-detection rules; update implementation guide | Spec in `docs/event-scheduler-implementation-guide.md` |
| **Zuzana Novotná** | DevOps / QA | Smoke `tests/smoke.spec.ts` post-#69; Vercel log triage #66; block merge until green | Smoke report; CI gate sign-off |

### Parallel / background

| Workstream | Branch | Notes |
|------------|--------|-------|
| Contacts prod hotfix | `fix/contacts-leads-zero-prod` | Only if #69 deploy insufficient |
| Slate Horizon UI | PRs #15–#23 | Lower priority vs P0; batch after Event Scheduler P1 |
| Realvia integrations page | PR #9 (DRAFT) | Not P0 |

---

## Immediate next 3 actions

| # | Action | Owner | PR / target |
|---|--------|-------|-------------|
| **1** | **Prod smoke: leads visible** — run smoke + manual check `/leads` on production after #69 deploy | Zuzana + Martin | Verify #69; hotfix → `fix/contacts-leads-zero-prod` if needed |
| **2** | **Unblock Event Scheduler Phase 1** — fix CI on #70 (rebase on green `main` or fix `program-brand-names` test import) | Tomáš | PR [#70](https://github.com/onlinovosk-bit/RealitkaAI/pull/70) |
| **3** | **Rebase + merge Realvia replay** — rebase #66 on `main`, fix Vercel preview failure, merge when CI + preview green | Tomáš + Zuzana | PR [#66](https://github.com/onlinovosk-bit/RealitkaAI/pull/66) |

---

## Recently merged (context)

| PR | Title | Merged |
|----|-------|--------|
| #69 | Browser-first leads (451→0 fix) | 2026-05-27 |
| #68 | P0 production reliability | 2026-05-27 |
| #67 | 8-layer architecture map | 2026-05-27 |
| #65 | AI Decision Ops on production | 2026-05-27 |

---

## Open PR inventory (non-P0)

| PR | Title | Notes |
|----|-------|-------|
| [#71](https://github.com/onlinovosk-bit/RealitkaAI/pull/71) | Competitive analysis + orchestrator task board | Docs-only — this PR |

Stale Slate / Smolko PRs (#14–#30) remain open — **do not merge** without individual preview smoke per L99 (1 PR = 1 logical change).

---

*Board owner: L99 Chief Orchestrator. Sync with Ruflo `autopilot_progress` after each merge.*
