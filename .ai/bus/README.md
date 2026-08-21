# Revolis Inter-Agent Bus v0.1

Minimal repository-local bus for handoffs between AI agents working on Revolis.

## Directory contract

- `inbox/` - incoming messages waiting for an agent.
- `outbox/` - completed messages and results.
- `tasks/` - canonical task cards.
- `context/` - reusable context packets.
- `state/` - transient state snapshots.
- `decisions/` - decision records produced by agents.
- `archive/` - closed or superseded bus artifacts.

## Rules

1. Keep messages small, factual, and link to repo files instead of pasting long logs.
2. One message equals one action, result, or decision.
3. Never invent external state. If a fact comes from an external system, include the command, URL, or artifact used as evidence.
4. Move completed handoffs to `outbox/` or `archive/`; do not leave stale work in `inbox/`.
5. Retention: when `outbox/` exceeds 20 files, move older messages into `archive/`.
6. Do not store secrets, personal data dumps, or production credentials in the bus.

See `AGENT_PROTOCOL.md` and `message.schema.md` before writing new bus messages.
