/**
 * The CRM-side factory for a Control Contract RunContext.
 *
 * It exists so that `resolveAuthority` and `emit` are supplied by the platform,
 * never by the agent (CP-SPEC §3.3). An agent that could build its own RunContext
 * could grant itself authority.
 *
 * Server-only (`node:crypto`).
 */
import { randomUUID } from "node:crypto";

import {
  correlationId as toCorrelationId,
  resolveAuthority,
  runId as toRunId,
  tenantId as toTenantId,
  type Actor,
  type AuthorityPolicy,
  type ControlEventSink,
  type RunContext,
  type SystemState,
} from "@revolis/control-contract";

export type CreateRunContextParams = {
  tenantId: string;
  /** The business thread. One lead, one OBSERVE→LEARN loop. */
  correlationId: string;
  /** One attempt. A retry is a new runId with the same correlationId. */
  runId?: string;
  actor: Actor;
  sink: ControlEventSink;
  policy?: AuthorityPolicy;
  now?: () => Date;
  newId?: () => string;
  systemState?: SystemState;
  actorRole?: string;
};

export function createControlRunContext(params: CreateRunContextParams): RunContext {
  const now = params.now ?? (() => new Date());
  return {
    correlationId: toCorrelationId(params.correlationId),
    runId: toRunId(params.runId ?? randomUUID()),
    tenantId: toTenantId(params.tenantId),
    actor: params.actor,
    now,
    newId: params.newId ?? (() => randomUUID()),
    emit: params.sink.emit,
    resolveAuthority: (authorityContext) =>
      resolveAuthority(authorityContext, { policy: params.policy, now }),
    systemState: params.systemState ?? { degraded: false, killSwitch: false },
    actorRole: params.actorRole ?? "agent",
  };
}
