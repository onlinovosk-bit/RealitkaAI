# RAU W0 — audit skutočného stavu agentnej infraštruktúry (2026-09-30)

> **Čo to je.** Výstup read-only prieskumu (`Explore` sub-agent, nič nezapisoval) k otázke: čo z
> „agentnej infraštruktúry", o ktorej hovoria dokumenty, je v repe **kód** a čo len **špecifikácia**.
> Podklad pre `docs/rau/RAU-v1.0.md`. Stav repa: `main` = `6afb3ba`.
>
> **Dôveryhodnosť.** Agent uvádzal cesty a riadky; ja som **overil existenciu ciest** (`ls`), nie každé
> tvrdenie. Jedno tvrdenie neobstálo: agent uviedol `docs/audit/RLS-ISOLATION-REPORT.md` ako súbor,
> ktorý čítajú testy — súbor **neexistuje**. Všetko, čo nižšie nemá značku „overené ls", je z jeho
> výstupu a je ≤ UNVERIFIED.

Stavy: **CODE-RUNNING** (kód beží/má testy v CI) · **CODE-PARTIAL** · **SPEC-ONLY** · **ABSENT**.

| Komponent | Stav | Dôkaz |
|---|---|---|
| Control Contract (cesta odosielania) | CODE-RUNNING len pre odosielanie | `apps/crm/src/lib/control-plane/authorize-send.ts` (overené ls); volania v `lib/inbound/approve-draft.ts`, `lib/outreach-store.ts` |
| Šesťfázový runner `runControlledAgent` | CODE-PARTIAL | volajú ho len testy; `createControlledFollowupAgent` nemá produkčného volajúceho |
| Events Spine v2, trvalé schvaľovania | SPEC-ONLY / ABSENT | žiadna migrácia s `causation_id`/`correlation_id`; žiadna tabuľka schvaľovaní |
| Founder UI (`/operator`) | CODE-PARTIAL (za flagom, default 404) | `apps/crm/src/app/operator/page.tsx` |
| Inter-Agent Bus (knižnica, CLI, server) | CODE-RUNNING ako testovaný kód; nasadenie NEZNÁME | `packages/bus-core/src`, `scripts/bus`; ADR-y si o nasadení protirečia |
| Runner `docs/prompts/runner/00–12` | SPEC-ONLY + 2 skripty | `apps/crm/scripts/tc-orchestrator.mjs` (viazaný na jeden profil, Windows default cesta, „NEVOLÁ MODEL"), `apps/crm/scripts/judge.mjs` (overené ls); DAG/vlny/write-probe/dispatch v kóde nie sú |
| Model Router | ABSENT | modely sú zadrôtované pri volaní; `lib/ai/multi-model.ts` je 6-riadkové zlúčenie skóre |
| Cost Governor | ABSENT | existuje len rate-guard |
| Telemetria nákladov | CODE-PARTIAL | `apps/crm/src/lib/ai/llm-usage-cost.ts`, `persist-cost-telemetry.ts` (overené ls); migrácie `…ai_action_audit_cost_columns.sql`, `…ai_cost_daily_view.sql`; na PROD NEZNÁME |
| `model_calls`, `tokens_in` | ABSENT v kóde | len v dokumentoch/ledgeri |
| EC-001 State-claim verifier | SPEC-ONLY | `docs/contracts/EC-001-state-claim-verifier.md` — „navrhnutá, neimplementovaná" |
| Vitest verifikácie, RLS testy, ratchet brány | CODE-RUNNING | `apps/crm/tests/verification/*`, `tests/rls/*`, `check-api-contract.mjs`, `typecheck-baseline.mjs` |
| `find-dead-exports.mjs` | ABSENT | odkazuje naň workflow/automatizácia, súbor nie je |
| Memory engine (repo-znalosti) | CODE-RUNNING | `brain/` (overené ls) |
| Produktová pamäť (tabuľky, graf) | SPEC-ONLY | ADR „NÁVRH"; žiadne tabuľky v migráciách |
| Register agentov `AGENT_SPECS` | CODE-RUNNING (4 agenti) | `apps/crm/src/lib/agents/agent-specs.ts` (overené ls) |
| Cron workflowy | CODE-RUNNING | 27 priečinkov v `apps/crm/src/app/api/cron/`, `apps/crm/vercel.json` |
| „8 uzavretých business loopov" | NEZNÁME — **fráza v repe nie je** | najbližšie: 4 slučky v `docs/architecture/north-star-2027-2030.md` |
| Project registry | ABSENT | (vytvorené RAU) |
| Mia Vellar / Proon / Nájomná agentúra / YouTube | Mia len ako zmienka v Blueprinte; ostatné 0 zmienok | grep |
| UPTM | kód v inom repozitári | `memory/session-summary.md` |

**Dokumenty tvrdia, kód nepotvrdzuje:** 15-krokový Runner (len 2 skripty); Model Router/Cost Governor/
`model_calls`; EC-001; Events Spine v2; produktová pamäť; `find-dead-exports.mjs`; nasadenie busu.
**Opačná chyba:** `docs/architecture/agentic/revolis-system-spec-v1.0.md` tvrdí „žiadny agent spec
neexistuje"; kód od #703/#704 má `agent-specs.ts` a `authorizeSend` na štyroch cestách „AI text → klient".

**Ako sa testuje a bráni (z auditu):** lokálna brána `scripts/ci/prepush-gate.sh` (typecheck ratchet,
lint, contract; vitest nie); CI `saas-grade-pipeline.yml` (vitest proti efemérnej DB, build, smoke;
joby `control-contract`, `bus`). Vitest v `apps/crm` importuje súbory z `scripts/` a `docs/`, preto
`classify-diff.sh` nikdy nepreskakuje krok Test.
