import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  createServiceRoleClient: vi.fn(),
  getUser: vi.fn(),
  maybeSingle: vi.fn(),
  from: vi.fn(),
  writeManualSubscriptionSnapshot: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: mocks.createClient,
}));

vi.mock("@/lib/supabase/admin", () => ({
  createServiceRoleClient: mocks.createServiceRoleClient,
}));

vi.mock("@/lib/ai-control-tower/subscription-write", () => ({
  writeManualSubscriptionSnapshot: mocks.writeManualSubscriptionSnapshot,
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

const validBody = {
  provider: "claude",
  accountRef: "shared",
  quotaWindow: "weekly",
  usedPercent: 12,
  remainingPercent: 88,
  resetAt: "2026-11-23T12:00:00.000Z",
  resetTimezone: "Europe/Bratislava",
  capturedAt: "2026-11-16T11:00:00.000Z",
  note: null,
};

describe("POST /api/ai-control-tower/snapshots", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mocks.writeManualSubscriptionSnapshot.mockResolvedValue({
      ok: true,
      inserted: true,
      snapshot: { poolId: "claude:shared:weekly", usedPercent: 12, remainingPercent: 88 },
    });
  });

  it("returns 401 without a user and does not write", async () => {
    mockUserSession(null, null);
    const { POST } = await import("../route");
    const res = await POST(new Request("http://local/api/ai-control-tower/snapshots", {
      method: "POST",
      body: JSON.stringify(validBody),
    }));
    expect(res.status).toBe(401);
    expect(mocks.writeManualSubscriptionSnapshot).not.toHaveBeenCalled();
    expect(mocks.createServiceRoleClient).not.toHaveBeenCalled();
  });

  it("returns 403 for authenticated non-admin even with founder-looking email", async () => {
    mockUserSession({ id: "user-1" }, { is_platform_admin: false });
    const { POST } = await import("../route");
    const res = await POST(new Request("http://local/api/ai-control-tower/snapshots", {
      method: "POST",
      body: JSON.stringify(validBody),
    }));
    expect(res.status).toBe(403);
    expect(mocks.writeManualSubscriptionSnapshot).not.toHaveBeenCalled();
  });

  it("writes when profiles.is_platform_admin is true", async () => {
    mockUserSession({ id: "admin-1" }, { is_platform_admin: true });
    const { POST } = await import("../route");
    const res = await POST(new Request("http://local/api/ai-control-tower/snapshots", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(validBody),
    }));
    expect(res.status).toBe(200);
    expect(mocks.writeManualSubscriptionSnapshot).toHaveBeenCalledOnce();
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.poolId).toBe("claude:shared:weekly");
  });
});
