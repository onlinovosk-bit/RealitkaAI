import { sha256Hex } from "./canonical.js";
import { assertNoPii } from "./pseudonym.js";
import { AgentError } from "./types.js";

/**
 * Deterministic, hash-based assignment. There is deliberately no function that takes a unit and an
 * arm: nobody, including the agent, can place a unit into an arm by hand.
 */
export type Arm = "control" | "treatment";

export interface Allocation {
  control: number;
  treatment: number;
}

export function validateAllocation(allocation: Allocation): void {
  const { control, treatment } = allocation;
  if (!(control > 0) || !(treatment > 0) || Math.abs(control + treatment - 1) > 1e-9) {
    throw new AgentError("ALLOCATION_INVALID", "control and treatment weights must be positive and sum to 1");
  }
}

export function assignArm(unitRef: string, experimentId: string, salt: string, allocation: Allocation): Arm {
  validateAllocation(allocation);
  if (typeof unitRef !== "string" || unitRef === "") throw new AgentError("INVALID_INPUT", "unitRef must be a non-empty string");
  if (!salt) throw new AgentError("INVALID_INPUT", "allocation salt is required");
  assertNoPii(unitRef);
  const digest = sha256Hex(`${salt}|${experimentId}|${unitRef}`);
  const bucket = parseInt(digest.slice(0, 8), 16) / 0x1_0000_0000;
  return bucket < allocation.control ? "control" : "treatment";
}

export interface UnitWithStrata {
  arm: Arm;
  strata: Record<string, string>;
}

export interface Imbalance {
  dimension: string;
  level: string;
  n: number;
  treatment_share: number;
  overall_treatment_share: number;
  deviation: number;
}

/** Flags levels whose treatment share deviates from the overall share by more than `tolerance`. Small levels are skipped, not trusted. */
export function balanceReport(
  units: readonly UnitWithStrata[],
  dimensions: readonly string[],
  tolerance = 0.1,
  minLevelSize = 30,
): { overall_treatment_share: number; flagged: Imbalance[]; balanced: boolean } {
  const total = units.length;
  if (total === 0) throw new AgentError("MISSING_DATA", "no units to check");
  const overall = units.filter((u) => u.arm === "treatment").length / total;
  const flagged: Imbalance[] = [];
  for (const dimension of dimensions) {
    const levels = new Map<string, { n: number; treatment: number }>();
    for (const u of units) {
      const level = u.strata[dimension] ?? "UNKNOWN";
      const acc = levels.get(level) ?? { n: 0, treatment: 0 };
      acc.n += 1;
      if (u.arm === "treatment") acc.treatment += 1;
      levels.set(level, acc);
    }
    for (const [level, acc] of levels) {
      if (acc.n < minLevelSize) continue;
      const share = acc.treatment / acc.n;
      const deviation = Math.abs(share - overall);
      if (deviation > tolerance) {
        flagged.push({
          dimension,
          level,
          n: acc.n,
          treatment_share: Math.round(share * 1e4) / 1e4,
          overall_treatment_share: Math.round(overall * 1e4) / 1e4,
          deviation: Math.round(deviation * 1e4) / 1e4,
        });
      }
    }
  }
  return { overall_treatment_share: Math.round(overall * 1e4) / 1e4, flagged, balanced: flagged.length === 0 };
}
