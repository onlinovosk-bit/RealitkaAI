/**
 * POST /api/team/users previously accepted any authenticated caller and any
 * role string, while still falling back to body.agencyId when the caller had
 * no agency. An agent could mint an unbound owner profile; login then linked
 * auth_user_id via linkProfileToAuthUser → privilege escalation.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const CALLER_AGENCY = "aaaaaaaa-0000-0000-0000-000000000001";
const OTHER_AGENCY = "bbbbbbbb-0000-0000-0000-000000000002";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  callerProfile: vi.fn(),
  createProfile: vi.fn(),
  createActivity: vi.fn(),
  sendOnboardingEmail: vi.fn(),
  checkAiRateLimit: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: mocks.getUser },
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: mocks.callerProfile }),
      }),
    }),
  }),
}));

vi.mock("@/lib/team-store", () => ({
  createProfile: mocks.createProfile,
  listProfiles: vi.fn(),
}));

vi.mock("@/lib/activities-store", () => ({
  createActivity: mocks.createActivity,
}));

vi.mock("@/lib/send-onboarding-email", () => ({
  sendOnboardingEmail: mocks.sendOnboardingEmail,
}));

vi.mock("@/lib/ai/rate-guard", () => ({
  checkAiRateLimit: mocks.checkAiRateLimit,
}));

const post = async (body: Record<string, unknown>) => {
  const { POST } = await import("../route");
  return POST(
    new Request("http://localhost/api/team/users", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getUser.mockResolvedValue({ data: { user: { id: "auth-1" } } });
  mocks.callerProfile.mockResolvedValue({
    data: { role: "owner", agency_id: CALLER_AGENCY },
  });
  mocks.checkAiRateLimit.mockResolvedValue(null);
  mocks.createProfile.mockResolvedValue({
    id: "profile-new",
    fullName: "Novy",
    email: "novy@example.com",
    role: "agent",
  });
  mocks.createActivity.mockResolvedValue(undefined);
  mocks.sendOnboardingEmail.mockResolvedValue(undefined);
});

describe("POST /api/team/users — authz + agency stamp", () => {
  it("agent cannot mint an owner (or any) profile", async () => {
    mocks.callerProfile.mockResolvedValue({
      data: { role: "agent", agency_id: CALLER_AGENCY },
    });

    const res = await post({
      fullName: "Attacker",
      email: "attacker@example.com",
      role: "owner",
    });

    expect(res.status).toBe(403);
    expect(mocks.createProfile).not.toHaveBeenCalled();
  });

  it("rejects founder/admin roles from the body", async () => {
    const res = await post({
      fullName: "X",
      email: "x@example.com",
      role: "founder",
    });

    expect(res.status).toBe(400);
    expect(mocks.createProfile).not.toHaveBeenCalled();
  });

  it("never uses body.agencyId — stamps caller's agency", async () => {
    const res = await post({
      fullName: "Kolega",
      email: "kolega@example.com",
      role: "agent",
      agencyId: OTHER_AGENCY,
    });

    expect(res.status).toBe(200);
    expect(mocks.createProfile).toHaveBeenCalledWith(
      expect.objectContaining({ agencyId: CALLER_AGENCY, role: "agent" }),
      expect.anything(),
    );
    expect(mocks.createProfile.mock.calls[0][0].agencyId).not.toBe(OTHER_AGENCY);
  });

  it("owner without agency_id is refused", async () => {
    mocks.callerProfile.mockResolvedValue({
      data: { role: "owner", agency_id: null },
    });

    const res = await post({
      fullName: "Kolega",
      email: "kolega@example.com",
      role: "agent",
      agencyId: OTHER_AGENCY,
    });

    expect(res.status).toBe(403);
    expect(mocks.createProfile).not.toHaveBeenCalled();
  });

  it("owner can create an agent in their agency", async () => {
    const res = await post({
      fullName: "Kolega",
      email: "kolega@example.com",
      role: "agent",
    });

    expect(res.status).toBe(200);
    expect(mocks.createProfile).toHaveBeenCalledTimes(1);
  });
});
