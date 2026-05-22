# Open Tasks — Prioritized Queue

> Posledná aktualizácia: 2026-05-22 | Ruflo overnight handoff

## P0 — Blockers / Integration

- [ ] **Realvia re-test od Bereczovej** — delete (sold/rent/cancel) + create/update export
- [ ] **Overiť produkčný deploy PR #60** — auth message `Invalid authentication` na oboch scenároch (missing + wrong token)
- [ ] **Externý cron** — potvrdiť že worker beží každých 5 min (cron-job.org)

## P1 — Realvia hardening

- [ ] Fix `resolveAgency.ts` — DB lookup namiesto tichého fallbacku
- [ ] Property upsert scoping podľa `agency_id`
- [ ] Investigate Vercel preview deploy failures (realitka-ai)

## P2 — Product / Demo

- [ ] Demo funnel v5 HTML — schválenie + samostatný PR (`preview-demo-conversion-funnel-v5-l99.html`)
- [ ] React `/demo` implementácia (až po HTML schválení)

## P3 — Tech debt

- [ ] Zmazať 4 dead routes (po potvrdení): `/api/system/schema`, `/api/test-db`, `/api/admin/check-migration`, `/api/l99/shadow-inventory`
- [ ] Streaming pre call-coach (vzor: `listing-content/stream`)
- [ ] AI moduly migrácia na `callClaude()` wrapper

## P4 — AI orchestration (shared memory)

- [x] `memory/integrations.md` — live integration status
- [x] `memory/open-tasks.md` — prioritized queue
- [ ] ChatGPT Project „Revolis OS“ s pinned `session-summary.md` + `decisions.md`
- [ ] CrewAI / Mem0 — až po Realvia GO
