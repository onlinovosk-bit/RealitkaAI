import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "../route";

const mockGetUser = vi.fn();
const mockResolveProfile = vi.fn();
const mockRateLimit = vi.fn();
const mockFrom = vi.fn();
const mockCallOpenAI = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
  })),
  createAdminClient: vi.fn(() => ({
    from: mockFrom,
  })),
}));

vi.mock("@/lib/profiles/resolve-profile-for-auth", () => ({
  resolveProfileForAuthUser: (...args: unknown[]) => mockResolveProfile(...args),
}));

vi.mock("@/lib/ai/rate-guard", () => ({
  checkAiRateLimit: (...args: unknown[]) => mockRateLimit(...args),
}));

vi.mock("@/lib/ai/openai", () => ({
  callOpenAI: (...args: unknown[]) => mockCallOpenAI(...args),
}));

function chainQuery(result: { data: unknown[] | null }) {
  const chain = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    gte: vi.fn(() => chain),
    lt: vi.fn(() => chain),
    ilike: vi.fn(() => chain),
    order: vi.fn(() => chain),
    limit: vi.fn(() => chain),
    then: (resolve: (v: typeof result) => void) => resolve(result),
  };
  return chain;
}

describe("POST /api/stealth-recruiter/scan", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1", email: "a@test.sk" } } });
    mockRateLimit.mockResolvedValue(null);
    mockResolveProfile.mockResolvedValue({
      profile: { id: "p1", agency_id: "agency-1" },
      profileMissingAgency: false,
    });
    mockCallOpenAI.mockResolvedValue({ content: '{"candidates":[]}' });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns 401 without auth", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await POST(
      new Request("http://localhost/api/stealth-recruiter/scan", {
        method: "POST",
        body: JSON.stringify({}),
      }),
    );
    expect(res.status).toBe(401);
  });

  it("returns empty list in production when DB has no rows", async () => {
    mockFrom.mockReturnValue(chainQuery({ data: [] }));
    const res = await POST(
      new Request("http://localhost/api/stealth-recruiter/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ area: "Prešov", onlyToday: true }),
      }),
    );
    const json = await res.json();
    expect(json.prospects).toEqual([]);
    expect(json.source).toBe("empty");
  });

  it("scopes query by agency_id and region", async () => {
    const chain = chainQuery({
      data: [
        {
          id: "db1",
          address: "Test 1, Prešov",
          platform: "bazos",
          days_listed: 10,
          original_price: 100000,
          current_price: 90000,
          score: 80,
          status: "identified",
        },
      ],
    });
    mockFrom.mockReturnValue(chain);

    const res = await POST(
      new Request("http://localhost/api/stealth-recruiter/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ area: "Prešov", onlyToday: true, minScore: 60 }),
      }),
    );
    const json = await res.json();

    expect(chain.eq).toHaveBeenCalledWith("agency_id", "agency-1");
    expect(chain.ilike).toHaveBeenCalledWith("region", "Prešov");
    expect(chain.gte).toHaveBeenCalledWith("verified_at", expect.any(String));
    expect(chain.lt).toHaveBeenCalledWith("verified_at", expect.any(String));
    expect(json.source).toBe("db");
    expect(json.prospects).toHaveLength(1);
  });

  it("uses demo prospects only when demo mode is enabled", async () => {
    vi.stubEnv("STEALTH_RECRUITER_DEMO_MODE", "true");
    mockFrom.mockReturnValue(chainQuery({ data: [] }));

    const res = await POST(
      new Request("http://localhost/api/stealth-recruiter/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ area: "Prešov", onlyToday: true, generateNew: true }),
      }),
    );
    const json = await res.json();

    expect(json.source).toBe("demo");
    expect(json.prospects.length).toBeGreaterThan(0);
    expect(json.prospects.every((p: { address: string }) => p.address.includes("Prešov"))).toBe(
      true,
    );
  });
});
