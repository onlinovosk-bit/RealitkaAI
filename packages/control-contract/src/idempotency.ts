/**
 * CP-SPEC §3.7 — idempotency key is DETERMINISTIC, never random.
 *
 *   sha256(agentId : action : tenantId : entityId : decisionId)
 *
 * A retry recomputes the same key, so the platform-level uniqueness constraint
 * (I-009, `UNIQUE (agency_id, event_type, idempotency_key)`) turns a duplicate
 * write into a no-op instead of a duplicate side effect.
 *
 * Node-only module (`node:crypto`). Import it from server code paths only.
 */
import { createHash } from "node:crypto";

export type IdempotencyInput = {
  agentId: string;
  action: string;
  tenantId: string;
  entityId: string;
  decisionId: string;
};

const SEPARATOR = ":";

export function deriveIdempotencyKey(input: IdempotencyInput): string {
  const parts = [input.agentId, input.action, input.tenantId, input.entityId, input.decisionId];
  for (const part of parts) {
    if (part.includes(SEPARATOR)) {
      // A colon inside a part would make two different inputs hash identically.
      throw new Error(`idempotency key part must not contain "${SEPARATOR}": ${part}`);
    }
  }
  return createHash("sha256").update(parts.join(SEPARATOR)).digest("hex");
}
