import { describe, expect, it } from "vitest";
import {
  RealsoftSampleRequiredError,
  mapRealsoftPayload,
} from "@/lib/realsoft/mapper";
import { extractExternalIdFromConfiguredPath } from "@/lib/realsoft/payload";

describe("realsoft mapper guardrails", () => {
  it("throws explicit TODO error when real sample is not enabled", () => {
    process.env.REALSOFT_SAMPLE_READY = "0";

    expect(() => mapRealsoftPayload(1, { anything: "value" })).toThrowError(
      RealsoftSampleRequiredError,
    );
  });

  it("extracts external id only from configured path", () => {
    process.env.REALSOFT_EXTERNAL_ID_PATH_ACTION_1 = "order.id";

    const externalId = extractExternalIdFromConfiguredPath(1, {
      order: { id: "RS-123" },
    });

    expect(externalId).toBe("RS-123");
  });
});

