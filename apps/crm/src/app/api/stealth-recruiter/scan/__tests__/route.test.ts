import { beforeEach, describe, expect, it, vi } from "vitest";

const checkCapabilityAccess = vi.fn();
const listStealthProspects = vi.fn();
const upsertStealthProspects = vi.fn();
const checkAiRateLimit = vi.fn();
const callOpenAI = vi.fn();
const isStealthRecruiterDemoMode = vi.fn();

vi.mock("@/lib/license/access", () => ({
  checkCapabilityAccess,
}));

vi.mock("@/lib/stealth-recruiter/store", () => ({
  listStealthProspects,
  upsertStealthProspects,
}));

vi.mock("@/lib/ai/rate-guard", () => ({
  checkAiRateLimit: (...args: unknown[]) => checkAiRateLimit(...args),
}));

vi.mock("@/lib/ai/openai", () => ({
  callOpenAI: (...args: unknown[]) => callOpenAI(...args),
}));

vi.mock("@/lib/stealth-recruiter/demo-prospects", () => ({
  isStealthRecruiterDemoMode: (...args: unknown[]) => isStealthRecruiterDemoMode(...args),
  DEMO_STEALTH_PROSPECTS: [
    {
      address: "Sabinovská 18, Prešov",
      source: "bazos",
      score: 91,
      status: "identified",
      metadata: { platform: "bazos", daysListed: 87 },
    },
  ],
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ from: vi.fn() })),
}));

const sampleProspect = {
  id: "db1",
  address: "Test 1, Prešov",
  platform: "bazos" as const,
  daysListed: 10,
  originalPrice: 100000,
  currentPrice: 90000,
  priceDropPercent: 10,
  score: 80,
  status: "identified" as const,
};

describe("POST /api/stealth-recruiter/scan", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    checkCapabilityAccess.mockResolvedValue({
      allowed: true,
      userId: "u1",
      profileId: "p1",
      agencyId: "agency-1",
      tier: "reality_monopol",
    });
    checkAiRateLimit.mockResolvedValue(null);
    callOpenAI.mockResolvedValue({ content: '{"candidates":[]}' });
    isStealthRecruiterDemoMode.mockReturnValue(false);
  });

  it("non-demo empty prospects returns 503 when scan source unavailable", async () => {
    listStealthProspects.mockResolvedValue([]);

    const { POST } = await import("../route");
    const res = await POST(
      new Request("http://localhost/api/stealth-recruiter/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ minScore: 60 }),
      }),
    );
    const json = await res.json();

    expect(res.status).toBe(503);
    expect(json.code).toBe("SCAN_SOURCE_UNAVAILABLE");
    expect(json.source).toBeUndefined();
  });

  it("non-demo returns db prospects filtered by minScore", async () => {
    listStealthProspects.mockResolvedValue([sampleProspect]);

    const { POST } = await import("../route");
    const res = await POST(
      new Request("http://localhost/api/stealth-recruiter/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ minScore: 60 }),
      }),
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.source).toBe("db");
    expect(json.demoMode).toBe(false);
    expect(json.prospects).toHaveLength(1);
    expect(listStealthProspects).toHaveBeenCalledWith(
      "agency-1",
      { minScore: 0, limit: 20 },
      expect.anything(),
    );
  });

  it("demo mode seeds prospects when store is empty", async () => {
    isStealthRecruiterDemoMode.mockReturnValue(true);
    listStealthProspects.mockResolvedValue([]);
    upsertStealthProspects.mockResolvedValue([
      { ...sampleProspect, address: "Sabinovská 18, Prešov" },
    ]);

    const { POST } = await import("../route");
    const res = await POST(
      new Request("http://localhost/api/stealth-recruiter/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ minScore: 60, generateNew: true }),
      }),
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.demoMode).toBe(true);
    expect(json.source).toBe("demo");
    expect(upsertStealthProspects).toHaveBeenCalled();
  });

  it("generateNew enriches prospects with AI comments when available", async () => {
    listStealthProspects.mockResolvedValue([sampleProspect]);
    callOpenAI.mockResolvedValue({
      content: JSON.stringify({ candidates: [{ id: "db1", comment: "Silný kandidát." }] }),
    });

    const { POST } = await import("../route");
    const res = await POST(
      new Request("http://localhost/api/stealth-recruiter/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ minScore: 60, generateNew: true }),
      }),
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.prospects[0].aiOutreach).toBe("Silný kandidát.");
    expect(callOpenAI).toHaveBeenCalled();
  });
});
