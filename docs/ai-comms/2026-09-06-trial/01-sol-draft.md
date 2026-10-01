---
role: sol
turn: 1
input_refs:
  - docs/ai-comms/2026-09-06-trial/00-brief.md
  - docs/architecture/gpt-sol-opus5-autonomous-communication.md
  - apps/crm/docs/RUFLO-ORCHESTRATION.md
  - docs/security/AI_SECURITY.md
output_type: draft
allowed_actions:
  - read_repo
  - write_docs_branch
blocked_actions:
  - prod_write
  - merge
  - external_send
  - runtime_automation
evidence:
  - docs/architecture/gpt-sol-opus5-autonomous-communication.md
  - apps/crm/docs/RUFLO-ORCHESTRATION.md
  - docs/security/AI_SECURITY.md
verdict: N/A
---

# GPT Sol draft

## Proposal

Use **repo-mediated manual Sol↔Opus communication** as the default model-to-model
collaboration pattern.

The protocol should remain manual until one or more trials prove that it:

- creates durable artifacts;
- catches real risks before implementation;
- does not expand scope after the brief is locked;
- respects founder GO gates.

## Evidence

- `docs/architecture/gpt-sol-opus5-autonomous-communication.md` defines the
  repo transport, roles, loop limit, blocked actions, and first manual trial.
- `apps/crm/docs/RUFLO-ORCHESTRATION.md` already says long-running agent state
  needs persistent IDs and audit logs; this supports repo-visible state.
- `docs/security/AI_SECURITY.md` requires least privilege and human gates for
  critical actions such as send, delete, export, migrations, and billing.
- `memory/decisions.md` already treats `memory/` as a handoff layer between
  AI tools rather than relying on chat-only state.

## Assumptions

- **FACT:** The contract document exists on the current trial branch.
- **FACT:** Runtime automation is explicitly out of scope for this trial.
- **ASSUMPTION:** Founder wants to preserve the Sol/Opus concept, but with
  stronger auditability than an external Notebook/chat.
- **UNKNOWN:** The original external Notebook content has not been imported.

## Risk

The main risk is confusing "manual protocol PASS" with "runtime automation PASS".
This draft does **not** approve provider APIs, autonomous task loops, or model
agents with tools.

## Recommended next action

Run Opus review against this draft. If Opus finds no STOP, accept the manual
protocol for one more real task. Keep runtime automation blocked.

## Gate

**GO REQUIRED** for any merge or runtime work.
