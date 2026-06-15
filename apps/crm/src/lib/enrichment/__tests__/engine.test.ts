import { describe, expect, it } from "vitest";

import { enrichRecordWaterfall } from "@/lib/enrichment/engine";
import { normalizePhone } from "@/lib/import/contacts-import-core";

describe("enrichment waterfall", () => {
  it("falls back to second provider when first returns null", async () => {
    const first = {
      name: "first",
      canHandle: (field: string) => field === "email",
      fetch: async () => null,
    };
    const second = {
      name: "second",
      canHandle: (field: string) => field === "email",
      fetch: async () => ({ source: "second", value: "resolved@example.com" }),
    };

    const result = await enrichRecordWaterfall({
      record: {
        id: "contact-1",
        agencyId: "agency-1",
        type: "contact",
        data: { email: "raw@example.com" },
      },
      providers: [first, second],
      fields: ["email"],
      persistAudit: false,
    });

    expect(result.enrichedRecord.email).toBe("resolved@example.com");
    expect(result.audit).toHaveLength(1);
    expect(result.audit[0]?.source).toBe("second");
  });
});

describe("phone normalization", () => {
  it("normalizes SK local numbers into E.164", () => {
    const out = normalizePhone("0903123456");
    expect(out.phone).toBe("+421903123456");
    expect(out.status).toBe("sk");
  });

  it("keeps international numbers without corruption", () => {
    const out = normalizePhone("+49 151 234 5678");
    expect(out.phone).toBe("+491512345678");
    expect(out.status).toBe("intl");
  });
});
