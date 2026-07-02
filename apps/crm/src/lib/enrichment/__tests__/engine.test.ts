import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { enrichRecordWaterfall } from "@/lib/enrichment/engine";
import { finstatOrsrProvider } from "@/lib/enrichment/providers";
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

describe("data quality enrichment fields", () => {
  it("adds invalid quality flags for missing email and phone", async () => {
    const result = await enrichRecordWaterfall({
      record: {
        id: "lead-1",
        agencyId: "agency-1",
        type: "lead",
        data: { phone: "", email: "" },
      },
      fields: ["phone_quality", "email_quality"],
      persistAudit: false,
    });

    expect(result.enrichedRecord.phone_quality).toMatchObject({
      valid: false,
      reason: "missing_or_invalid_phone",
    });
    expect(result.enrichedRecord.email_quality).toMatchObject({
      valid: false,
      reason: "missing_or_invalid_email",
    });
    expect(result.audit).toHaveLength(2);
  });
});

describe("RPO provider", () => {
  it("maps a real RPO V2 fixture for company profile", async () => {
    const fixture = JSON.parse(
      readFileSync(
        join(process.cwd(), "src/lib/enrichment/__tests__/fixtures/rpo2-organization-50158635.json"),
        "utf8",
      ),
    );
    const originalFetch = global.fetch;
    global.fetch = (async () =>
      new Response(JSON.stringify(fixture), {
        status: 200,
        headers: { "content-type": "application/json" },
      })) as typeof fetch;

    try {
      const result = await finstatOrsrProvider.fetch({
        field: "company_profile",
        record: {
          id: "lead-company-1",
          agencyId: "agency-1",
          type: "lead",
          data: { ico: "50158635", company_name: "Slovensko.Digital" },
        },
      });

      expect(result?.source).toBe("rpo-v2");
      expect(result?.value).toMatchObject({
        source: "rpo-v2",
        license: "CC BY 4.0",
        ico: "50158635",
        company_name: "Slovensko.Digital",
      });
    } finally {
      global.fetch = originalFetch;
    }
  });
});
