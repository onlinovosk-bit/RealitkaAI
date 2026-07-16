import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "../route";

const mockCreateAdmin = vi.fn();
const mockResolveAgency = vi.fn();
const mockIngest = vi.fn();
const mockFrom = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createAdminClient: () => mockCreateAdmin(),
}));

vi.mock("@/lib/stealth-recruiter/resolve-agency", () => ({
  resolveStealthAgencyId: (...args: unknown[]) => mockResolveAgency(...args),
}));

vi.mock("@/lib/stealth-recruiter/ingest-presov", () => ({
  ingestPresovProspects: (...args: unknown[]) => mockIngest(...args),
}));

function makeRequest(
  secret: string | null,
  query = "",
): NextRequest {
  const init: ConstructorParameters<typeof NextRequest>[1] = {};
  if (secret) {
    init.headers = { authorization: `Bearer ${secret}` };
  }
  return new NextRequest(
    `http://localhost/api/cron/stealth-recruiter-ingest${query}`,
    init,
  );
}

describe("GET /api/cron/stealth-recruiter-ingest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("CRON_SECRET", "test-cron-secret");
    mockCreateAdmin.mockReturnValue({ from: mockFrom });
    mockResolveAgency.mockResolvedValue({
      agencyId: "11111111-1111-1111-1111-111111111111",
      resolvedVia: "slug",
    });
    mockIngest.mockResolvedValue({
      region: "Prešov",
      source: "bazos_sk",
      prospects: [
        {
          agency_id: "11111111-1111-1111-1111-111111111111",
          address: "Byt Sabinovská, Prešov",
          region: "Prešov",
          platform: "bazos",
          days_listed: 90,
          original_price: 120000,
          current_price: 120000,
          score: 85,
          status: "verified",
          verified_at: "2026-05-31T10:00:00.000Z",
          scraped_at: "2026-05-31T10:00:00.000Z",
        },
      ],
      errors: [],
      scanned_at: "2026-05-31T10:00:00.000Z",
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns 401 without Bearer CRON_SECRET", async () => {
    const res = await GET(makeRequest(null));
    expect(res.status).toBe(401);
  });

  it("returns 401 with wrong secret", async () => {
    const res = await GET(makeRequest("wrong"));
    expect(res.status).toBe(401);
  });

  it("upserts prospects and reports inserted/updated", async () => {
    const selectChain = {
      select: vi.fn(() => selectChain),
      eq: vi.fn(() => selectChain),
      in: vi.fn(() =>
        Promise.resolve({ data: [], error: null }),
      ),
    };
    const upsert = vi.fn(() => Promise.resolve({ error: null }));
    mockFrom.mockReturnValue({ ...selectChain, upsert });

    const res = await GET(makeRequest("test-cron-secret", "?region=Prešov"));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.inserted).toBe(1);
    expect(json.updated).toBe(0);
    expect(json.upserted).toBe(1);
    expect(upsert).toHaveBeenCalledWith(
      expect.any(Array),
      { onConflict: "agency_id,address" },
    );
  });

  it("returns ok with zero rows when ingest is empty", async () => {
    mockIngest.mockResolvedValue({
      region: "Prešov",
      source: "bazos_sk",
      prospects: [],
      errors: [],
      scanned_at: "2026-05-31T10:00:00.000Z",
    });

    const res = await GET(makeRequest("test-cron-secret"));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.inserted).toBe(0);
    expect(json.upserted).toBe(0);
  });
});
