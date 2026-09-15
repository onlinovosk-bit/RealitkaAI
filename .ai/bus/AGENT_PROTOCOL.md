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

## Envelope v1 (required for new messages)

New bus artifacts SHOULD include the full envelope from message.schema.md:

- 	race_id — stable across the whole task message chain
- parent_task_id — set when decomposed; otherwise 
ull
- context_refs / memory_refs — references only, never content copies
- constraints, udget, deadline, 
equired_capabilities
- pproval_required — must be 	rue when 
isk is high or critical
- idempotency_key — stable hash of task_id + scope + acceptance

## Lifecycle states

Canonical happy path:

CREATED → PLANNED → ASSIGNED → IN_PROGRESS → WAITING → RESULT_READY → VERIFYING → VERIFIED → CLOSED

Failure branch:

IN_PROGRESS → BLOCKED → RETRY | NEEDS_INPUT | ESCALATED

Legacy values done / locked / open remain readable for existing tasks; new work should use the canonical set. Enforced by pps/crm/scripts/bus-validate.mjs.

