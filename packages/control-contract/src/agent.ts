/**
 * CP-SPEC §3.3 — the agent contract.
 *
 * `resolveAuthority` and `emit` arrive in the RunContext. An agent must not
 * implement either: an agent that granted itself authority would make the whole
 * control plane decorative.
 */
import type { AuthorityContext, AuthorityVerdict, Capability } from "./authority.ts";
import type { ControlEvent } from "./events.ts";
import type { Actor, CorrelationId, RunId, TenantId } from "./identity.ts";
import type { ActionResult, Decision, Lesson, Observation, OutcomeRecord } from "./phases.ts";

export type RunContext = {
  correlationId: CorrelationId;
  runId: RunId;
  tenantId: TenantId;
  actor: Actor;
  now: () => Date;
  /** Supplied by the platform. */
  newId: () => string;
  emit: (event: ControlEvent) => Promise<void>;
  /** Supplied by the platform. The agent cannot substitute its own. */
  resolveAuthority: (ctx: AuthorityContext) => AuthorityVerdict;
  systemState: { degraded: boolean; killSwitch: boolean };
  actorRole: string;
};

export interface ControlledAgent<TInput> {
  readonly agentId: string;
  readonly version: string;
  readonly capabilities: readonly Capability[];

  observe(input: TInput, ctx: RunContext): Promise<Observation[]>;
  decide(observations: Observation[], ctx: RunContext): Promise<Decision | null>;
  /**
   * Called ONLY by `runControlledAgent`, and only with a verdict the runner
   * re-resolved immediately beforehand (I-007).
   */
  act(decision: Decision, verdict: AuthorityVerdict, ctx: RunContext): Promise<ActionResult>;
  reportOutcome(action: ActionResult, ctx: RunContext): Promise<OutcomeRecord>;
  learn?(decision: Decision, outcome: OutcomeRecord): Promise<Lesson>;
}

export class ControlContractViolation extends Error {
  readonly invariant: string;
  constructor(invariant: string, message: string) {
    super(`${invariant}: ${message}`);
    this.name = "ControlContractViolation";
    this.invariant = invariant;
  }
}
