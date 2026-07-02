import { describe, expect, it } from "vitest";
import { UC_DOC_AGENT_SAMPLE, UC_DOC_LISTING_SAMPLE } from "@/lib/uc/fixtures";
import { mapRealsoftPayload } from "@/lib/realsoft/mapper";
import { extractExternalIdFromConfiguredPath } from "@/lib/realsoft/payload";

describe("realsoft mapper delegation", () => {
  it("delegates action=2 to UC agent mapper", () => {
    const mapped = mapRealsoftPayload(2, UC_DOC_AGENT_SAMPLE);
    expect(mapped.normalizedPhones).toEqual(["+421912345678"]);
    expect(mapped.unmapped).toEqual({});
  });

  it("delegates action=1 to UC listing mapper", () => {
    const mapped = mapRealsoftPayload(1, UC_DOC_LISTING_SAMPLE);
    expect(mapped.normalizedPhones).toEqual([]);
    expect(mapped.unmapped).toEqual({});
  });

  it("extracts external id from object_id/user_id by default", () => {
    delete process.env.REALSOFT_EXTERNAL_ID_PATH_ACTION_1;
    delete process.env.REALSOFT_EXTERNAL_ID_PATH_ACTION_2;

    expect(extractExternalIdFromConfiguredPath(1, UC_DOC_LISTING_SAMPLE)).toBe("784691");
    expect(extractExternalIdFromConfiguredPath(2, UC_DOC_AGENT_SAMPLE)).toBe("testImport");
  });

  it("still honors configured external id path override", () => {
    process.env.REALSOFT_EXTERNAL_ID_PATH_ACTION_1 = "order.id";

    const externalId = extractExternalIdFromConfiguredPath(1, {
      order: { id: "RS-123" },
      object_id: 1,
    });

    expect(externalId).toBe("RS-123");
  });
});
