import { describe, expect, it } from "vitest";
import { buildLeadConsentInsert } from "@/lib/valuation/consent-mapper";
import { PRIVACY_POLICY_VERSION } from "@/lib/valuation/config";
import { buildSandboxSubmissionPayload, hashClientIp } from "@/lib/valuation/sandbox";

describe("buildSandboxSubmissionPayload", () => {
  it("omits contact fields from payload", () => {
    const payload = buildSandboxSubmissionPayload({
      propertyType: "byt",
      location: "Košice",
      sqm: 75,
      sellWithin12Months: false,
      abVariant: "B",
      sessionId: "sess-1",
      estimate: {
        noEstimate: false,
        low: 223000,
        high: 274000,
        currency: "EUR",
        commentary: "x",
        disclaimer: "y",
        regionCode: "KE",
      },
    });

    expect(payload).toMatchObject({
      propertyType: "byt",
      location: "Košice",
      sqm: 75,
      abVariant: "B",
    });
    expect(JSON.stringify(payload)).not.toContain("@");
    expect(JSON.stringify(payload)).not.toContain("0900");
  });

  it("hashes ip consistently", () => {
    expect(hashClientIp("1.2.3.4")).toHaveLength(32);
    expect(hashClientIp("1.2.3.4")).toBe(hashClientIp("1.2.3.4"));
  });
});

describe("buildLeadConsentInsert", () => {
  it("stores policy version and marketing opt-in", () => {
    const row = buildLeadConsentInsert({
      leadId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      tenantSlug: "reality-smolko",
      marketingOptIn: true,
      acknowledgedAt: "2026-07-22T10:00:00.000Z",
    });

    expect(row.lead_id).toBe("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
    expect(row.tenant_slug).toBe("reality-smolko");
    expect(row.privacy_policy_version).toBe(PRIVACY_POLICY_VERSION);
    expect(row.marketing_opt_in).toBe(true);
    expect(row.acknowledged_at).toBe("2026-07-22T10:00:00.000Z");
  });
});
