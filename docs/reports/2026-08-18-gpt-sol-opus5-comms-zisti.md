# ZISTI — GPT Sol ↔ Opus 5 autonomous communication

**Date:** 2026-08-18  
**Branch:** `cursor/gpt-sol-opus5-comms-zisti-dabc`  
**Mode:** read-only investigation + repo handoff. No implementation.

## Question

Founder asked whether the last work was about autonomous communication between
GPT Sol and Opus 5.

## Evidence checked

### Repo search

Searched workspace for:

- `GPT Sol`
- `Opus 5`
- `autonómna komunikácia`
- `model-to-model`
- `komunikácia medzi`
- related case-insensitive variants

Findings:

- `memory/decisions.md` contains only the older decision that GitHub `memory/`
  is the handoff layer between Cursor/Claude and ChatGPT.
- `apps/crm/docs/L99-intelligent-model-routing-caching-skill.md` mentions
  `claude-opus` generically as a model routing example.
- No repo artifact explicitly documents GPT Sol ↔ Opus 5 autonomous communication.

### Cursor Cloud scope

Available recent agents since 2026-08-17:

1. `Dnešná posledná práca notebooku` — current mobile run, model `gpt-5.5-medium-fast`.
2. `Critical bug management` — automation run, model `cursor-grok-4.5-high-fast`.

No accessible recent cloud-agent metadata references GPT Sol or Opus 5.

## Verdict

**NOT FOUND IN REPO SSOT.**

The topic may exist in an external Notebook/chat, but it is not yet synchronized
into `memory/` or `docs/reports/`.

## Safe next step

Create a small canonical contract document before implementation:

```text
docs/architecture/gpt-sol-opus5-autonomous-communication.md
```

Minimum contract:

1. Roles: what GPT Sol owns vs. what Opus 5 owns.
2. Transport: repo file, PR comments, Cursor Cloud agent transcript, API, or other.
3. State machine: proposal → critique → revision → verdict → handoff.
4. Safety: no PROD writes, no external send, no merge without founder GO.
5. Audit trail: every exchange has a durable repo artifact.

## Gate

**GO REQUIRED** before building any automation. Current safe scope is a contract
draft only.
