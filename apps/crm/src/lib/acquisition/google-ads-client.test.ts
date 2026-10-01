import { afterEach, describe, expect, it, vi } from "vitest";
import {
  computeBackoffMs,
  DEFAULT_GOOGLE_ADS_RATE_LIMIT_PER_TENANT,
  GOOGLE_ADS_API_VERSION,
  GoogleAdsClient,
  GoogleAdsRateLimitError,
  GoogleAdsRequestError,
  resetGoogleAdsRateLimitState,
  resolveRateLimitPerTenant,
} from "./google-ads-client";

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
      fetchImpl,
      sleep,
      ...overrides,
    }),
    fetchImpl,
    sleep,
  };
}

describe("google-ads-client", () => {
  afterEach(() => {
    resetGoogleAdsRateLimitState();
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  describe("computeBackoffMs / resolveRateLimitPerTenant", () => {
    it("backoff grows exponentially", () => {
      const initial = 100;
      const delays = [0, 1, 2, 3].map((i) => computeBackoffMs(i, initial));
      expect(delays).toEqual([100, 200, 400, 800]);
      expect(delays[1]).toBe(delays[0] * 2);
      expect(delays[2]).toBe(delays[1] * 2);
      expect(delays[3]).toBe(delays[2] * 2);
    });

    it("uses GOOGLE_ADS_RATE_LIMIT_PER_TENANT env with sensible default", () => {
      expect(resolveRateLimitPerTenant(undefined)).toBe(
        DEFAULT_GOOGLE_ADS_RATE_LIMIT_PER_TENANT,
      );
      expect(resolveRateLimitPerTenant("")).toBe(
        DEFAULT_GOOGLE_ADS_RATE_LIMIT_PER_TENANT,
      );
      expect(resolveRateLimitPerTenant("not-a-number")).toBe(
        DEFAULT_GOOGLE_ADS_RATE_LIMIT_PER_TENANT,
      );
      expect(resolveRateLimitPerTenant("25")).toBe(25);

      vi.stubEnv("GOOGLE_ADS_RATE_LIMIT_PER_TENANT", "12");
      const { client } = createClient({ rateLimitPerTenant: undefined });
      expect(client.getRateLimitPerTenant()).toBe(12);
    });
  });

  it("rate limit blocks over limit", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(mockResponse(200, { ok: true }));
    const { client } = createClient({
      agencyId: "agency-rate",
      rateLimitPerTenant: 2,
      fetchImpl,
    });

    await client.request("campaigns:search", { method: "POST", body: "{}" });
    await client.request("campaigns:search", { method: "POST", body: "{}" });

    await expect(
      client.request("campaigns:search", { method: "POST", body: "{}" }),
    ).rejects.toBeInstanceOf(GoogleAdsRateLimitError);

    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("applies exponential backoff delays between retries", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(mockResponse(503, { error: "temporary" }))
      .mockResolvedValueOnce(mockResponse(503, { error: "temporary" }))
      .mockResolvedValueOnce(mockResponse(200, { results: [1] }));
    const sleep = vi.fn().mockResolvedValue(undefined);

    const { client } = createClient({
      agencyId: "agency-backoff",
      fetchImpl,
      sleep,
      maxAttempts: 3,
      initialBackoffMs: 50,
    });

    const result = await client.request(":search", {
      method: "POST",
      body: JSON.stringify({ query: "SELECT 1" }),
    });

    expect(result.body).toEqual({ results: [1] });
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(sleep.mock.calls.map((c) => c[0])).toEqual([50, 100]);
  });

  it("retry gives up after max attempts", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(mockResponse(503, { error: "still down" }));
    const sleep = vi.fn().mockResolvedValue(undefined);

    const { client } = createClient({
      agencyId: "agency-max",
      fetchImpl,
      sleep,
      maxAttempts: 3,
      initialBackoffMs: 10,
    });

    await expect(
      client.request(":search", { method: "POST", body: "{}" }),
    ).rejects.toMatchObject({
      name: "GoogleAdsRequestError",
      code: "GOOGLE_ADS_REQUEST_FAILED",
      attempts: 3,
      status: 503,
      message: "still down",
    });

    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(sleep).toHaveBeenCalledTimes(2);
  });

  it("errors are not swallowed silently", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(mockResponse(400, { error: { message: "bad GAQL" } }));

    const { client } = createClient({
      agencyId: "agency-err",
      fetchImpl,
      maxAttempts: 3,
    });

    let caught: unknown;
    try {
      await client.request(":search", { method: "POST", body: "{}" });
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(GoogleAdsRequestError);
    expect(caught).toMatchObject({
      message: "bad GAQL",
      status: 400,
      attempts: 1,
    });
    // Non-retryable 4xx must fail fast — no silent empty result.
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("propagates network failures after exhausting retries", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error("network down"));
    const sleep = vi.fn().mockResolvedValue(undefined);

    const { client } = createClient({
      agencyId: "agency-net",
      fetchImpl,
      sleep,
      maxAttempts: 2,
      initialBackoffMs: 5,
    });

    await expect(client.request("googleAds:search")).rejects.toEqual(
      expect.objectContaining({
        name: "GoogleAdsRequestError",
        message: "network down",
        attempts: 2,
      }),
    );
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("injects bearer token without reading credential env vars", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(mockResponse(200, { results: [] }));
    const getAccessToken = vi.fn().mockResolvedValue("injected-token");

    const { client } = createClient({
      agencyId: "agency-auth",
      auth: { getAccessToken },
      fetchImpl,
      loginCustomerId: "9998887777",
    });

    await client.search("SELECT campaign.id FROM campaign");

    expect(getAccessToken).toHaveBeenCalledTimes(1);
    const [, init] = fetchImpl.mock.calls[0];
    const headers = new Headers(init.headers);
    expect(headers.get("Authorization")).toBe("Bearer injected-token");
    expect(headers.get("login-customer-id")).toBe("9998887777");
    expect(fetchImpl.mock.calls[0][0]).toContain(
      `/${GOOGLE_ADS_API_VERSION}/customers/1234567890/googleAds:search`,
    );
  });
  it("search() posts GAQL to /googleAds:search", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(mockResponse(200, { results: [] }));
    const { client } = createClient({ fetchImpl });
    await client.search("SELECT campaign.id FROM campaign");
    const url = String(fetchImpl.mock.calls[0][0]);
    expect(url).toContain("/googleAds:search");
    expect(url).not.toMatch(/customers\/\d+:search(?:\?|$)/);
  });

});
