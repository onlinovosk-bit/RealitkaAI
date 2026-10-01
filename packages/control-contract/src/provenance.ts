/**
 * CP-SPEC §3.6 — provenance answers the six questions from the founder thesis §24.
 * It lives in `payload._provenance`, not in a column (CP-SPEC §4.2.1).
 */
import type { CorrelationId } from "./identity.ts";

export type Provenance = {
  /** Where the data came from. NEVER the content — always a reference. */
  sourceSystem: string;
  sourceRef: string | null;
  derivedFrom: CorrelationId[];
  /** Identifier + version of the function that computed the value. */
  computedBy: string | null;
  measuredAt: string;
};

/** I-015 — provenance must be reconstructable for any derived value. */
export function isReconstructable(p: Provenance): boolean {
  if (p.derivedFrom.length === 0) return true; // not derived — nothing to reconstruct
  return p.computedBy !== null;
}
