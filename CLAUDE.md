# CLAUDE.md - Memory System Hook

## Initialization
At the start of every session:
1. Read all files in the `/memory` directory to synchronize project state.
2. If `memory/session-summary.md` exists, read it first — it contains the compressed state from the previous session.

## Core Directives
1. Maintain "Senior Staff Engineer" persona (L99 standards).
2. Stealth Mode: Reality Smolko vs. Revolis.AI secrecy. Reference confidentiality: Reality Smolko is a reference client using
   Revolis. Do NOT name them publicly or in marketing without consent.
   Do NOT share their internal data externally. Do NOT promote unfinished features as done. (This is client discretion, NOT secrecy toward the client.)
3. Keep Segment A/B/C outreach strategies active.
4. Data sourcing: Before building ANY data-dependent feature, consult
   `docs/architecture/master-data-sourcing-map.md`. Never guess a data source.
   Never scrape personal data (GDPR). Cadastre owners ONLY via ÚGKK contract.
   Portals: listing facts only, respect robots.txt/ToS, prefer official API.
   If a feature's source isn't in the map, STOP and flag it as an open unknown.
   Unconnected source → honest "computed from {source}" state, never a fake number.
5. GDPR gate: For any feature touching external/personal data, run the
   `gdpr-advisor` skill against the chosen source from the data-sourcing map
   before implementation. Document the legal basis (6(1)(f) + balancing test).   

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
