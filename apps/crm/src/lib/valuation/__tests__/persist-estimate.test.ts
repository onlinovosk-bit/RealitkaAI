import { describe, expect, it, vi } from "vitest";
import {
  buildValuationEstimateInsert,
  persistValuationEstimate,
  resolveAgencySlugFromReferer,
} from "@/lib/valuation/persist-estimate";

describe("resolveAgencySlugFromReferer", () => {
  it("parses /odhad/{slug} paths", () => {
    expect(resolveAgencySlugFromReferer("https://app.revolis.ai/odhad/demo")).toBe("demo");
    expect(resolveAgencySlugFromReferer("https://app.revolis.ai/odhad/reality-smolko/")).toBe(
      "reality-smolko",
    );
  });

  it("returns null for unrelated referers", () => {
    expect(resolveAgencySlugFromReferer("https://app.revolis.ai/dashboard")).toBeNull();
    expect(resolveAgencySlugFromReferer(null)).toBeNull();
  });
});

describe("buildValuationEstimateInsert", () => {
  it("maps property input and estimate band with midpoint", () => {
    const row = buildValuationEstimateInsert({
      agencyId: "22222222-2222-2222-2222-222222222222",
      isSandbox: true,
      sessionId: "session-preview-001",
      property: {
        propertyType: "byt",
        location: "Košice",
        postalCode: "04001",
        sqm: 75,
        rooms: 3,
        floor: 2,
        totalFloors: 8,
        yearBuilt: 1990,
      },
      estimate: {
        noEstimate: false,
        low: 100_000,
        high: 120_000,
        currency: "EUR",
        sourceQuarter: "2026-Q1",
        commentary: "test",
        disclaimer: "test",
      },
    });

    expect(row.agency_id).toBe("22222222-2222-2222-2222-222222222222");
    expect(row.is_sandbox).toBe(true);
    expect(row.session_id).toBe("session-preview-001");
    expect(row.postal_code).toBe("04001");
    expect(row.estimate_min).toBe(100_000);
    expect(row.estimate_max).toBe(120_000);
    expect(row.estimate_mid).toBe(110_000);
    expect(row.price_data_version).toBe("2026-Q1");
    expect(row.lead_id).toBeNull();
  });

  it("leaves band columns null when no estimate", () => {
    const row = buildValuationEstimateInsert({
      agencyId: "11111111-1111-1111-1111-111111111111",
      isSandbox: false,
      property: {
        propertyType: "dom",
        location: "Unknown",
        sqm: 120,
      },
      estimate: {
        noEstimate: true,
        currency: "EUR",
        commentary: "no data",
        disclaimer: "disclaimer",
      },
    });

    expect(row.estimate_min).toBeNull();
    expect(row.estimate_mid).toBeNull();
    expect(row.estimate_max).toBeNull();
  });
});

describe("persistValuationEstimate", () => {
  it("returns ok when insert succeeds", async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    const supabase = { from: vi.fn().mockReturnValue({ insert }) } as never;

    const row = buildValuationEstimateInsert({
      agencyId: "22222222-2222-2222-2222-222222222222",
      isSandbox: true,
      property: { propertyType: "byt", location: "Košice", sqm: 75 },
      estimate: {
        noEstimate: false,
        low: 100_000,
        high: 120_000,
        currency: "EUR",
        commentary: "test",
        disclaimer: "test",
      },
    });

    const result = await persistValuationEstimate(supabase, row);
    expect(result.ok).toBe(true);
    expect(insert).toHaveBeenCalledWith(row);
  });

  it("surfaces insert errors without throwing", async () => {
    const insert = vi.fn().mockResolvedValue({ error: { message: "relation missing" } });
    const supabase = { from: vi.fn().mockReturnValue({ insert }) } as never;

    const row = buildValuationEstimateInsert({
      agencyId: "22222222-2222-2222-2222-222222222222",
      isSandbox: true,
      property: { propertyType: "byt", location: "Košice", sqm: 75 },
      estimate: {
        noEstimate: true,
        currency: "EUR",
        commentary: "test",
        disclaimer: "test",
      },
    });

    const result = await persistValuationEstimate(supabase, row);
    expect(result.ok).toBe(false);
    expect(result.error).toBe("relation missing");
  });
});
