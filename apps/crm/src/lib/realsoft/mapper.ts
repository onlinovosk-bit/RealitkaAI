import { normalizePhone } from "@/lib/import/contacts-import-core";
import type { RealsoftAction } from "@/lib/realsoft/payload";

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

/**
 * Brief-10 hard rule:
 * - no inferred schema without real payload fixture
 * - keep mapper as explicit TODO skeleton until fixture is provided
 */
export function mapRealsoftPayload(
  action: RealsoftAction,
  data: unknown,
): RealsoftMappingResult {
  const sampleReady =
    process.env.REALSOFT_SAMPLE_READY === "1" || process.env.REALSOFT_SAMPLE_READY === "true";
  if (!sampleReady) {
    throw new RealsoftSampleRequiredError(action);
  }

  const normalizedPhones: string[] = [];
  if (typeof data === "string") {
    const candidate = normalizePhone(data);
    if (candidate.phone) normalizedPhones.push(candidate.phone);
  }

  return {
    action,
    normalizedPhones,
    unmapped: {},
  };
}

