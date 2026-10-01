---
id: memory-engine.canonical-model
title: Revolis Memory Engine V1 normalized model
type: generated
status: candidate
version: 1.0.0
owner: founder
updated_at: 2026-07-22
confidentiality: internal
canonical: false
sources:
  - brain/ENGINE.md
  - docs/briefs/overnight/overnight-brief-memory-engine-v1.md
  - docs/architecture/inputs/memory-engine-sources-2026-07.md
  - memory/decisions.md
---

# Revolis Memory Engine V1

## Purpose and authority

Memory Engine V1 reduces repeated reconstruction of repository state. It creates
versioned pointers to evidence, a derived decision index, deterministic knowledge
health checks, and a weekly repository summary.

This file normalizes the July 2026 proposal. It is not a new source of product or
governance truth and it does not override `brain/ENGINE.md`. The supplied source
document is a Fable synthesis of three overlapping texts, not a verbatim archive
of the original conversations. That provenance limitation remains explicit.

Source authority remains:

1. Code, migrations, tests, and reproducible command output for implemented state.
2. `memory/decisions.md` and approved ADRs for accepted decisions.
3. Constitution, Engineering OS, data sourcing, privacy, and antipattern documents
   for governance.
4. Active briefs and runbooks for bounded execution scope.
5. Brain registry, audits, and weekly summaries as generated views only.

Generated output may identify conflict or staleness. It may never silently rewrite
an accepted decision, publish externally, merge, deploy, access production, or
invent unavailable facts.

## V1 vertical slice

### Memory layer

`brain/registry/index.json` contains at most ten generated pointer records. Each
record names one owned capability area and includes its repository source,
inventory digest, dependencies, related decisions, evidence, confidence, and
sensitivity. The source file remains authoritative.

`brain/decisions/index.json` is a non-canonical projection of evidenced historical
decisions. `memory/decisions.md` remains the decision log. Cursor rules are policy
evidence and are never reclassified as historical decisions.

### Ingest layer

`npm run brain:ingest` reads only files returned by `git ls-files` under an explicit
allowlist. It does not scan untracked files, `.env` values, output directories,
trackers, customer exports, or production systems. Missing areas are recorded as
`unknown` or `unavailable`. Stable sorting and content digests make the result
idempotent. `npm run brain:check` verifies that committed generated views match the
current repository without writing them.

### Audit layer

`npm run brain:audit` validates schemas and references, checks 30-day freshness,
finds dead local links and missing evidenced paths, compares documented API routes
with route handlers, surfaces conservative capability overlap, and identifies due
decisions without a verified outcome.

Deterministic failures such as malformed records are errors. Behavior duplication,
unused assets, and route interpretation are advisory findings with confidence and
evidence. They are never automatic delete or refactor instructions.

Each run writes JSON and Markdown plus a delta against the previous report. An
identical second run moves findings from `added` to `unchanged`; resolved keys are
listed explicitly.

### Learning layer

`npm run brain:weekly` combines the latest audit delta with the last seven days of
Git history. It emits at most five recommendations, each with evidence and
confidence. Marketing, customer, revenue, and time-saving metrics remain
`unavailable` until a privacy-approved measured source exists.

The generator is manual. It has no model call, agent shell, scheduler, database,
network request, or production side effect.

## Record contract

Registry records contain stable ID, type, name, purpose, owner, state, source,
creation and verification dates, dependencies, related decisions, evidence,
confidence, sensitivity, capabilities, and inventory digest. Every generated
record has `canonical: false`.

Decision projections contain problem, choice, rationale, alternatives, expected
outcome, observed outcome, review date, related assets, supersession links, and
evidence. Unknown alternatives or outcomes are the literal value `unavailable`,
not reconstructed fiction.

No Brain record may contain secrets, private keys, live tokens, personal email
addresses, phone numbers, raw customer payloads, or customer exports.

## Human gates

Local generation and tests are reversible. Founder approval remains required for:

- accepting the July 22 brief as an explicit unlock of the older Engine backlog;
- committing or changing the canonical `brain/ENGINE.md`;
- merge, branch-protection changes, scheduler activation, or deployment;
- database changes, production access, or publication outside the repository.

## Deferred capabilities and unlock conditions

Observation agents unlock only after two weeks of actual V1 use. A recommendation
dashboard unlocks after four reviewed weekly summaries. Customer, marketing, and
CRM metric ingest unlocks only when a named lawful source and retention policy
exist. A product Decision-to-Outcome loop remains a separate customer-facing bet.
A scheduler requires a separate choice of owner and runtime after manual use proves
value.

The implementation should be removed or reduced if routine maintenance exceeds 30
minutes, generated views repeatedly drift from sources, the founder does not use
the reports, or it displaces customer delivery without reducing errors or lookup
time.
