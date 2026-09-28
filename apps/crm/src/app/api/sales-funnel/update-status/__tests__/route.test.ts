import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  getUser: vi.fn(),
  maybeSingle: vi.fn(),
  from: vi.fn(),
  updateEq: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: mocks.createClient,
}));

function mockUserSession(
  user: { id: string } | null,
  profile: { is_platform_admin?: boolean } | null,
) {
  mocks.getUser.mockResolvedValue({ data: { user } });
  mocks.maybeSingle.mockResolvedValue({ data: profile, error: null });
  mocks.updateEq.mockResolvedValue({ error: null });

  mocks.from.mockImplementation((table: string) => {
    if (table === "profiles") {
      return {
        select: vi.fn().mockReturnValue({
          or: vi.fn().mockReturnValue({
            maybeSingle: mocks.maybeSingle,
          }),
        }),
      };
    }
    if (table === "saas_leads") {
      return {
        update: vi.fn().mockReturnValue({
          eq: mocks.updateEq,
        }),
      };
    }
    return {};
  });

  mocks.createClient.mockResolvedValue({
    auth: { getUser: mocks.getUser },
    from: mocks.from,
  });
}

describe("POST /api/sales-funnel/update-status", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("returns 401 without a user", async () => {
    mockUserSession(null, null);
    const { POST } = await import("../route");
    const res = await POST(
      new Request("http://localhost/api/sales-funnel/update-status", {
        method: "POST",
        body: JSON.stringify({ id: "lead-1", status: "won" }),
      }),
    );
    expect(res.status).toBe(401);
    expect(mocks.updateEq).not.toHaveBeenCalled();
  });

  it("returns 403 for authenticated non-admin (tenant agent)", async () => {
    mockUserSession({ id: "user-1" }, { is_platform_admin: false });
    const { POST } = await import("../route");
    const res = await POST(
      new Request("http://localhost/api/sales-funnel/update-status", {
        method: "POST",
        body: JSON.stringify({ id: "lead-1", status: "lost" }),
      }),
    );
    expect(res.status).toBe(403);
    expect(mocks.updateEq).not.toHaveBeenCalled();
  });

  it("updates status when caller is platform admin", async () => {
    mockUserSession({ id: "admin-1" }, { is_platform_admin: true });
    const { POST } = await import("../route");
    const res = await POST(
      new Request("http://localhost/api/sales-funnel/update-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: "lead-1", status: "won" }),
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.id).toBe("lead-1");
    expect(body.status).toBe("won");
    expect(mocks.updateEq).toHaveBeenCalledWith("id", "lead-1");
  });
});
