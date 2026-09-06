import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  getUser: vi.fn(),
  maybeSingle: vi.fn(),
  scanDormantLeads: vi.fn(),
  update: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: mocks.createClient,
}));

vi.mock("@/lib/l99/shadow-inventory", () => ({
  scanDormantLeads: (...args: unknown[]) => mocks.scanDormantLeads(...args),
}));

describe("POST /api/enterprise/onboard-start", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mocks.maybeSingle.mockResolvedValue({
      data: { agency_id: "agency-1", account_tier: "free" },
      error: null,
    });
    mocks.scanDormantLeads.mockResolvedValue([{ id: "sig-1" }]);
    mocks.update.mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });

    const from = vi.fn((table: string) => {
      if (table === "profiles") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: mocks.maybeSingle,
            }),
          }),
          update: mocks.update,
        };
      }
      return {};
    });

    mocks.createClient.mockResolvedValue({
      auth: { getUser: mocks.getUser },
      from,
    });
  });

  it("returns 401 when unauthenticated", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null } });
    const { POST } = await import("../route");
    const res = await POST();
    expect(res.status).toBe(401);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("refuses free-tier self-upgrade (no account_tier write)", async () => {
    const { POST } = await import("../route");
    const res = await POST();
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.scanDormantLeads).not.toHaveBeenCalled();
  });

  it("runs shadow scan for already-enterprise profiles without writing tier", async () => {
    mocks.maybeSingle.mockResolvedValue({
      data: { agency_id: "agency-1", account_tier: "enterprise" },
      error: null,
    });
    const { POST } = await import("../route");
    const res = await POST();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({
      ok: true,
      tier: "enterprise",
      shadowSignalsFound: 1,
    });
    expect(mocks.scanDormantLeads).toHaveBeenCalledWith("agency-1");
    expect(mocks.update).not.toHaveBeenCalled();
  });
});
