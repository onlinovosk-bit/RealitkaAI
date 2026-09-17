import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "../route";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  createAdminClient: vi.fn(),
  getUser: vi.fn(),
  profileMaybeSingle: vi.fn(),
  inviteUserByEmail: vi.fn(),
  profilesUpsert: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: mocks.createClient,
  createAdminClient: mocks.createAdminClient,
}));

const OWNER = { id: "owner-auth-1", email: "owner@agency.sk" };
const AGENCY_ID = "11111111-1111-1111-1111-111111111111";

function inviteRequest(body: Record<string, unknown>) {
  return new Request("http://localhost/api/invite", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/invite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUser.mockResolvedValue({ data: { user: OWNER } });
    mocks.profileMaybeSingle.mockResolvedValue({
      data: { role: "owner", agency_id: AGENCY_ID },
    });
    mocks.createClient.mockResolvedValue({
      auth: { getUser: mocks.getUser },
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: mocks.profileMaybeSingle,
          }),
        }),
      }),
    });
    mocks.inviteUserByEmail.mockResolvedValue({
      data: { user: { id: "invitee-auth-1" } },
      error: null,
    });
    mocks.profilesUpsert.mockResolvedValue({ error: null });
    mocks.createAdminClient.mockReturnValue({
      auth: { admin: { inviteUserByEmail: mocks.inviteUserByEmail } },
      from: () => ({
        upsert: mocks.profilesUpsert,
      }),
    });
  });

  it("returns 401 when unauthenticated", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null } });
    const res = await POST(inviteRequest({ email: "a@b.sk", fullName: "A" }));
    expect(res.status).toBe(401);
    expect(mocks.inviteUserByEmail).not.toHaveBeenCalled();
  });

  it("returns 403 when caller has no agency_id", async () => {
    mocks.profileMaybeSingle.mockResolvedValue({
      data: { role: "owner", agency_id: null },
    });
    const res = await POST(
      inviteRequest({ email: "agent@agency.sk", fullName: "Agent" }),
    );
    expect(res.status).toBe(403);
    expect(mocks.inviteUserByEmail).not.toHaveBeenCalled();
  });

  it("stamps agency_id and auth_user_id on the invitee profile", async () => {
    const res = await POST(
      inviteRequest({
        email: "agent@agency.sk",
        fullName: "Nový Maklér",
        role: "agent",
      }),
    );

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true });
    expect(mocks.inviteUserByEmail).toHaveBeenCalledWith(
      "agent@agency.sk",
      expect.objectContaining({
        data: expect.objectContaining({
          agency_id: AGENCY_ID,
          role: "agent",
        }),
      }),
    );
    expect(mocks.profilesUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "invitee-auth-1",
        auth_user_id: "invitee-auth-1",
        agency_id: AGENCY_ID,
        email: "agent@agency.sk",
        full_name: "Nový Maklér",
        role: "agent",
        is_active: true,
      }),
      { onConflict: "id" },
    );
  });

  it("rejects privilege-escalation roles and falls back to agent", async () => {
    const res = await POST(
      inviteRequest({
        email: "evil@agency.sk",
        fullName: "Evil",
        role: "founder",
      }),
    );

    expect(res.status).toBe(200);
    expect(mocks.profilesUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ role: "agent" }),
      { onConflict: "id" },
    );
  });
});
