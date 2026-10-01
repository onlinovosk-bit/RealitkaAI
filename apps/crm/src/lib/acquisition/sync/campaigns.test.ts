import { afterEach, describe, expect, it, vi } from "vitest";
import {
  GOOGLE_ADS_API_VERSION,
  GoogleAdsClient,
  resetGoogleAdsRateLimitState,
} from "../google-ads-client";
import {
  ACQUISITION_PROVIDER_GOOGLE,
  CAMPAIGN_SYNC_GAQL,
  type AcquisitionCampaignRecord,
  type CampaignStore,
  mapGoogleCampaignResult,
  syncGoogleCampaigns,
} from "./campaigns";

function mockResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => (typeof body === "string" ? body : JSON.stringify(body)),
  } as Response;
}

function createClient(
  overrides: Partial<ConstructorParameters<typeof GoogleAdsClient>[0]> = {},
) {
  const fetchImpl =
    overrides.fetchImpl ??
    vi.fn().mockResolvedValue(mockResponse(200, { results: [] }));
  const sleep = overrides.sleep ?? vi.fn().mockResolvedValue(undefined);

  return {
    client: new GoogleAdsClient({
      agencyId: "agency-a",
      customerId: "123-456-7890",
      auth: {
        getAccessToken: async () => "test-access-token",
        getDeveloperToken: async () => "test-dev-token",
      },
      rateLimitPerTenant: 100,
      maxAttempts: 3,
      initialBackoffMs: 100,
      baseUrl: "https://ads.example.test",
      fetchImpl,
      sleep,
      ...overrides,
    }),
    fetchImpl,
  };
}

function createMemoryCampaignStore() {
  const rows = new Map<string, AcquisitionCampaignRecord>();
  const store: CampaignStore = {
    upsert(row) {
      const key = `${row.provider}:${row.provider_campaign_id}`;
      const prev = rows.get(key);
      const next = prev ? { ...prev, ...row } : { ...row };
      rows.set(key, next);
      return next;
    },
  };
  return { rows, store };
}

const SEARCH_PAYLOAD = {
  results: [
    {
      campaign: {
        resourceName: "customers/1234567890/campaigns/111",
        id: "111",
        name: "Seller Search SK",
        status: "ENABLED",
        advertisingChannelType: "SEARCH",
        biddingStrategyType: "MAXIMIZE_CONVERSIONS",
      },
      campaignBudget: { amountMicros: "50000000" },
      customer: { currencyCode: "EUR" },
    },
  ],
};

describe("syncGoogleCampaigns", () => {
  afterEach(() => {
    resetGoogleAdsRateLimitState();
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("maps a mocked Google search payload into campaign upserts", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(mockResponse(200, SEARCH_PAYLOAD));
    const { client } = createClient({ fetchImpl });
    const { rows, store } = createMemoryCampaignStore();

    const result = await syncGoogleCampaigns({
      client,
      store,
      agencyId: "agency-a",
      acquisitionAccountId: "acct-1",
      now: () => new Date("2026-08-15T12:00:00.000Z"),
    });

    expect(result).toEqual({ fetched: 1, upserted: 1, skipped: 0 });
    expect(rows.size).toBe(1);
    expect(rows.get("GOOGLE:111")).toEqual({
      agency_id: "agency-a",
      acquisition_account_id: "acct-1",
      provider: ACQUISITION_PROVIDER_GOOGLE,
      provider_campaign_id: "111",
      name: "Seller Search SK",
      status: "ENABLED",
      objective: "SEARCH",
      daily_budget: 50,
      currency: "EUR",
      bidding_strategy: "MAXIMIZE_CONVERSIONS",
      last_synced_at: "2026-08-15T12:00:00.000Z",
    });
  });

  it("second sync of the same provider_campaign_id does not duplicate", async () => {
    const firstPayload = SEARCH_PAYLOAD;
    const secondPayload = {
      results: [
        {
          campaign: {
            id: "111",
            name: "Seller Search SK v2",
            status: "PAUSED",
            advertisingChannelType: "SEARCH",
            biddingStrategyType: "TARGET_CPA",
          },
          campaignBudget: { amountMicros: "75000000" },
          customer: { currencyCode: "EUR" },
        },
      ],
    };

    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(mockResponse(200, firstPayload))
      .mockResolvedValueOnce(mockResponse(200, secondPayload));
    const { client } = createClient({ fetchImpl });
    const { rows, store } = createMemoryCampaignStore();

    await syncGoogleCampaigns({
      client,
      store,
      agencyId: "agency-a",
      acquisitionAccountId: "acct-1",
      now: () => new Date("2026-08-15T12:00:00.000Z"),
    });
    await syncGoogleCampaigns({
      client,
      store,
      agencyId: "agency-a",
      acquisitionAccountId: "acct-1",
      now: () => new Date("2026-08-15T13:00:00.000Z"),
    });

    expect(rows.size).toBe(1);
    const row = rows.get("GOOGLE:111");
    expect(row?.name).toBe("Seller Search SK v2");
    expect(row?.status).toBe("PAUSED");
    expect(row?.daily_budget).toBe(75);
    expect(row?.bidding_strategy).toBe("TARGET_CPA");
    expect(row?.last_synced_at).toBe("2026-08-15T13:00:00.000Z");
  });

  it("calls client.search via mocked fetch - no real HTTP", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(mockResponse(200, SEARCH_PAYLOAD));
    const { client } = createClient({ fetchImpl });
    const searchSpy = vi.spyOn(client, "search");
    const { store } = createMemoryCampaignStore();

    await syncGoogleCampaigns({
      client,
      store,
      agencyId: "agency-a",
      acquisitionAccountId: "acct-1",
    });

    expect(searchSpy).toHaveBeenCalledTimes(1);
    expect(searchSpy).toHaveBeenCalledWith(CAMPAIGN_SYNC_GAQL);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0];
    expect(String(url)).toBe(`https://ads.example.test/${GOOGLE_ADS_API_VERSION}/customers/1234567890/googleAds:search`);
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toEqual({ query: CAMPAIGN_SYNC_GAQL });
  });

  it("does not leak credentials in thrown errors", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(mockResponse(401, { error: { message: "unauthorized" } }));
    const { client } = createClient({
      fetchImpl,
      auth: { getAccessToken: async () => "super-secret-token-never-log" },
      maxAttempts: 1,
    });
    const { store } = createMemoryCampaignStore();

    let caught: unknown;
    try {
      await syncGoogleCampaigns({
        client,
        store,
        agencyId: "agency-a",
        acquisitionAccountId: "acct-1",
      });
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(Error);
    expect(String(caught)).not.toContain("super-secret-token-never-log");
    expect((caught as Error).message).not.toContain("super-secret-token-never-log");
  });

  it("skips rows without a campaign id", async () => {
    const search = vi.fn().mockResolvedValue({
      results: [{ campaign: { name: "orphan" } }],
    });
    const { rows, store } = createMemoryCampaignStore();

    const result = await syncGoogleCampaigns({
      client: { search },
      store,
      agencyId: "agency-a",
      acquisitionAccountId: "acct-1",
    });

    expect(result).toEqual({ fetched: 1, upserted: 0, skipped: 1 });
    expect(rows.size).toBe(0);
    expect(search).toHaveBeenCalledTimes(1);
  });
});

describe("mapGoogleCampaignResult", () => {
  it("falls back to resourceName and snake_case fields", () => {
    const mapped = mapGoogleCampaignResult(
      {
        campaign: {
          resource_name: "customers/1/campaigns/222",
          name: "PMax",
          status: "ENABLED",
          advertising_channel_type: "PERFORMANCE_MAX",
          bidding_strategy_type: "MAXIMIZE_CONVERSIONS",
        },
        campaign_budget: { amount_micros: 1_000_000 },
        customer: { currency_code: "CZK" },
      },
      {
        agencyId: "agency-a",
        acquisitionAccountId: "acct-1",
        lastSyncedAt: "2026-08-15T12:00:00.000Z",
      },
    );

    expect(mapped?.provider_campaign_id).toBe("222");
    expect(mapped?.objective).toBe("PERFORMANCE_MAX");
    expect(mapped?.daily_budget).toBe(1);
    expect(mapped?.currency).toBe("CZK");
  });
});
