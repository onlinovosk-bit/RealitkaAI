import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  createServiceRoleClient: vi.fn(),
  getUser: vi.fn(),
  profileMaybeSingle: vi.fn(),
  progressSelect: vi.fn(),
  runOnboardingDispatch: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: mocks.createClient,
}));

vi.mock("@/lib/supabase/admin", () => ({
  createServiceRoleClient: mocks.createServiceRoleClient,
}));

vi.mock("@/lib/onboarding-dispatch", () => ({
  runOnboardingDispatch: mocks.runOnboardingDispatch,
}));

import { GET as getAtRisk } from "@/app/api/onboarding/mvp/at-risk/route";
import { POST as postDispatch } from "@/app/api/onboarding/mvp/messages/dispatch/route";

function mockAuthedProfile(profile: { role?: string; is_platform_admin?: boolean } | null) {
  mocks.getUser.mockResolvedValue({
    data: { user: profile ? { id: "auth-1" } : null },
  });
  mocks.profileMaybeSingle.mockResolvedValue({ data: profile });
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
}

describe("onboarding MVP operator auth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.progressSelect.mockResolvedValue({ data: [], error: null });
    mocks.createServiceRoleClient.mockReturnValue({
      from: () => ({
        select: () => ({
          order: () => ({
            limit: mocks.progressSelect,
          }),
        }),
      }),
    });
    mocks.runOnboardingDispatch.mockResolvedValue({ processed: 0, sent: 0, failed: 0 });
  });

  it("GET at-risk returns 401 when unauthenticated", async () => {
    mockAuthedProfile(null);
    const res = await getAtRisk();
    expect(res.status).toBe(401);
    expect(mocks.createServiceRoleClient).not.toHaveBeenCalled();
  });

  it("GET at-risk returns 403 for agency owner (cross-tenant PII)", async () => {
    mockAuthedProfile({ role: "owner", is_platform_admin: false });
    const res = await getAtRisk();
    expect(res.status).toBe(403);
    expect(mocks.createServiceRoleClient).not.toHaveBeenCalled();
  });

  it("GET at-risk allows founder", async () => {
    mockAuthedProfile({ role: "founder", is_platform_admin: false });
    const res = await getAtRisk();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.clients).toEqual([]);
  });

  it("GET at-risk allows platform admin", async () => {
    mockAuthedProfile({ role: "agent", is_platform_admin: true });
    const res = await getAtRisk();
    expect(res.status).toBe(200);
  });

  it("POST dispatch returns 401 when unauthenticated", async () => {
    mockAuthedProfile(null);
    const res = await postDispatch();
    expect(res.status).toBe(401);
    expect(mocks.runOnboardingDispatch).not.toHaveBeenCalled();
  });

  it("POST dispatch allows founder and runs dispatch", async () => {
    mockAuthedProfile({ role: "founder" });
    const res = await postDispatch();
    expect(res.status).toBe(200);
    expect(mocks.runOnboardingDispatch).toHaveBeenCalledOnce();
  });
});
