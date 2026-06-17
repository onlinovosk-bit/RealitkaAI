import { mapUcAgentPayload } from "@/lib/uc/mapper-agent";
import { mapUcListingPayload } from "@/lib/uc/mapper-listing";
import type { RealsoftAction } from "@/lib/realsoft/payload";
import { isRecord } from "@/lib/uc/shared";

export class RealsoftSampleRequiredError extends Error {
  constructor(action: RealsoftAction) {
    super(
      `RealSoft mapper for action=${action} is blocked: real payload sample is required before field mapping.`,
    );
    this.name = "RealsoftSampleRequiredError";
  }
}

export type RealsoftMappingResult = {
  action: RealsoftAction;
  normalizedPhones: string[];
  unmapped: Record<string, unknown>;
};

/** Back-compat wrapper — delegates to documented UC mappers (Brief 14). */
export function mapRealsoftPayload(
  action: RealsoftAction,
  data: unknown,
): RealsoftMappingResult {
  if (!isRecord(data)) {
    throw new RealsoftSampleRequiredError(action);
  }

  if (action === 2) {
    const mapped = mapUcAgentPayload(data);
    return {
      action,
      normalizedPhones: mapped.phone ? [mapped.phone] : [],
      unmapped: mapped.raw,
    };
  }

  const mapped = mapUcListingPayload(data);
  return {
    action,
    normalizedPhones: [],
    unmapped: mapped.raw,
  };
}
