import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  enabled: vi.fn(),
  checkAiRateLimit: vi.fn(),
  spendForAction: vi.fn(),
  saveGeneration: vi.fn(),
  logAiAction: vi.fn(),
  user: { id: "user-1" } as { id: string } | null,
  agencyId: "agency-A" as string | null,
  propertyRow: null as { id: string; images: unknown; agency_id: string } | null,
}));

vi.mock("@/lib/ai/listing-from-photos-flag", () => ({
  isListingFromPhotosEnabled: () => mocks.enabled(),
}));
vi.mock("@/lib/ai/rate-guard", () => ({
  checkAiRateLimit: (...a: unknown[]) => mocks.checkAiRateLimit(...a),
}));
vi.mock("@/lib/credits/spend-for-action", () => ({
  spendForAction: (...a: unknown[]) => mocks.spendForAction(...a),
}));
vi.mock("@/lib/listings/generations-store", () => ({
  saveGeneration: (...a: unknown[]) => mocks.saveGeneration(...a),
}));
vi.mock("@/lib/ai-action-audit", () => ({
  logAiAction: (...a: unknown[]) => mocks.logAiAction(...a),
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: mocks.user } }) },
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: mocks.agencyId ? { agency_id: mocks.agencyId } : null }),
        }),
      }),
    }),
  }),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createServiceRoleClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: mocks.propertyRow,
              error: mocks.propertyRow ? null : { message: "missing" },
            }),
          }),
        }),
      }),
    }),
  }),
}));

import { POST } from "../route";

const TINY_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

const property = {
  type: "3-izbový byt",
  location: "Prešov",
  price: 149000,
  size_m2: 72,
  condition: "po rekonštrukcii",
  features: ["balkón"],
};

function post(body: unknown) {
  return POST(
    new Request("http://localhost/api/ai/listing-from-photos", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

describe("POST /api/ai/listing-from-photos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.LISTING_VISION_PROVIDER = "mock";
    mocks.enabled.mockReturnValue(true);
    mocks.user = { id: "user-1" };
    mocks.agencyId = "agency-A";
    mocks.propertyRow = null;
    mocks.checkAiRateLimit.mockResolvedValue(null);
    mocks.spendForAction.mockResolvedValue({ allowed: true, cost: 1, charged: false, reason: "disabled" });
    mocks.saveGeneration.mockResolvedValue({ ok: true, id: "gen-1" });
    mocks.logAiAction.mockResolvedValue(undefined);
  });

  it("returns 404 when the flag is off", async () => {
    mocks.enabled.mockReturnValue(false);
    const res = await post({ property, photos: [{ type: "data_url", dataUrl: TINY_PNG }] });
    expect(res.status).toBe(404);
    expect(mocks.spendForAction).not.toHaveBeenCalled();
  });

  it("returns 401 without a session", async () => {
    mocks.user = null;
    const res = await post({ property, photos: [{ type: "data_url", dataUrl: TINY_PNG }] });
    expect(res.status).toBe(401);
  });

  it("returns 403 without agency_id", async () => {
    mocks.agencyId = null;
    const res = await post({ property, photos: [{ type: "data_url", dataUrl: TINY_PNG }] });
    expect(res.status).toBe(403);
    expect(mocks.spendForAction).not.toHaveBeenCalled();
  });

  it("rejects a tenant URL that is not on the agency property", async () => {
    mocks.propertyRow = {
      id: "prop-1",
      agency_id: "agency-A",
      images: ["https://cdn.example.test/ours.jpg"],
    };
    const res = await post({
      property,
      propertyId: "prop-1",
      photos: [{ type: "url", url: "https://cdn.example.test/foreign.jpg" }],
    });
    expect(res.status).toBe(403);
    expect(mocks.spendForAction).not.toHaveBeenCalled();
  });

  it("returns 402 when credits are enforced and missing", async () => {
    mocks.spendForAction.mockResolvedValue({
      allowed: false,
      cost: 1,
      charged: false,
      reason: "insufficient",
    });
    const res = await post({ property, photos: [{ type: "data_url", dataUrl: TINY_PNG }] });
    expect(res.status).toBe(402);
    expect(mocks.saveGeneration).not.toHaveBeenCalled();
  });

  it("returns listing JSON and deducts listingDescription credits", async () => {
    const res = await post({
      property,
      persona: "GENERAL",
      photos: [{ type: "data_url", dataUrl: TINY_PNG }],
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.content.portal_text).toContain("Mock");
    expect(json.generationId).toBe("gen-1");
    expect(mocks.spendForAction).toHaveBeenCalledWith(
      expect.objectContaining({ action: "listingDescription", agencyId: "agency-A" }),
    );
    expect(mocks.logAiAction).toHaveBeenCalledWith(
      expect.objectContaining({ action: "listing_from_photos", agencyId: "agency-A" }),
    );
  });
});
