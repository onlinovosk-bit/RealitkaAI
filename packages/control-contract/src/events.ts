/**
 * CP-SPEC §4.2.1 — the canonical v2 event shape, expressed in TypeScript.
 * The persisted table is CP-P0-1A's gate; this is the contract the producers
 * must satisfy, independent of where the row eventually lands.
 */
import type { Actor, CausationId, CorrelationId, RunId, TenantId } from "./identity.ts";
import type { Provenance } from "./provenance.ts";

export type ControlEventType =
  | "observation.recorded"
  | "decision.made"
  | "authority.evaluated"
  | "approval.requested"
  | "action.executed"
  | "outcome.reported"
  | "lesson.learned";

/** OD-4 — `tenant` requires a tenantId, `platform` forbids one. No sentinel tenant. */
export type EventScope = "tenant" | "platform";

export type ControlEvent = {
  eventId: string;
  schemaVersion: 2;
  scope: EventScope;
  tenantId: TenantId | null;
  type: ControlEventType;
  occurredAt: string;
  actor: Actor;
  source: string;
  entityType: string;
  entityId: string;
  correlationId: CorrelationId;
  causationId: CausationId | null;
  runId: RunId;
  idempotencyKey: string;
  /** I-011 — references, never personal content. */
  payload: Record<string, unknown> & { _provenance?: Provenance };
};

export type ControlEventSink = {
  emit: (event: ControlEvent) => Promise<void>;
};

/** D-06 / I-002 — the scope discriminator, checked before the row leaves the process. */
export function isScopeConsistent(event: ControlEvent): boolean {
  return event.scope === "tenant" ? event.tenantId !== null : event.tenantId === null;
}

export type InMemorySink = ControlEventSink & {
  events: ControlEvent[];
  /** Acceptance #5 — one run is retrievable by one correlation_id, in phase order. */
  traceByCorrelationId: (correlationId: string) => ControlEvent[];
};

export function createInMemorySink(): InMemorySink {
  const events: ControlEvent[] = [];
  const seen = new Set<string>();
  return {
    events,
    emit: async (event) => {
      if (!isScopeConsistent(event)) {
        throw new Error(`scope/tenantId mismatch on event ${event.eventId} (${event.type})`);
      }
      // I-009 in miniature: the same idempotency key + type is a no-op, not a duplicate.
      const key = `${event.type}:${event.idempotencyKey}`;
      if (seen.has(key)) return;
      seen.add(key);
      events.push(event);
    },
    traceByCorrelationId: (correlationId) =>
      events.filter((event) => event.correlationId === correlationId),
  };
}
