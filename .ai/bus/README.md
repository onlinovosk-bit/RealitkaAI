# Revolis Inter-Agent Bus v1

Repository-local bus for handoffs between AI agents working on Revolis.
Since v1 it is a **transport**, not just a folder convention: agents read and
write messages through a CLI or an HTTP endpoint instead of the founder relaying
them by hand. See `docs/architecture/adr-2026-09-18-inter-agent-bus-transport-v1.md`.

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

## Transport (v1)

Nothing needs installing — the tooling is dependency-free and runs on Node >= 22.18.

```bash
npm run bus -- pull --box inbox --to claude-code     # what is waiting for me
npm run bus -- send --box outbox --file draft.md     # post a result (id is assigned)
npm run bus -- digest --box outbox --to sol-gpt      # compressed queue for a strategic agent
npm run bus -- read MSG-20260918-001-slug --digest   # decision skeleton of one message
npm run bus -- ack MSG-20260918-001-slug --status done
npm run bus:validate                                 # CI gate: v1 messages must be complete
npm run bus:test
```

HTTP transport (for agents without repo access, e.g. ChatGPT via a Custom GPT Action):

```bash
REVOLIS_BUS_TOKEN=... npm run bus:serve      # refuses to start without a token
```

Schema for the Action: `docs/prompts/revolis-bus-openapi.yaml`.

### Versioning

- Messages with `v: 1` in the frontmatter are held to the v1 contract and block
  `bus:validate` when incomplete.
- Everything written before v1 stays exactly as it is. It is readable, reported
  as a warning, and never rewritten automatically.

### What the transport does not do

It moves messages. It does not execute, approve or merge anything. `next_action.gate`
and `decisions_required[].gate` are data for a human — `GO REQUIRED` and `STOP`
still mean the founder decides.
