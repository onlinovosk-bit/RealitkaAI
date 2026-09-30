import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "../route";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  createAdminClient: vi.fn(),
  getUser: vi.fn(),
  resetPasswordForEmail: vi.fn(),
  resolveProfileForAuthUser: vi.fn(),
  generateLink: vi.fn(),
  inviteUserByEmail: vi.fn(),
  profilesUpsert: vi.fn(),
  profilesSelectMaybeSingle: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: mocks.createClient,
  createAdminClient: mocks.createAdminClient,
}));

vi.mock("@/lib/profiles/resolve-profile-for-auth", async () => {
  const actual = await vi.importActual<typeof import("@/lib/profiles/resolve-profile-for-auth")>(
    "@/lib/profiles/resolve-profile-for-auth",
  );
  return {
    ...actual,
    resolveProfileForAuthUser: mocks.resolveProfileForAuthUser,
  };
});

const USER = { id: "user-1", email: "agent@example.com" };
const OWNER = { id: "owner-1", email: "owner@example.com" };
const AGENCY_A = "agency-aaa";
const AGENCY_B = "agency-bbb";

function request(action: string, email: string, extra: Record<string, string> = {}) {
  return new Request("http://localhost/api/settings/auth-email-tests", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action, email, ...extra }),
  });
}

function mockAdminProfilesLookup(row: { id: string; agency_id: string; email: string } | null) {
  mocks.profilesSelectMaybeSingle.mockResolvedValue({ data: row, error: null });
}

describe("/api/settings/auth-email-tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUser.mockResolvedValue({ data: { user: USER } });
    mocks.resetPasswordForEmail.mockResolvedValue({ error: null });
    mocks.generateLink.mockResolvedValue({
      data: { properties: { action_link: "https://example.com/recover?token=abc" } },
      error: null,
    });
    mocks.inviteUserByEmail.mockResolvedValue({
      data: { user: { id: "invitee-1" } },
      error: null,
    });
    mocks.profilesUpsert.mockResolvedValue({ error: null });
    mocks.profilesSelectMaybeSingle.mockResolvedValue({ data: null, error: null });

    mocks.createClient.mockResolvedValue({
      auth: {
        getUser: mocks.getUser,
        resetPasswordForEmail: mocks.resetPasswordForEmail,
      },
    });

    const profilesChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      maybeSingle: mocks.profilesSelectMaybeSingle,
      upsert: mocks.profilesUpsert,
    };
    profilesChain.eq.mockImplementation(() => ({
      maybeSingle: mocks.profilesSelectMaybeSingle,
    }));
    profilesChain.ilike.mockImplementation(() => ({
      maybeSingle: mocks.profilesSelectMaybeSingle,
    }));

    mocks.createAdminClient.mockReturnValue({
      auth: {
        admin: {
          generateLink: mocks.generateLink,
          inviteUserByEmail: mocks.inviteUserByEmail,
        },
      },
      from: vi.fn(() => profilesChain),
    });

    mocks.resolveProfileForAuthUser.mockResolvedValue({
      profile: { id: "profile-1", role: "agent", ui_role: "agent", agency_id: AGENCY_A },
      profileMissingAgency: false,
    });
  });

  it("returns 401 when no user is authenticated", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null } });

    const response = await GET();

    expect(response.status).toBe(401);
    expect(mocks.resolveProfileForAuthUser).not.toHaveBeenCalled();
  });

  it("allows an authenticated non-owner to load their reset account", async () => {
    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      email: USER.email,
      canManageUsers: false,
    });
  });

  it("allows an authenticated non-owner to send recovery to their own email", async () => {
    const response = await POST(request("recovery", "Agent@Example.com"));

    expect(response.status).toBe(200);
    expect(mocks.resetPasswordForEmail).toHaveBeenCalledWith("agent@example.com", {
      redirectTo: "https://app.revolis.ai/reset-password",
    });
  });

  it("rejects a non-owner attempting to reset another account", async () => {
    const response = await POST(request("recovery", "other@example.com"));

    expect(response.status).toBe(403);
    expect(mocks.resetPasswordForEmail).not.toHaveBeenCalled();
  });

  it("allows an owner to send recovery to a same-agency account", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: OWNER } });
    mocks.resolveProfileForAuthUser.mockResolvedValue({
      profile: { id: "profile-1", role: "owner", ui_role: "owner_vision", agency_id: AGENCY_A },
      profileMissingAgency: false,
    });
    mockAdminProfilesLookup({
      id: "other-1",
      agency_id: AGENCY_A,
      email: "other@example.com",
    });

    const response = await POST(request("recovery", "other@example.com"));

    expect(response.status).toBe(200);
    expect(mocks.resetPasswordForEmail).toHaveBeenCalledWith("other@example.com", {
      redirectTo: "https://app.revolis.ai/reset-password",
    });
  });

  it("rejects owner recovery for a user in another agency", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: OWNER } });
    mocks.resolveProfileForAuthUser.mockResolvedValue({
      profile: { id: "profile-1", role: "owner", ui_role: "owner_vision", agency_id: AGENCY_A },
      profileMissingAgency: false,
    });
    mockAdminProfilesLookup({
      id: "victim-1",
      agency_id: AGENCY_B,
      email: "victim@other-agency.com",
    });

    const response = await POST(request("recovery", "victim@other-agency.com"));

    expect(response.status).toBe(403);
    expect(mocks.resetPasswordForEmail).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      error: "Používateľ nie je v tvojej agentúre.",
    });
  });

  it("rejects recovery-link for a user in another agency (no action_link leak)", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: OWNER } });
    mocks.resolveProfileForAuthUser.mockResolvedValue({
      profile: { id: "profile-1", role: "owner", ui_role: "owner_vision", agency_id: AGENCY_A },
      profileMissingAgency: false,
    });
    mockAdminProfilesLookup({
      id: "victim-1",
      agency_id: AGENCY_B,
      email: "victim@other-agency.com",
    });

    const response = await POST(request("recovery-link", "victim@other-agency.com"));

    expect(response.status).toBe(403);
    expect(mocks.generateLink).not.toHaveBeenCalled();
    const body = await response.json();
    expect(body.recoveryLink).toBeUndefined();
  });

  it("allows recovery-link for a same-agency teammate", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: OWNER } });
    mocks.resolveProfileForAuthUser.mockResolvedValue({
      profile: { id: "profile-1", role: "owner", ui_role: "owner_vision", agency_id: AGENCY_A },
      profileMissingAgency: false,
    });
    mockAdminProfilesLookup({
      id: "teammate-1",
      agency_id: AGENCY_A,
      email: "teammate@example.com",
    });

    const response = await POST(request("recovery-link", "teammate@example.com"));

    expect(response.status).toBe(200);
    expect(mocks.generateLink).toHaveBeenCalled();
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      recoveryLink: "https://example.com/recover?token=abc",
    });
  });

  it("rejects invite when owner profile has no agency_id", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: OWNER } });
    mocks.resolveProfileForAuthUser.mockResolvedValue({
      profile: { id: "profile-1", role: "owner", ui_role: "owner_vision", agency_id: null },
      profileMissingAgency: true,
    });

    const response = await POST(request("invite", "newbie@example.com", { fullName: "Nový" }));

    expect(response.status).toBe(403);
    expect(mocks.inviteUserByEmail).not.toHaveBeenCalled();
  });

  it("stamps agency_id on invitee profile upsert", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: OWNER } });
    mocks.resolveProfileForAuthUser.mockResolvedValue({
      profile: { id: "profile-1", role: "owner", ui_role: "owner_vision", agency_id: AGENCY_A },
      profileMissingAgency: false,
    });

    const response = await POST(request("invite", "newbie@example.com", { fullName: "Nový" }));

    expect(response.status).toBe(200);
    expect(mocks.inviteUserByEmail).toHaveBeenCalledWith(
      "newbie@example.com",
      expect.objectContaining({
        data: expect.objectContaining({ agency_id: AGENCY_A, role: "agent" }),
      }),
    );
    expect(mocks.profilesUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "invitee-1",
        auth_user_id: "invitee-1",
        agency_id: AGENCY_A,
        email: "newbie@example.com",
        role: "agent",
      }),
      { onConflict: "id" },
    );
  });
});
