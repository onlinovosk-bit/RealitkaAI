import { describe, expect, it, vi } from "vitest";

describe("persistUcListing tenant scope", () => {
  it("queries properties with agency_id + source_system + source_id", async () => {
    const eqCalls: Array<[string, string]> = [];
    const builder = {
      select: vi.fn(() => builder),
      eq: vi.fn((col: string, val: string) => {
        eqCalls.push([col, val]);
        return builder;
      }),
      maybeSingle: vi.fn(async () => ({ data: { id: "uc:784691" }, error: null })),
      update: vi.fn(() => ({
        eq: vi.fn(async () => ({ error: null })),
      })),
    };

    vi.doMock("@/lib/supabase/admin", () => ({
      createServiceRoleClient: () => ({
        from: (table: string) => {
          expect(table).toBe("properties");
          return builder;
        },
      }),
    }));

    vi.resetModules();
    const { persistUcListing } = await import("@/lib/uc/persist");
    const { UC_DOC_LISTING_SAMPLE } = await import("@/lib/uc/fixtures");
    const { mapUcListingPayload } = await import("@/lib/uc/mapper-listing");

    const agencyId = "a0000001-0001-4001-8001-000000000001";
    await persistUcListing(agencyId, mapUcListingPayload({ ...UC_DOC_LISTING_SAMPLE }));

    expect(eqCalls).toContainEqual(["agency_id", agencyId]);
    expect(eqCalls).toContainEqual(["source_system", "uc"]);
    expect(eqCalls).toContainEqual(["source_id", "784691"]);
  });
});
