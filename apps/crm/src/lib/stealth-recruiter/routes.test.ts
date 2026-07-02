import { beforeEach, describe, expect, it, vi } from "vitest";

const checkCapabilityAccess = vi.fn();
const listStealthProspects = vi.fn();
const upsertStealthProspects = vi.fn();
const updateStealthProspectStatus = vi.fn();
const checkAiRateLimit = vi.fn();
const callOpenAI = vi.fn();

vi.mock("@/lib/license/access", () => ({
  checkCapabilityAccess,
}));

vi.mock("@/lib/stealth-recruiter/store", () => ({
  listStealthProspects,
  upsertStealthProspects,
  updateStealthProspectStatus,
}));

vi.mock("@/lib/ai/rate-guard", () => ({
  checkAiRateLimit,
}));

vi.mock("@/lib/ai/openai", () => ({
  callOpenAI,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ from: vi.fn(() => ({ insert: vi.fn() })) })),
}));

vi.mock("resend", () => ({
  Resend: vi.fn(() => ({ emails: { send: vi.fn() } })),
}));

vi.mock("@/lib/stealth-recruiter/demo-prospects", () => ({
  isStealthRecruiterDemoMode: vi.fn(() => false),
  DEMO_STEALTH_PROSPECTS: [],
}));

describe("stealth-recruiter API routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    checkAiRateLimit.mockResolvedValue(null);
  });

  it("POST /scan returns 401 without auth", async () => {
    checkCapabilityAccess.mockResolvedValue({
      allowed: false,
      reason: "unauthorized",
      tier: "free",
    });

    const { POST } = await import("@/app/api/stealth-recruiter/scan/route");
    const res = await POST(
      new Request("http://localhost/api/stealth-recruiter/scan", {
        method: "POST",
        body: JSON.stringify({}),
      }),
    );

    expect(res.status).toBe(401);
  });

  it("POST /scan returns 403 without Monopol tier", async () => {
    checkCapabilityAccess.mockResolvedValue({
      allowed: false,
      reason: "forbidden",
      tier: "market_vision",
      userId: "user-1",
      profileId: "profile-1",
      agencyId: "agency-1",
    });

    const { POST } = await import("@/app/api/stealth-recruiter/scan/route");
    const res = await POST(
      new Request("http://localhost/api/stealth-recruiter/scan", {
        method: "POST",
        body: JSON.stringify({}),
      }),
    );

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toMatch(/Monopol/i);
  });

  it("POST /outreach returns 401 without auth", async () => {
    checkCapabilityAccess.mockResolvedValue({
      allowed: false,
      reason: "unauthorized",
      tier: "free",
    });

    const { POST } = await import("@/app/api/stealth-recruiter/outreach/route");
    const res = await POST(
      new Request("http://localhost/api/stealth-recruiter/outreach", {
        method: "POST",
        body: JSON.stringify({ address: "Test" }),
      }),
    );

    expect(res.status).toBe(401);
  }, 15000);

  it("POST /outreach returns 403 without Monopol tier", async () => {
    checkCapabilityAccess.mockResolvedValue({
      allowed: false,
      reason: "forbidden",
      tier: "pro",
      userId: "user-1",
      profileId: "profile-1",
      agencyId: "agency-1",
    });

    const { POST } = await import("@/app/api/stealth-recruiter/outreach/route");
    const res = await POST(
      new Request("http://localhost/api/stealth-recruiter/outreach", {
        method: "POST",
        body: JSON.stringify({ address: "Test" }),
      }),
    );

    expect(res.status).toBe(403);
  });
});
