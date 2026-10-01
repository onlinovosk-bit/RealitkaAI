import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  createServiceRoleClient: vi.fn(),
  getUser: vi.fn(),
  maybeSingle: vi.fn(),
  from: vi.fn(),
  serviceFrom: vi.fn(),
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

describe("GET /api/onboarding/mvp/at-risk", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("returns 401 without a user", async () => {
    mockUserSession(null, null);
    mocks.createServiceRoleClient.mockReturnValue({});
    const { GET } = await import("../route");
    const res = await GET();
    expect(res.status).toBe(401);
    expect(mocks.createServiceRoleClient).not.toHaveBeenCalled();
  });

  it("returns 403 for authenticated non-admin", async () => {
    mockUserSession({ id: "user-1" }, { is_platform_admin: false });
    mocks.createServiceRoleClient.mockReturnValue({});
    const { GET } = await import("../route");
    const res = await GET();
    expect(res.status).toBe(403);
    expect(mocks.createServiceRoleClient).not.toHaveBeenCalled();
  });

  it("loads at-risk clients when profile id differs from auth.uid()", async () => {
    const authUserId = "auth-uuid-1111";
    mockUserSession({ id: authUserId }, { is_platform_admin: true });
    const order = vi.fn().mockReturnValue({
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    });
    mocks.serviceFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        order,
      }),
    });
    mocks.createServiceRoleClient.mockReturnValue({ from: mocks.serviceFrom });

    const { GET } = await import("../route");
    const res = await GET();
    expect(res.status).toBe(200);
    expect(mocks.createServiceRoleClient).toHaveBeenCalledOnce();
  });
});
