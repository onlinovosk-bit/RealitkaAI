import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "../route";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  createAdminClient: vi.fn(),
  getUser: vi.fn(),
  resetPasswordForEmail: vi.fn(),
  resolveProfileForAuthUser: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: mocks.createClient,
  createAdminClient: mocks.createAdminClient,
}));

vi.mock("@/lib/profiles/resolve-profile-for-auth", () => ({
  resolveProfileForAuthUser: mocks.resolveProfileForAuthUser,
}));

const USER = { id: "user-1", email: "agent@example.com" };

function request(action: string, email: string) {
  return new Request("http://localhost/api/settings/auth-email-tests", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action, email }),
  });
}

describe("/api/settings/auth-email-tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUser.mockResolvedValue({ data: { user: USER } });
    mocks.resetPasswordForEmail.mockResolvedValue({ error: null });
    mocks.createClient.mockResolvedValue({
      auth: {
        getUser: mocks.getUser,
        resetPasswordForEmail: mocks.resetPasswordForEmail,
      },
    });
    mocks.resolveProfileForAuthUser.mockResolvedValue({
      profile: { id: "profile-1", role: "agent", ui_role: "agent" },
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
      redirectTo: "https://app.revolis.ai/auth/callback?next=/reset-password",
    });
  });

  it("rejects a non-owner attempting to reset another account", async () => {
    const response = await POST(request("recovery", "other@example.com"));

    expect(response.status).toBe(403);
    expect(mocks.resetPasswordForEmail).not.toHaveBeenCalled();
  });

  it("allows an owner to send recovery to another account", async () => {
    mocks.resolveProfileForAuthUser.mockResolvedValue({
      profile: { id: "profile-1", role: "owner", ui_role: "owner_vision" },
      profileMissingAgency: false,
    });

    const response = await POST(request("recovery", "other@example.com"));

    expect(response.status).toBe(200);
    expect(mocks.resetPasswordForEmail).toHaveBeenCalledWith("other@example.com", {
      redirectTo: "https://app.revolis.ai/auth/callback?next=/reset-password",
    });
  });
});
