import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "../route";
import { bratislavaVerifiedAtRange } from "@/lib/stealth-recruiter/scan-filters";

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
    in: vi.fn(() => chain),
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

  it("demo env false → source nie je demo", async () => {
    mockFrom.mockReturnValue(chainQuery({ data: [] }));

    const res = await POST(
      new Request("http://localhost/api/stealth-recruiter/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ area: "Prešov", onlyToday: true, generateNew: true }),
      }),
    );
    const json = await res.json();

    expect(json.source).not.toBe("demo");
    expect(json.source).not.toBe("fallback");
    expect(json.prospects).toEqual([]);
  });

  it("filter Prešov funguje", async () => {
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
        body: JSON.stringify({ area: "Prešov", onlyToday: true }),
      }),
    );
    const json = await res.json();

    expect(chain.eq).toHaveBeenCalledWith("agency_id", "agency-1");
    expect(chain.ilike).toHaveBeenCalledWith("region", "Prešov");
    expect(chain.in).toHaveBeenCalledWith("status", ["identified", "verified"]);
    expect(json.source).toBe("db");
    expect(json.prospects).toHaveLength(1);
  });

  it("dnešný filter funguje", async () => {
    const chain = chainQuery({ data: [] });
    mockFrom.mockReturnValue(chain);
    const { from, to } = bratislavaVerifiedAtRange();

    await POST(
      new Request("http://localhost/api/stealth-recruiter/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ area: "Prešov", onlyToday: true }),
      }),
    );

    expect(chain.gte).toHaveBeenCalledWith("verified_at", from);
    expect(chain.lt).toHaveBeenCalledWith("verified_at", to);
  });

  it("prázdny výsledok = source empty, nie fake dáta", async () => {
    mockFrom.mockReturnValue(chainQuery({ data: [] }));

    const res = await POST(
      new Request("http://localhost/api/stealth-recruiter/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ area: "Prešov", onlyToday: true, generateNew: false }),
      }),
    );
    const json = await res.json();

    expect(json.source).toBe("empty");
    expect(json.prospects).toEqual([]);
    expect(json.message).toBe("Žiadni overení samopredajcovia v regióne Prešov dnes.");
    expect(json.prospects.some((p: { address: string }) => p.address.includes("Košice"))).toBe(
      false,
    );
  });
});
