import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "../route";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  getUser: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: mocks.createClient,
}));

describe("POST /api/onboarding/role", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mocks.createClient.mockResolvedValue({
      auth: { getUser: mocks.getUser },
    });
  });

  it("returns 401 when unauthenticated", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null } });
    const res = await POST(
      new Request("http://localhost/api/onboarding/role", {
        method: "POST",
        body: JSON.stringify({ role: "owner" }),
      }),
    );
    expect(res.status).toBe(401);
  });

  it("refuses self-service role escalation for authenticated users", async () => {
    const res = await POST(
      new Request("http://localhost/api/onboarding/role", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ role: "owner" }),
      }),
    );
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.ok).toBe(false);
  });
});
