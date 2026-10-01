# `@revolis/control-contract`

CP-P0-4 — the Control Contract. Spec: `docs/architecture/founder-control-plane-cp-spec-v1.md` v1.1.0 §3.

```
OBSERVE ──► DECIDE ──► AUTHORIZE ──► ACT ──► REPORT OUTCOME ──► LEARN
```

**One invariant, from which the rest follows:** every action traces to exactly one
decision, every decision to at least one observation, and every action ends in an
outcome or an explicit `unknown` with a reason. An unfinished loop is an error, not
silence.

## Why it lives outside `apps/crm`

Cron jobs, `.ai/bus` agents and any future service must be able to import the
contract without importing the CRM. The package has **zero dependencies** — a CI
guard fails the build if that changes.

## What is enforced, and where

| Enforced by | What |
|---|---|
| `actions.ts` | An action with no registry entry cannot be authorized. The registry — not the caller — is the source of `reversible`, `externallyVisible`, `risk` and `capability`. |
| `authority.ts` | `resolveAuthority` is a pure function over context. Floors may only raise a verdict. `FORBIDDEN` is not reachable by an approval (I-007). |
| `policy.ts` | Every knob the engine reads. Policy is data, not branching. |
| `runner.ts` | The six phases, the causation chain, the platform-derived idempotency key, and a terminal outcome on every path (I-004, I-005, I-006, I-009). |
| `events.ts` | The canonical v2 event shape and the `scope`/`tenantId` discriminator (D-06, I-002). |

## The two rules that are easy to get wrong

**OD-9 — irreversibility is a floor, not a veto.** The v1.0 spec said
`irreversible → FORBIDDEN`. Since `FORBIDDEN` means "not even with human approval"
and sending an e-mail cannot be undone, that rule would have made every agent e-mail
impossible — which is the paid product. Irreversibility floors at
`APPROVAL_REQUIRED`; `FORBIDDEN` is reserved for the explicit DENY_LIST, which is an
owner decision rather than a property of the action.

**The registry is the truth.** An agent that could describe its own action as
reversible would walk straight under that floor. `resolveAuthority` re-reads the
registry and returns `FORBIDDEN` when the supplied context disagrees with it.

## Usage

```ts
import { createInMemorySink, runControlledAgent } from "@revolis/control-contract";
import { createControlRunContext } from "@/lib/control-plane/run-context";

const sink = createInMemorySink();
const ctx = createControlRunContext({
  tenantId: agencyId,
  correlationId: `followup-${leadId}`, // must not contain ":"
  actor: { kind: "agent", agentId: "followup_agent", version: "2.0.0-control-contract" },
  sink,
});

const result = await runControlledAgent(createControlledFollowupAgent(), { lead }, ctx);
sink.traceByCorrelationId(ctx.correlationId); // the whole run, in phase order
```

`resolveAuthority` and `emit` arrive in the `RunContext`. An agent must not supply
either — an agent that granted itself authority would make the control plane
decorative.

## Running

```bash
npm run control-contract:test        # node --test, no install needed (Node 22+)
npm run control-contract:typecheck   # tsc --noEmit
```

CI runs both in the `Control Contract (authority + closed loop)` job, which is
independent of the CRM job and of the ephemeral database.

## Not in this package

`ControlEventSink` has one implementation here: `createInMemorySink`. The durable
sink is **CP-P0-1A** (Events Spine v2) — the v2 columns do not exist on production
yet, so nothing in this package writes to a database.

Durable approvals are **CP-P0-2**. Until that gate, a run that needs approval emits
`approval.requested` and closes as `unknown{too_early}` with a recheck window. It
never stays silently open.
