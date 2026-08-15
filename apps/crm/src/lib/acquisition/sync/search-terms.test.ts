import { afterEach, describe, expect, it, vi } from "vitest";
import {
  GoogleAdsClient,
  resetGoogleAdsRateLimitState,
} from "../google-ads-client";
import {
  ACQUISITION_PROVIDER_GOOGLE,
  SEARCH_TERM_GAQL,
  searchTermUpsertKey,
  normalizeSearchTermRow,
  syncSearchTerms,
  type SearchTermRecord,
  type SearchTermStore,
} from "./search-terms";

function mockResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
  } as Response;
}

function createMemoryStore(): SearchTermStore & {
  rows: Map<string, SearchTermRecord>;
} {
  const rows = new Map<string, SearchTermRecord>();
  return {
    rows,
    getByKey(key) {
      return rows.get(key);
    },
    put(key, row) {
      rows.set(key, row);
    },
    list() {
      return [...rows.values()];
    },
  };
}

function createClient(fetchImpl: ReturnType<typeof vi.fn>) {
  return new GoogleAdsClient({
    agencyId: "agency-search-terms",
    customerId: "123-456-7890",
    auth: { getAccessToken: async () => "test-access-token" },
    rateLimitPerTenant: 100,
    fetchImpl,
    sleep: vi.fn().mockResolvedValue(undefined),
  });
}

const MOCK_SEARCH_TERM_ROW = {
  searchTermView: { searchTerm: "byt na predaj bratislava" },
  campaign: { id: "1001" },
  segments: { date: "2026-08-14" },
  metrics: { impressions: "42", clicks: "3", costMicros: "1500000" },
};

describe("sync/search-terms", () => {
  afterEach(() => {
    resetGoogleAdsRateLimitState();
    vi.restoreAllMocks();
  });

  it("maps a GAQL-shaped mock search payload onto a search-term row", () => {
    const normalized = normalizeSearchTermRow(MOCK_SEARCH_TERM_ROW);
    expect(normalized).toEqual({
      provider: ACQUISITION_PROVIDER_GOOGLE,
      search_term: "byt na predaj bratislava",
      campaign_id: "1001",
      date: "2026-08-14",
      impressions: 42,
      clicks: 3,
      cost_micros: 1_500_000,
    });
    expect(searchTermUpsertKey(normalized!)).toBe(
      "GOOGLE|byt na predaj bratislava|1001|2026-08-14",
    );
  });

  it("syncs via mocked GoogleAdsClient.search and is idempotent on a second run", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(mockResponse(200, { results: [MOCK_SEARCH_TERM_ROW] }));
    const client = createClient(fetchImpl);
    const store = createMemoryStore();

    const first = await syncSearchTerms({ client, store });
    expect(first).toEqual({ fetched: 1, inserted: 1, updated: 0, skipped: 0 });
    expect(store.list()).toHaveLength(1);
    expect(store.list()[0]?.impressions).toBe(42);

    const updatedRow = {
      ...MOCK_SEARCH_TERM_ROW,
      metrics: { impressions: "80", clicks: "5", costMicros: "2100000" },
    };
    fetchImpl.mockResolvedValue(mockResponse(200, { results: [updatedRow] }));

    const second = await syncSearchTerms({ client, store });
    expect(second).toEqual({ fetched: 1, inserted: 0, updated: 1, skipped: 0 });
    expect(store.list()).toHaveLength(1);
    expect(store.list()[0]).toMatchObject({
      provider: "GOOGLE",
      search_term: "byt na predaj bratislava",
      campaign_id: "1001",
      date: "2026-08-14",
      impressions: 80,
      clicks: 5,
      cost_micros: 2_100_000,
    });

    expect(fetchImpl).toHaveBeenCalledTimes(2);
    const [url, init] = fetchImpl.mock.calls[0];
    expect(String(url)).toContain("/customers/1234567890/googleAds:search");
    expect(JSON.parse(String(init.body)).query).toBe(SEARCH_TERM_GAQL);
    expect(SEARCH_TERM_GAQL).toMatch(/segments\.date DURING LAST_7_DAYS/);
    expect(JSON.stringify(init)).not.toMatch(/developer-token|private_key/i);
  });
});
