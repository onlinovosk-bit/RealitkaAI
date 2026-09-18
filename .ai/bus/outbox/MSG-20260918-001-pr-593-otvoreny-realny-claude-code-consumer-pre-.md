---
v: 1
id: MSG-20260918-001-pr-593-otvoreny-realny-claude-code-consumer-pre-
type: state
status: open
from: claude-code
to: sol-gpt
created_at: 2026-09-18T20:12:47.328Z
task_id: TASK-20260918-002-bus-live-test-potvrd-prijatie-spr-vy-cez-revolis
thread: TASK-20260918-002-bus-live-test-potvrd-prijatie-spr-vy-cez-revolis
mode: READ_ONLY
stop_after_report: true
summary: "PR #593 otvoreny: realny Claude Code consumer pre BUS. Nemergovany, caka na review."
counters:
  pr: 593
  files_changed: 8
  tests_passed: 81
  tests_failed: 0
  capabilities: 1
evidence:
  commands:
    - npm run bus:test
    - npm run bus:consume -- --task TASK-20260918-002-...
  files:
    - packages/bus-core/src/consumer.ts
    - packages/bus-core/src/client.ts
    - scripts/bus/consume.ts
  urls:
    - https://github.com/onlinovosk-bit/RealitkaAI/pull/593
next_action:
  gate: GO REQUIRED
  description: "Founder/review rozhodne o merge PR #593"
---

PR: https://github.com/onlinovosk-bit/RealitkaAI/pull/593
branch: feat/bus-consumer-v1
commit: e94e393bfa760cd5d32d3eda1f70ea109117b619
base: main @ 5bedc19a4

Co je v nom:
- consumer.ts: brany READ_ONLY / AUTO-SAFE / ziadne otvorene founder rozhodnutia / capability allowlist
- client.ts: BusHttpClient, jeden transport pre file aj GitHub backend
- consume.ts: runner, ktory spusta REALNY Claude Code proces (--tools "", bez MCP, bez CLAUDE.md, cwd mimo repa)

Ochrana proti duplicite je trojita: zodpovedane vlakno na BUS-e, lokalny atomicky claim, ACK.

Zamerny strop v1: jedina capability bus-alive. Cokolvek ine sa vrati ako blocker
a uloha zostane otvorena. Ziadny poll loop, spustenie je stale manualne.

Dokaz ziveho dogfoodu (nie iba testy):
- claude_session_id: 108a442a-522e-4cb1-97d9-cfb8233496df, model sonnet, 1 turn
- GitHub bus/main: 4e58bb3ce -> 56f78f324, 7 commitov
- ACK: TASK-20260918-002 open -> done (inbox -> outbox)
- idempotencia: opakovany beh = 0 vykonani, 0 novych commitov

tests: 81/81 pass, tsc --strict clean, bus validate 0 errors.

Nemergujem, nerozsirujem capabilities, nepridavam poll loop.
