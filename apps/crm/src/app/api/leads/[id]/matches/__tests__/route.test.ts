import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "../route";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  getUser: vi.fn(),
  listMatches: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("@/lib/matching-store", () => ({
  listLeadPropertyMatchesByLeadId: mocks.listMatches,
}));

const USER = { id: "auth-user-1" };
const AGENCY_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0001";
const AGENCY_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbb0002";

function supabaseWith(rows: Record<string, unknown>) {
  return {
    auth: { getUser: mocks.getUser },
    from: (table: string) => ({
      select: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: rows[table] ?? null }) }),
      }),
    }),
  };
}

const params = Promise.resolve({ id: "lead-1" });
const request = new Request("http://localhost/api/leads/lead-1/matches");

describe("GET /api/leads/[id]/matches — tenant brana", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUser.mockResolvedValue({ data: { user: USER } });
    mocks.listMatches.mockResolvedValue([{ propertyId: "p-1", score: 90 }]);
  });

  it("volajuci BEZ agentury nedostane matche ziadneho leadu", async () => {
    mocks.createClient.mockResolvedValue(
      supabaseWith({ profiles: { agency_id: null }, leads: { agency_id: AGENCY_B } }),
    );

    const res = await GET(request, { params });

    expect(res.status).toBe(403);
    expect(mocks.listMatches).not.toHaveBeenCalled();
  });

  it("volajuci bez profiloveho riadku nedostane matche ziadneho leadu", async () => {
    mocks.createClient.mockResolvedValue(
      supabaseWith({ profiles: null, leads: { agency_id: AGENCY_B } }),
    );

    const res = await GET(request, { params });

    expect(res.status).toBe(403);
    expect(mocks.listMatches).not.toHaveBeenCalled();
  });

  it("volajuci s agenturou stale nedostane matche cudzieho leadu", async () => {
    mocks.createClient.mockResolvedValue(
      supabaseWith({ profiles: { agency_id: AGENCY_A }, leads: { agency_id: AGENCY_B } }),
    );

    const res = await GET(request, { params });

    expect(res.status).toBe(403);
    expect(mocks.listMatches).not.toHaveBeenCalled();
  });

  it("volajuci dostane matche vlastneho leadu", async () => {
    mocks.createClient.mockResolvedValue(
      supabaseWith({ profiles: { agency_id: AGENCY_A }, leads: { agency_id: AGENCY_A } }),
    );

    const res = await GET(request, { params });

    expect(res.status).toBe(200);
    expect(mocks.listMatches).toHaveBeenCalledTimes(1);
  });
});
