import { beforeEach, describe, expect, it, vi } from "vitest";
import { PATCH } from "../route";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  getUser: vi.fn(),
  updateTeam: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("@/lib/team-store", () => ({ updateTeam: mocks.updateTeam }));

const USER = { id: "auth-user-1" };
const AGENCY_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0001";
const AGENCY_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbb0002";

/** Supabase stub kde kazda tabulka vracia vlastny riadok. */
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

function patchRequest() {
  return new Request("http://localhost/api/team/teams/team-1", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Prepisany tim" }),
  });
}

const params = Promise.resolve({ id: "team-1" });

describe("PATCH /api/team/teams/[id] — tenant brana", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUser.mockResolvedValue({ data: { user: USER } });
    mocks.updateTeam.mockResolvedValue({ id: "team-1", name: "Prepisany tim" });
  });

  it("volajuci BEZ agentury nemoze upravit ziadny tim", async () => {
    mocks.createClient.mockResolvedValue(
      supabaseWith({ profiles: { agency_id: null }, teams: { agency_id: AGENCY_B } }),
    );

    const res = await PATCH(patchRequest(), { params });

    expect(res.status).toBe(403);
    expect(mocks.updateTeam).not.toHaveBeenCalled();
  });

  it("volajuci bez profiloveho riadku nemoze upravit ziadny tim", async () => {
    mocks.createClient.mockResolvedValue(
      supabaseWith({ profiles: null, teams: { agency_id: AGENCY_B } }),
    );

    const res = await PATCH(patchRequest(), { params });

    expect(res.status).toBe(403);
    expect(mocks.updateTeam).not.toHaveBeenCalled();
  });

  it("volajuci s agenturou stale nemoze upravit tim inej agentury", async () => {
    mocks.createClient.mockResolvedValue(
      supabaseWith({ profiles: { agency_id: AGENCY_A }, teams: { agency_id: AGENCY_B } }),
    );

    const res = await PATCH(patchRequest(), { params });

    expect(res.status).toBe(403);
    expect(mocks.updateTeam).not.toHaveBeenCalled();
  });

  it("volajuci upravujuci tim vlastnej agentury prejde", async () => {
    mocks.createClient.mockResolvedValue(
      supabaseWith({ profiles: { agency_id: AGENCY_A }, teams: { agency_id: AGENCY_A } }),
    );

    const res = await PATCH(patchRequest(), { params });

    expect(res.status).toBe(200);
    expect(mocks.updateTeam).toHaveBeenCalledTimes(1);
  });
});
