import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  profileMaybeSingle: vi.fn(),
  leadsSelectEqIn: vi.fn(),
  leadsUpdateEqEq: vi.fn(),
  leadsInsert: vi.fn(),
  agencyFilters: [] as string[],
  updateAgencyFilters: [] as string[],
}));

vi.mock("@/lib/ai/rate-guard", () => ({
  checkAiRateLimit: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: () => mocks.getUser() },
    from: (table: string) => {
      if (table === "profiles") {
        return {
          select: () => ({ eq: () => ({ maybeSingle: () => mocks.profileMaybeSingle() }) }),
        };
      }
      if (table === "leads") {
        return {
          select: () => ({
            eq: (_col: string, agencyId: string) => {
              mocks.agencyFilters.push(agencyId);
              return {
                in: () => mocks.leadsSelectEqIn(),
              };
            },
          }),
          update: () => ({
            eq: () => ({
              eq: (_col: string, agencyId: string) => {
                mocks.updateAgencyFilters.push(agencyId);
                return mocks.leadsUpdateEqEq();
              },
            }),
          }),
          insert: (rows: unknown) => mocks.leadsInsert(rows),
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
  }),
}));

import { POST } from "../route";

const AGENCY_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

function postLeads(leads: unknown[]) {
  return POST(
    new Request("http://localhost/api/import", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ leads }),
    }),
  );
}

describe("POST /api/import agency scope", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.agencyFilters.length = 0;
    mocks.updateAgencyFilters.length = 0;
    mocks.getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mocks.leadsSelectEqIn.mockResolvedValue({ data: [], error: null });
    mocks.leadsUpdateEqEq.mockResolvedValue({ error: null });
    mocks.leadsInsert.mockResolvedValue({ error: null });
  });

  it("returns 403 when profile has no agency_id", async () => {
    mocks.profileMaybeSingle.mockResolvedValue({ data: { agency_id: null } });

    const res = await postLeads([{ name: "Anna", email: "anna@example.com" }]);

    expect(res.status).toBe(403);
    expect(mocks.leadsInsert).not.toHaveBeenCalled();
  });

  it("scopes email dedup lookup to session agency_id", async () => {
    mocks.profileMaybeSingle.mockResolvedValue({ data: { agency_id: AGENCY_A } });
    mocks.leadsSelectEqIn.mockResolvedValue({
      data: [{ id: "lead-a", email: "anna@example.com" }],
      error: null,
    });

    const res = await postLeads([
      { name: "Anna Updated", email: "anna@example.com", phone: "+421900" },
    ]);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(mocks.agencyFilters).toEqual([AGENCY_A]);
    expect(mocks.updateAgencyFilters).toEqual([AGENCY_A]);
    expect(body.updated).toBe(1);
    expect(body.imported).toBe(0);
    expect(mocks.leadsInsert).not.toHaveBeenCalled();
  });

  it("fails closed when email lookup errors (no blind insert of dupes)", async () => {
    mocks.profileMaybeSingle.mockResolvedValue({ data: { agency_id: AGENCY_A } });
    mocks.leadsSelectEqIn.mockResolvedValue({
      data: null,
      error: { message: "db down" },
    });

    const res = await postLeads([{ name: "Anna", email: "anna@example.com" }]);

    expect(res.status).toBe(500);
    expect(mocks.leadsInsert).not.toHaveBeenCalled();
  });

  it("inserts new lead with session agency_id when email is free in that agency", async () => {
    mocks.profileMaybeSingle.mockResolvedValue({ data: { agency_id: AGENCY_A } });
    mocks.leadsSelectEqIn.mockResolvedValue({ data: [], error: null });

    const res = await postLeads([{ name: "Ben", email: "ben@example.com" }]);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.imported).toBe(1);
    expect(mocks.agencyFilters).toEqual([AGENCY_A]);
    expect(mocks.leadsInsert).toHaveBeenCalledTimes(1);
    const rows = mocks.leadsInsert.mock.calls[0][0] as Array<{ agency_id: string }>;
    expect(rows[0].agency_id).toBe(AGENCY_A);
  });
});
