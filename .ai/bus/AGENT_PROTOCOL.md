# Agent Protocol

This protocol defines how agents coordinate through `.ai/bus` without relying on
chat history as the source of truth.

## Operating principles

- Repo first: durable findings and decisions must land in files.
- Evidence first: every result references commands, logs, diffs, PRs, or source paths.
- Narrow scope: one handoff covers one logical task.
- No hidden mutation: destructive, production, merge, and external communication actions
  require explicit GO from the founder.
- Confidentiality: do not expose Reality Smolko internal data or unfinished Revolis
  capabilities outside approved project channels.

## Message flow

1. Create a task card in `tasks/` when work needs ownership.
2. Put new inbound handoffs in `inbox/`.
3. Put completed results in `outbox/`.
4. Put shared background in `context/`.
5. Put superseded or closed artifacts in `archive/`.
6. Record accepted decisions in `decisions/`.

## Message naming

- Tasks: `TASK-0001.md`
- Context packets: `CTX-0001.md`
- Messages: `MSG-YYYYMMDD-NNN-short-title.md`
- Decisions: `DEC-YYYYMMDD-NNN-short-title.md`

Use zero-padded sequence numbers. Prefer stable names over clever names.

## Required message fields

Each non-empty bus artifact should include:

- `id`
- `type`
- `status`
- `owner`
- `created_at`
- `scope`
- `evidence`
- `next_action`

See `message.schema.md` for the canonical template.
