# Briefs index

## Build Orders (aktívny workflow)

| Šablóna | Účel |
|---------|------|
| [`_BO-template.md`](./_BO-template.md) | Nový BO — Integration Report + Verification map + Plan Mode |
| [`verification-index.md`](./verification-index.md) | BO → `tests/verification/*.verification.test.ts` mapovanie |
| [`plans/README.md`](./plans/README.md) | Plan Mode artefakty (Save to workspace) |

| BO | Súbor | Stav |
|----|-------|------|
| BO-001 | [BO-001-proof-of-value.md](./BO-001-proof-of-value.md) | **SHIPPED** |
| BO-onboard | [BO-onboard-agency.md](./BO-onboard-agency.md) | aktívny |

## Overnight briefs (historické swarms)

**Auto-merge politika (Tier 1/2/3):** [AUTOMERGE-POLICY.md](../AUTOMERGE-POLICY.md) · robot vykonáva, agent nikdy nemerguje.

| Brief | Súbor | Report | Stav |
|-------|--------|--------|------|
| 9.0 | [overnight-master-brief-9.md](./overnight/overnight-master-brief-9.md) | [OVERNIGHT-REPORT-9.md](../../apps/crm/docs/OVERNIGHT-REPORT-9.md) | **aktívny** — [#185](https://github.com/onlinovosk-bit/RealitkaAI/pull/185) merged |
| 8.0 | [overnight-master-brief-8.md](./overnight/overnight-master-brief-8.md) | _(chýba)_ | čiastočne — B=#184, C=#183 subset |
| 7.0 | [overnight-master-brief-7.md](./overnight/overnight-master-brief-7.md) | — | merged stack (#174–#178) |
| 6.0 | [overnight-master-brief-6.md](./overnight/overnight-master-brief-6.md) | — | **placeholder** (Brief 10 C1) |
| 10.0 | [overnight-master-brief-10-loop1-genome.md](./overnight/overnight-master-brief-10-loop1-genome.md) | — | merged B/C/A (#245–247); Wave C cleanup v `chore/brief10-wave-c-cleanup` |

## Brief 8.0 — overené PR/vetvy (2026-06-11)

| Úloha | PR | Vetva |
|-------|-----|-------|
| RLS suite | #184 | `chore/rls-tenant-isolation-suite` |
| Activation e-maily | #183 | `feat/onboarding-activation-emails` |
| Stale-main guardrails | #181 | `chore/stale-main-guardrails` |
| Landing v2 | #188 | `feat/landing-v2-release` |
| Founder metrics | #187 | `feat/founder-metrics` |
| Nehnuteľnosti import | #186 | `feat/nehnutelnosti-import` |

## Prompts (`prompts/`)

Historické Cursor / modul briefy patria sem (nie do `overnight/`).

| Súbor | Stav |
|-------|------|
| `cursor-brief-demo-page-final` | **neexistuje** v `overnight/` na `main` — presun preskočený (Agent H, Brief 9) |
| `recruiting-modul-brief` | **neexistuje** v `overnight/` — živá kópia v `apps/crm/docs/strategy/recruiting-modul-brief-2026-06-03.md` |

## Súvisiace docs

- [ARCHIVE-PROPOSAL.md](../ARCHIVE-PROPOSAL.md) — inventár `docs/` rootu a návrh archivácie
- [AUTOMERGE-POLICY.md](../AUTOMERGE-POLICY.md) — auto-merge robot v1
- [memory/decisions.md](../../memory/decisions.md) — vault rozhodnutí (Brief 9.0 + automerge v1)
