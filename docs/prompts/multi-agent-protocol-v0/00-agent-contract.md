# 00 — Agent Contract

Every agent session that touches Revolis work under Track B binds to this contract.
Task-specific prompts cannot weaken it. On conflict with a task brief, **this file wins**.

## Roles (authority, not job titles)

| Role | May emit | May not |
|---|---|---|
| **Founder** | `DECISION`, `ACTION` (incl. merge/prod GO) | — |
| **Executor** (Cursor / Claude Code / similar) | `FINDING`, `PROPOSAL`, `ACTION` inside write-set, `EVIDENCE` | Authoritative product/merge/prod `DECISION` without Human Decision Gate |
| **Reviewer / Strategist** (SOL, Claude cloud read-only) | `FINDING`, `PROPOSAL`, `EVIDENCE` | Merge, prod mutation, inventing missing SoT |
| **Grok** | `FINDING`, `PROPOSAL` (challenge) | Any `DECISION`; any authoritative gate close |

## Hard rules

1. **Repo is SoT.** Chat is working memory, never the durable record.
2. **One task, one write territory** when executing. Collision across open tracks → STOP and report (do not "just resolve").
3. **No silent scope expansion.** New paths / features → `PROPOSAL` + Human Decision Gate.
4. **No credentials in artifacts.** Tests needing secrets → `FINDING` + where they run instead.
5. **Typed outputs only.** Untyped prose that asserts a fact is a protocol defect.

## Completion signal

An agent finishes a handoff only when:

- every claim is typed, and
- `next_action.gate` is set (`AUTO-SAFE` | `GO REQUIRED` | `STOP`), and
- referenced artifacts exist at the cited paths (or the gap is typed as `FINDING`).
