import { afterEach, describe, expect, it, vi } from "vitest";
import {
  GoogleAdsClient,
  resetGoogleAdsRateLimitState,
} from "../google-ads-client";
import {
  ACQUISITION_PROVIDER_GOOGLE,
  AD_GROUP_METRICS_GAQL,
  CAMPAIGN_METRICS_GAQL,
  metricsUpsertKey,
  normalizeMetricsRow,
  syncMetrics,
  type MetricsRecord,
  type MetricsStore,
} from "./metrics";

function mockResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
  } as Response;
}

function createMemoryStore(): MetricsStore & { rows: Map<string, MetricsRecord> } {
  const rows = new Map<string, MetricsRecord>();
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
    agencyId: "agency-metrics",
    customerId: "123-456-7890",
    auth: { getAccessToken: async () => "test-access-token" },
    rateLimitPerTenant: 100,
    fetchImpl,
    sleep: vi.fn().mockResolvedValue(undefined),
  });
}

const MOCK_CAMPAIGN_METRICS = {
  campaign: { id: "1001" },
  segments: { date: "2026-08-14" },
  metrics: {
    impressions: "120",
    clicks: "8",
    costMicros: "4500000",
    conversions: "1.0",
  },
};

const MOCK_AD_GROUP_METRICS = {
  adGroup: { id: "2001" },
  segments: { date: "2026-08-14" },
  metrics: {
    impressions: "90",
    clicks: "6",
    costMicros: "3100000",
    conversions: "0.5",
  },
};

describe("sync/metrics", () => {
  afterEach(() => {
    resetGoogleAdsRateLimitState();
    vi.restoreAllMocks();
  });

  it("maps GAQL-shaped campaign and ad-group snapshots", () => {
    const campaign = normalizeMetricsRow(MOCK_CAMPAIGN_METRICS, "campaign");
    const adGroup = normalizeMetricsRow(MOCK_AD_GROUP_METRICS, "ad_group");

    expect(campaign).toEqual({
      provider: ACQUISITION_PROVIDER_GOOGLE,
      entity_type: "campaign",
      provider_id: "1001",
      date: "2026-08-14",
      impressions: 120,
      clicks: 8,
      cost_micros: 4_500_000,
      conversions: 1,
    });
    expect(adGroup).toMatchObject({
      entity_type: "ad_group",
      provider_id: "2001",
      conversions: 0.5,
    });
    expect(metricsUpsertKey(campaign!)).toBe("campaign|1001|2026-08-14");
    expect(metricsUpsertKey(adGroup!)).toBe("ad_group|2001|2026-08-14");
  });

  it("syncs via mocked GoogleAdsClient.search and is idempotent on a second run", async () => {
    const fetchImpl = vi.fn(async (_url: string, init?: RequestInit) => {
      const query = JSON.parse(String(init?.body ?? "{}")).query as string;
      if (query.includes("FROM campaign")) {
        return mockResponse(200, { results: [MOCK_CAMPAIGN_METRICS] });
      }
      if (query.includes("FROM ad_group")) {
        return mockResponse(200, { results: [MOCK_AD_GROUP_METRICS] });
      }
      return mockResponse(200, { results: [] });
    });

    const client = createClient(fetchImpl);
    const store = createMemoryStore();

    const first = await syncMetrics({ client, store });
    expect(first).toEqual({ fetched: 2, inserted: 2, updated: 0, skipped: 0 });
    expect(store.list()).toHaveLength(2);

    fetchImpl.mockImplementation(async (_url: string, init?: RequestInit) => {
      const query = JSON.parse(String(init?.body ?? "{}")).query as string;
      if (query.includes("FROM campaign")) {
        return mockResponse(200, {
          results: [
            {
              ...MOCK_CAMPAIGN_METRICS,
              metrics: {
                ...MOCK_CAMPAIGN_METRICS.metrics,
                clicks: "11",
                costMicros: "5100000",
              },
            },
          ],
        });
      }
      if (query.includes("FROM ad_group")) {
        return mockResponse(200, {
          results: [
            {
              ...MOCK_AD_GROUP_METRICS,
              metrics: {
                ...MOCK_AD_GROUP_METRICS.metrics,
                clicks: "9",
              },
            },
          ],
        });
      }
      return mockResponse(200, { results: [] });
    });

    const second = await syncMetrics({ client, store });
    expect(second).toEqual({ fetched: 2, inserted: 0, updated: 2, skipped: 0 });
    expect(store.list()).toHaveLength(2);

    const campaign = store
      .list()
      .find((row) => row.entity_type === "campaign");
    const adGroup = store.list().find((row) => row.entity_type === "ad_group");
    expect(campaign).toMatchObject({
      provider: "GOOGLE",
      provider_id: "1001",
      date: "2026-08-14",
      clicks: 11,
      cost_micros: 5_100_000,
    });
    expect(adGroup).toMatchObject({
      provider: "GOOGLE",
      provider_id: "2001",
      clicks: 9,
    });

    expect(fetchImpl).toHaveBeenCalledTimes(4);
    const queries = fetchImpl.mock.calls.map(([, init]) =>
      JSON.parse(String((init as RequestInit).body)).query,
    );
    expect(queries).toEqual([
      CAMPAIGN_METRICS_GAQL,
      AD_GROUP_METRICS_GAQL,
      CAMPAIGN_METRICS_GAQL,
      AD_GROUP_METRICS_GAQL,
    ]);
    expect(JSON.stringify(fetchImpl.mock.calls)).not.toMatch(
      /developer-token|private_key/i,
    );
  });
});
