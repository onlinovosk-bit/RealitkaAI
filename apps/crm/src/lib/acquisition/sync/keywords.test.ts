import { afterEach, describe, expect, it, vi } from "vitest";
import {
  GoogleAdsClient,
  resetGoogleAdsRateLimitState,
} from "../google-ads-client";
import {
  ACQUISITION_PROVIDER_GOOGLE,
  KEYWORD_GAQL,
  keywordUpsertKey,
  normalizeKeywordRow,
  syncKeywords,
  type KeywordRecord,
  type KeywordStore,
} from "./keywords";

function mockResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
  } as Response;
}

function createMemoryStore(): KeywordStore & { rows: Map<string, KeywordRecord> } {
  const rows = new Map<string, KeywordRecord>();
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
    agencyId: "agency-keywords",
    customerId: "123-456-7890",
    auth: { getAccessToken: async () => "test-access-token" },
    rateLimitPerTenant: 100,
    fetchImpl,
    sleep: vi.fn().mockResolvedValue(undefined),
  });
}

const MOCK_KEYWORD_ROW = {
  campaign: { id: "1001" },
  adGroup: { id: "2001" },
  adGroupCriterion: {
    criterionId: "3001",
    status: "ENABLED",
    keyword: { text: "predaj byt bratislava", matchType: "PHRASE" },
  },
};

describe("sync/keywords", () => {
  afterEach(() => {
    resetGoogleAdsRateLimitState();
    vi.restoreAllMocks();
  });

  it("maps a GAQL-shaped mock search payload onto a keyword row", () => {
    const normalized = normalizeKeywordRow(MOCK_KEYWORD_ROW);
    expect(normalized).toEqual({
      provider: ACQUISITION_PROVIDER_GOOGLE,
      provider_keyword_id: "3001",
      provider_campaign_id: "1001",
      provider_ad_group_id: "2001",
      text: "predaj byt bratislava",
      match_type: "PHRASE",
      status: "ENABLED",
    });
    expect(keywordUpsertKey(normalized!)).toBe("GOOGLE|keyword|3001");
  });

  it("upserts by campaign+adgroup+text when criterion id is missing", () => {
    const normalized = normalizeKeywordRow({
      campaign: { id: "1001" },
      ad_group: { id: "2001" },
      ad_group_criterion: {
        keyword: { text: "prenajom 3izbovy", match_type: "EXACT" },
        status: "PAUSED",
      },
    });
    expect(normalized).toMatchObject({
      provider: "GOOGLE",
      provider_keyword_id: null,
      text: "prenajom 3izbovy",
    });
    expect(keywordUpsertKey(normalized!)).toBe(
      "GOOGLE|criterion|1001|2001|prenajom 3izbovy",
    );
  });

  it("syncs via mocked GoogleAdsClient.search and is idempotent on a second run", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(mockResponse(200, { results: [MOCK_KEYWORD_ROW] }));
    const client = createClient(fetchImpl);
    const store = createMemoryStore();

    const first = await syncKeywords({ client, store });
    expect(first).toEqual({ fetched: 1, inserted: 1, updated: 0, skipped: 0 });
    expect(store.list()).toHaveLength(1);
    expect(store.list()[0]?.status).toBe("ENABLED");

    const updatedRow = {
      ...MOCK_KEYWORD_ROW,
      adGroupCriterion: {
        ...MOCK_KEYWORD_ROW.adGroupCriterion,
        status: "PAUSED",
      },
    };
    fetchImpl.mockResolvedValue(mockResponse(200, { results: [updatedRow] }));

    const second = await syncKeywords({ client, store });
    expect(second).toEqual({ fetched: 1, inserted: 0, updated: 1, skipped: 0 });
    expect(store.list()).toHaveLength(1);
    expect(store.list()[0]).toMatchObject({
      provider: "GOOGLE",
      provider_keyword_id: "3001",
      status: "PAUSED",
    });

    expect(fetchImpl).toHaveBeenCalledTimes(2);
    const [url, init] = fetchImpl.mock.calls[0];
    expect(String(url)).toContain("/customers/1234567890:search");
    expect(JSON.parse(String(init.body)).query).toBe(KEYWORD_GAQL);
    expect(JSON.stringify(init)).not.toMatch(/developer-token|private_key/i);
  });
});
