import { createHash } from "node:crypto";

import type { ValuationEstimateResult } from "@/lib/valuation/types";

export type SandboxSubmissionPayload = {
  propertyType: string;
  location: string;
  sqm: number;
  rooms?: number;
  condition?: string;
  sellWithin12Months: boolean;
  abVariant?: string;
  sessionId?: string;
  estimate?: {
    low?: number;
    high?: number;
    noEstimate: boolean;
    regionCode?: string;
  };
};

export function hashClientIp(ip: string): string {
  return createHash("sha256").update(`valuation-sandbox:${ip}`).digest("hex").slice(0, 32);
}

/** Stats-only payload — never store name/email/phone. */
export function buildSandboxSubmissionPayload(input: {
  propertyType: string;
  location: string;
  sqm: number;
  rooms?: number;
  condition?: string;
  sellWithin12Months: boolean;
  abVariant?: string;
  sessionId?: string;
  estimate?: ValuationEstimateResult;
}): SandboxSubmissionPayload {
  return {
    propertyType: input.propertyType,
    location: input.location.slice(0, 200),
    sqm: input.sqm,
    rooms: input.rooms,
    condition: input.condition,
    sellWithin12Months: input.sellWithin12Months,
    abVariant: input.abVariant,
    sessionId: input.sessionId?.slice(0, 64),
    estimate: input.estimate
      ? {
          low: input.estimate.low,
          high: input.estimate.high,
          noEstimate: input.estimate.noEstimate,
          regionCode: input.estimate.regionCode,
        }
      : undefined,
  };
}
