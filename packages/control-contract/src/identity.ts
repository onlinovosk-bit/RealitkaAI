/**
 * CP-SPEC §4.5.1 — four identities. Branded so they cannot be swapped by accident.
 *
 * correlationId — the business thread (one lead, one OBSERVE→LEARN loop). Survives retries.
 * runId         — one execution attempt. A retry is a new runId, the same correlationId.
 * causationId   — the immediate cause. ALWAYS the id of another EVENT, never of a domain entity.
 * tenantId      — the agency the loop belongs to.
 */

export type TenantId = string & { readonly __brand: "TenantId" };
export type CorrelationId = string & { readonly __brand: "CorrelationId" };
export type RunId = string & { readonly __brand: "RunId" };
export type CausationId = string & { readonly __brand: "CausationId" };

export class IdentityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IdentityError";
  }
}

function requireNonEmpty(raw: string, label: string): string {
  const trimmed = raw.trim();
  if (!trimmed) throw new IdentityError(`${label} must be a non-empty string`);
  return trimmed;
}

export function tenantId(raw: string): TenantId {
  return requireNonEmpty(raw, "tenantId") as TenantId;
}

export function correlationId(raw: string): CorrelationId {
  return requireNonEmpty(raw, "correlationId") as CorrelationId;
}

export function runId(raw: string): RunId {
  return requireNonEmpty(raw, "runId") as RunId;
}

export function causationId(raw: string): CausationId {
  return requireNonEmpty(raw, "causationId") as CausationId;
}

/**
 * CP-SPEC §3.3 — Actor. Who or what produced the record.
 * `agent` carries a version so a lesson can be attributed to the code that produced it.
 */
export type Actor =
  | { kind: "human"; profileId: string }
  | { kind: "agent"; agentId: string; version: string }
  | { kind: "system"; component: string }
  | { kind: "external"; source: string };

export function actorId(actor: Actor): string {
  switch (actor.kind) {
    case "human":
      return actor.profileId;
    case "agent":
      return `${actor.agentId}@${actor.version}`;
    case "system":
      return actor.component;
    case "external":
      return actor.source;
  }
}
