import { beforeEach, describe, expect, it, vi } from "vitest";

const CALLER_AGENCY = "aaaaaaaa-0000-0000-0000-000000000001";
const OTHER_AGENCY = "bbbbbbbb-0000-0000-0000-000000000002";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  callerProfile: vi.fn(),
  createTeam: vi.fn(),
  createActivity: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: mocks.getUser },
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: mocks.callerProfile }),
      }),
    }),
  }),
}));

vi.mock("@/lib/team-store", () => ({
  createTeam: mocks.createTeam,
  listTeams: vi.fn(),
}));

vi.mock("@/lib/activities-store", () => ({
  createActivity: mocks.createActivity,
}));

const post = async (body: Record<string, unknown>) => {
  const { POST } = await import("../route");
  return POST(
    new Request("http://localhost/api/team/teams", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getUser.mockResolvedValue({ data: { user: { id: "auth-1" } } });
  mocks.callerProfile.mockResolvedValue({
    data: { role: "owner", agency_id: CALLER_AGENCY },
  });
  mocks.createTeam.mockResolvedValue({ id: "team-1", name: "Predaj" });
  mocks.createActivity.mockResolvedValue(undefined);
});

describe("POST /api/team/teams — authz + agency stamp", () => {
  it("agent cannot create a team", async () => {
    mocks.callerProfile.mockResolvedValue({
      data: { role: "agent", agency_id: CALLER_AGENCY },
    });

    const res = await post({ name: "Hack", agencyId: OTHER_AGENCY });

    expect(res.status).toBe(403);
    expect(mocks.createTeam).not.toHaveBeenCalled();
  });

  it("ignores body.agencyId and stamps caller agency", async () => {
    const res = await post({ name: "Predaj", agencyId: OTHER_AGENCY });

    expect(res.status).toBe(200);
    expect(mocks.createTeam).toHaveBeenCalledWith(
      expect.objectContaining({ agencyId: CALLER_AGENCY, name: "Predaj" }),
      expect.anything(),
    );
  });

  it("owner without agency is refused even if body.agencyId is set", async () => {
    mocks.callerProfile.mockResolvedValue({
      data: { role: "owner", agency_id: null },
    });

    const res = await post({ name: "Predaj", agencyId: OTHER_AGENCY });

    expect(res.status).toBe(403);
    expect(mocks.createTeam).not.toHaveBeenCalled();
  });
});
