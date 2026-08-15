import { afterEach, describe, expect, it, vi } from "vitest";
import {
  GoogleAdsClient,
  resetGoogleAdsRateLimitState,
} from "../google-ads-client";
import {
  ACQUISITION_PROVIDER_GOOGLE,
  AD_GROUP_SYNC_GAQL,
  type AcquisitionAdGroupRecord,
  type AdGroupStore,
  mapGoogleAdGroupResult,
  syncGoogleAdGroups,
} from "./ad-groups";

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

function createMemoryAdGroupStore() {
  const rows = new Map<string, AcquisitionAdGroupRecord>();
  const store: AdGroupStore = {
    upsert(row) {
      const key = `${row.provider}:${row.provider_ad_group_id}`;
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
      adGroup: {
        resourceName: "customers/1234567890/adGroups/555",
        id: "555",
        name: "Brand SK",
        status: "ENABLED",
        campaign: "customers/1234567890/campaigns/111",
      },
      campaign: { id: "111" },
    },
  ],
};

describe("syncGoogleAdGroups", () => {
  afterEach(() => {
    resetGoogleAdsRateLimitState();
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("maps a mocked Google search payload into ad group upserts", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(mockResponse(200, SEARCH_PAYLOAD));
    const { client } = createClient({ fetchImpl });
    const { rows, store } = createMemoryAdGroupStore();

    const result = await syncGoogleAdGroups({
      client,
      store,
      agencyId: "agency-a",
      acquisitionAccountId: "acct-1",
      now: () => new Date("2026-08-15T12:00:00.000Z"),
    });

    expect(result).toEqual({ fetched: 1, upserted: 1, skipped: 0 });
    expect(rows.size).toBe(1);
    expect(rows.get("GOOGLE:555")).toEqual({
      agency_id: "agency-a",
      acquisition_account_id: "acct-1",
      provider: ACQUISITION_PROVIDER_GOOGLE,
      provider_ad_group_id: "555",
      provider_campaign_id: "111",
      name: "Brand SK",
      status: "ENABLED",
      last_synced_at: "2026-08-15T12:00:00.000Z",
    });
  });

  it("second sync of the same provider_ad_group_id does not duplicate", async () => {
    const secondPayload = {
      results: [
        {
          adGroup: {
            id: "555",
            name: "Brand SK v2",
            status: "PAUSED",
          },
          campaign: { id: "111" },
        },
      ],
    };

    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(mockResponse(200, SEARCH_PAYLOAD))
      .mockResolvedValueOnce(mockResponse(200, secondPayload));
    const { client } = createClient({ fetchImpl });
    const { rows, store } = createMemoryAdGroupStore();

    await syncGoogleAdGroups({
      client,
      store,
      agencyId: "agency-a",
      acquisitionAccountId: "acct-1",
      now: () => new Date("2026-08-15T12:00:00.000Z"),
    });
    await syncGoogleAdGroups({
      client,
      store,
      agencyId: "agency-a",
      acquisitionAccountId: "acct-1",
      now: () => new Date("2026-08-15T13:00:00.000Z"),
    });

    expect(rows.size).toBe(1);
    const row = rows.get("GOOGLE:555");
    expect(row?.name).toBe("Brand SK v2");
    expect(row?.status).toBe("PAUSED");
    expect(row?.last_synced_at).toBe("2026-08-15T13:00:00.000Z");
  });

  it("calls client.search via mocked fetch - no real HTTP", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(mockResponse(200, SEARCH_PAYLOAD));
    const { client } = createClient({ fetchImpl });
    const searchSpy = vi.spyOn(client, "search");
    const { store } = createMemoryAdGroupStore();

    await syncGoogleAdGroups({
      client,
      store,
      agencyId: "agency-a",
      acquisitionAccountId: "acct-1",
    });

    expect(searchSpy).toHaveBeenCalledTimes(1);
    expect(searchSpy).toHaveBeenCalledWith(AD_GROUP_SYNC_GAQL);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0];
    expect(String(url)).toBe(
      "https://ads.example.test/v18/customers/1234567890:search",
    );
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toEqual({ query: AD_GROUP_SYNC_GAQL });
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
    const { store } = createMemoryAdGroupStore();

    let caught: unknown;
    try {
      await syncGoogleAdGroups({
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
  });
});

describe("mapGoogleAdGroupResult", () => {
  it("falls back to snake_case ad_group and campaign resource name", () => {
    const mapped = mapGoogleAdGroupResult(
      {
        ad_group: {
          resource_name: "customers/1/adGroups/777",
          name: "Generic",
          status: "ENABLED",
        },
        campaign: { resource_name: "customers/1/campaigns/333" },
      },
      {
        agencyId: "agency-a",
        acquisitionAccountId: "acct-1",
        lastSyncedAt: "2026-08-15T12:00:00.000Z",
      },
    );

    expect(mapped?.provider_ad_group_id).toBe("777");
    expect(mapped?.provider_campaign_id).toBe("333");
    expect(mapped?.provider).toBe("GOOGLE");
  });
});
