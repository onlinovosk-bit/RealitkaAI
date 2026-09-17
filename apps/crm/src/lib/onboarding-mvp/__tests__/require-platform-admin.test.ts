import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  getUser: vi.fn(),
  maybeSingle: vi.fn(),
  from: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: mocks.createClient,
}));

describe("requirePlatformAdmin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("allows platform admin when profiles.id differs from auth.uid()", async () => {
    const authUserId = "auth-uuid-1111";
    mocks.getUser.mockResolvedValue({ data: { user: { id: authUserId } } });
    mocks.maybeSingle.mockResolvedValue({
      data: { is_platform_admin: true },
      error: null,
    });
    const or = vi.fn().mockReturnValue({ maybeSingle: mocks.maybeSingle });
    mocks.from.mockReturnValue({
      select: vi.fn().mockReturnValue({ or }),
    });
    mocks.createClient.mockResolvedValue({
      auth: { getUser: mocks.getUser },
      from: mocks.from,
    });

    const { requirePlatformAdmin } = await import("../require-platform-admin");
    const denied = await requirePlatformAdmin();

    expect(or).toHaveBeenCalledWith(`auth_user_id.eq.${authUserId},id.eq.${authUserId}`);
    expect(denied).toBeNull();
  });

  it("returns 403 when profile row is not found", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: "auth-missing" } } });
    mocks.maybeSingle.mockResolvedValue({ data: null, error: null });
    const or = vi.fn().mockReturnValue({ maybeSingle: mocks.maybeSingle });
    mocks.from.mockReturnValue({
      select: vi.fn().mockReturnValue({ or }),
    });
    mocks.createClient.mockResolvedValue({
      auth: { getUser: mocks.getUser },
      from: mocks.from,
    });

    const { requirePlatformAdmin } = await import("../require-platform-admin");
    const denied = await requirePlatformAdmin();

    expect(denied?.status).toBe(403);
  });
});
