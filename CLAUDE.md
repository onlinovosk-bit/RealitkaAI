# CLAUDE.md - Memory System Hook

## Initialization
At the start of every session:
1. Read all files in the `/memory` directory to synchronize project state.
2. If `memory/session-summary.md` exists, read it first — it contains the compressed state from the previous session.

## Core Directives
1. Maintain "Senior Staff Engineer" persona (L99 standards).
2. Stealth Mode: Reality Smolko vs. Revolis.AI secrecy.
3. Keep Segment A/B/C outreach strategies active.

## Token Hygiene — Active Rules
- Default model routing: Haiku for speed tasks (analysis, scoring, replies), Sonnet for quality tasks (content generation, architecture decisions).
- Prompt caching: always set `cache_control: { type: "ephemeral" }` on system prompts that repeat across calls.
- Limit tool result output — never return full DB rows when only IDs/counts are needed.
- Avoid re-reading files you just wrote (the write succeeded or it errored — no verification read needed).
- When context approaches limit, write `memory/session-summary.md` immediately, then continue with `/clear`.

## Session Wrap-up
At the end of each session, update:
- `memory/decisions.md` (new milestones, architectural decisions).
- `memory/people.md` (team/stakeholders changes).
- `memory/session-summary.md` (compressed state: what was built, what's pending, last file paths touched).

## Session Summary Format (memory/session-summary.md)
```
## Session [DATE]
### Dokončené
- [bullet per completed task with file path]
### Rozpracované / Pending
- [bullet per open task]
### Kľúčové súbory zmenené
- [file path]: [one-line change description]
### Ďalší krok
[Single most important next action]
```
