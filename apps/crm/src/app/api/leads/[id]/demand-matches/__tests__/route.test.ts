import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  profile: vi.fn(),
  lead: vi.fn(),
  demand: vi.fn(),
  matches: vi.fn(),
  matchesQueried: vi.fn(),
  metric: vi.fn(),
}));

vi.mock("@/lib/usage-metrics", () => ({
  incrementUsageMetric: (...args: unknown[]) => mocks.metric(...args),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: () => mocks.getUser() },
    from: (table: string) => {
      if (table === "profiles") return { select: () => ({ eq: () => ({ maybeSingle: () => mocks.profile() }) }) };
      if (table === "leads") return { select: () => ({ eq: () => ({ maybeSingle: () => mocks.lead() }) }) };
      if (table === "lead_demands") {
        return {
          select: () => ({ eq: () => ({ order: () => ({ limit: () => ({ maybeSingle: () => mocks.demand() }) }) }) }),
        };
      }
      if (table === "demand_property_matches") {
        return {
          select: () => ({
            eq: (_col: string, recordId: string) => ({
              order: () => { mocks.matchesQueried(recordId); return mocks.matches(); },
            }),
          }),
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
  }),
}));

import { GET } from "../route";

const params = () => ({ params: Promise.resolve({ id: "lead-1" }) });
const ev = (value: unknown, evidence: string) => ({ value, confidence: 1, source: "inquiry_text", evidence });
const U = { value: null, confidence: 0, source: null, evidence: null };
const FULL = {
  property_type: ev("byt", "byt"), location: ev("Petržalke", "v Petržalke"), budget_max: U, budget_min: U,
  rooms_min: U, rooms_max: U, area_min: U, area_max: U, disposition: U, urgency: U, financing: U,
};

describe("GET /api/leads/[id]/demand-matches", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    mocks.profile.mockResolvedValue({ data: { agency_id: "A" } });
    mocks.lead.mockResolvedValue({ data: { agency_id: "A" } });
  });

  it("401 without a user", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null } });
    expect((await GET(new Request("http://x"), params())).status).toBe(401);
  });

  it("403 for another agency's lead", async () => {
    mocks.lead.mockResolvedValue({ data: { agency_id: "B" } });
    expect((await GET(new Request("http://x"), params())).status).toBe(403);
  });

  it("no demand record → no_demand, matches never queried", async () => {
    mocks.demand.mockResolvedValue({ data: null });
    const body = await (await GET(new Request("http://x"), params())).json();
    expect(body).toMatchObject({ ok: true, demand: null, matches: [], reason: "no_demand" });
    expect(mocks.matchesQueried).not.toHaveBeenCalled();
    expect(mocks.metric).not.toHaveBeenCalled();
  });

  it("failed extraction or too little demand → reason, no matches", async () => {
    mocks.demand.mockResolvedValue({ data: { id: "d1", status: "llm_error", demand: FULL } });
    expect((await (await GET(new Request("http://x"), params())).json()).reason).toBe("extraction_llm_error");
    mocks.demand.mockResolvedValue({ data: { id: "d1", status: "ok", demand: { ...FULL, location: U } } });
    expect((await (await GET(new Request("http://x"), params())).json()).reason).toBe("insufficient_demand");
    expect(mocks.matchesQueried).not.toHaveBeenCalled();
  });

  it("returns only matches of the CURRENT demand record", async () => {
    mocks.demand.mockResolvedValue({ data: { id: "d-latest", status: "ok", demand: FULL } });
    mocks.matches.mockResolvedValue({ data: [{ property_id: "p1", score: 1, fields: {} }], error: null });
    const body = await (await GET(new Request("http://x"), params())).json();
    expect(mocks.matchesQueried).toHaveBeenCalledWith("d-latest");
    expect(body.matches).toHaveLength(1);
    // the funnel's "opened" step is counted only when matches were shown
    expect(mocks.metric).toHaveBeenCalledWith({ agencyId: "A", metric: "demand_matches_view" });
  });

  it("no matches shown → nothing counted", async () => {
    mocks.demand.mockResolvedValue({ data: { id: "d1", status: "ok", demand: FULL } });
    mocks.matches.mockResolvedValue({ data: [], error: null });
    await GET(new Request("http://x"), params());
    expect(mocks.metric).not.toHaveBeenCalled();
  });
});
