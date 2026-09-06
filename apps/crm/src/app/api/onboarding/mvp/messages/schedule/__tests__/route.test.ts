import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  createServiceRoleClient: vi.fn(),
  getUser: vi.fn(),
  maybeSingle: vi.fn(),
  from: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: mocks.createClient,
}));

vi.mock("@/lib/supabase/admin", () => ({
  createServiceRoleClient: mocks.createServiceRoleClient,
}));

function mockUserSession(user: { id: string } | null, profile: { is_platform_admin?: boolean } | null) {
  mocks.getUser.mockResolvedValue({ data: { user } });
  mocks.maybeSingle.mockResolvedValue({ data: profile, error: null });
  mocks.from.mockImplementation(() => ({
    select: vi.fn().mockReturnValue({
      or: vi.fn().mockReturnValue({
        maybeSingle: mocks.maybeSingle,
      }),
    }),
  }));
  mocks.createClient.mockResolvedValue({
    auth: { getUser: mocks.getUser },
    from: mocks.from,
  });
}

describe("POST /api/onboarding/mvp/messages/schedule", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("returns 401 without a user", async () => {
    mockUserSession(null, null);
    const { POST } = await import("../route");
    const res = await POST(
      new Request("http://localhost/api/onboarding/mvp/messages/schedule", {
        method: "POST",
        body: JSON.stringify({ progressId: "p1" }),
      }),
    );
    expect(res.status).toBe(401);
    expect(mocks.createServiceRoleClient).not.toHaveBeenCalled();
  });

  it("returns 403 for non-admin", async () => {
    mockUserSession({ id: "user-1" }, { is_platform_admin: false });
    const { POST } = await import("../route");
    const res = await POST(
      new Request("http://localhost/api/onboarding/mvp/messages/schedule", {
        method: "POST",
        body: JSON.stringify({ progressId: "p1" }),
      }),
    );
    expect(res.status).toBe(403);
    expect(mocks.createServiceRoleClient).not.toHaveBeenCalled();
  });
});
