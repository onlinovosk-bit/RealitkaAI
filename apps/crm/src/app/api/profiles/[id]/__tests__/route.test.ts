import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, PATCH } from "../route";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  createAdminClient: vi.fn(),
  getUser: vi.fn(),
  getProfileById: vi.fn(),
  updateProfile: vi.fn(),
  maybeSingle: vi.fn(),
  adminUpdateEq: vi.fn(),
  adminSelect: vi.fn(),
  adminSingle: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: mocks.createClient,
  createAdminClient: mocks.createAdminClient,
}));

vi.mock("@/lib/team-store", () => ({
  getProfileById: mocks.getProfileById,
  updateProfile: mocks.updateProfile,
}));

const USER = { id: "user-agent" };
const AGENCY = "agency-a";

function patchRequest(body: Record<string, unknown>) {
  return new Request("http://localhost/api/profiles/target-1", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("/api/profiles/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUser.mockResolvedValue({ data: { user: USER } });
    mocks.maybeSingle.mockResolvedValue({
      data: { agency_id: AGENCY, role: "agent" },
    });
    mocks.createClient.mockResolvedValue({
      auth: { getUser: mocks.getUser },
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: mocks.maybeSingle,
          }),
        }),
      }),
    });
    mocks.adminSingle.mockResolvedValue({
      data: {
        id: "target-1",
        agency_id: AGENCY,
        team_id: null,
        full_name: "Target",
        email: "t@example.com",
        role: "owner",
        phone: null,
        is_active: true,
      },
      error: null,
    });
    mocks.adminSelect.mockReturnValue({ single: mocks.adminSingle });
    mocks.adminUpdateEq.mockReturnValue({ select: mocks.adminSelect });
    mocks.createAdminClient.mockReturnValue({
      from: () => ({
        update: () => ({
          eq: mocks.adminUpdateEq,
        }),
      }),
    });
  });

  it("GET fail-closed when caller has no agency_id", async () => {
    mocks.maybeSingle.mockResolvedValue({ data: { agency_id: null, role: "agent" } });
    mocks.getProfileById.mockResolvedValue({
      id: "other",
      agencyId: "agency-b",
      fullName: "Other",
    });

    const res = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ id: "other" }),
    });
    expect(res.status).toBe(403);
  });

  it("PATCH refuses role change for non-owner", async () => {
    mocks.getProfileById.mockResolvedValue({
      id: "target-1",
      agencyId: AGENCY,
    });

    const res = await PATCH(patchRequest({ role: "owner" }), {
      params: Promise.resolve({ id: "target-1" }),
    });
    expect(res.status).toBe(403);
    expect(mocks.createAdminClient).not.toHaveBeenCalled();
  });

  it("PATCH refuses self role change even for owner", async () => {
    mocks.maybeSingle.mockResolvedValue({
      data: { agency_id: AGENCY, role: "owner" },
    });

    const res = await PATCH(patchRequest({ role: "founder" }), {
      params: Promise.resolve({ id: USER.id }),
    });
    expect(res.status).toBe(403);
  });

  it("PATCH allows owner to change teammate role via admin client", async () => {
    mocks.maybeSingle.mockResolvedValue({
      data: { agency_id: AGENCY, role: "owner" },
    });
    mocks.getProfileById.mockResolvedValue({
      id: "target-1",
      agencyId: AGENCY,
    });

    const res = await PATCH(patchRequest({ role: "manager" }), {
      params: Promise.resolve({ id: "target-1" }),
    });
    expect(res.status).toBe(200);
    expect(mocks.createAdminClient).toHaveBeenCalled();
    expect(mocks.updateProfile).not.toHaveBeenCalled();
  });
});
