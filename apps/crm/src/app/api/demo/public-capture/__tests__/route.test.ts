import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const TEST_KEY = "test-demo-capture-key";

const mocks = vi.hoisted(() => ({
  captureLead: vi.fn(),
  rateLimit: vi.fn(),
  incrementUsageMetric: vi.fn(),
}));

vi.mock("../../capture-lead/route", () => ({
  POST: mocks.captureLead,
}));

vi.mock("@/lib/rate-limit", () => ({
  rateLimit: mocks.rateLimit,
}));

vi.mock("@/lib/usage-metrics", () => ({
  SYSTEM_USAGE_AGENCY_ID: "00000000-0000-0000-0000-000000000001",
  incrementUsageMetric: mocks.incrementUsageMetric,
}));

import { POST } from "../route";
import { SYSTEM_USAGE_AGENCY_ID } from "@/lib/usage-metrics";

const VALID = {
  email: " Lead@Example.com ",
  address: "Sabinovská 12, Prešov",
  source: "hero_email_capture",
  estimatedPrice: 150000,
  gdprConsent: true,
  website: "",
};

function makeRequest(opts?: { body?: unknown; ip?: string; raw?: string }) {
  const headers = new Headers({ "content-type": "application/json" });
  if (opts?.ip) headers.set("x-forwarded-for", opts.ip);
  return new Request("http://localhost/api/demo/public-capture", {
    method: "POST",
    headers,
    body: opts?.raw ?? JSON.stringify(opts?.body ?? VALID),
  });
}

function allowAll() {
  mocks.rateLimit.mockResolvedValue({ allowed: true, remaining: 1 });
}

describe("POST /api/demo/public-capture", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    delete process.env.DEMO_CAPTURE_API_KEY;
    allowAll();
    mocks.incrementUsageMetric.mockResolvedValue(undefined);
    mocks.captureLead.mockResolvedValue(
      new Response(JSON.stringify({ ok: true, duplicate: false }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    delete process.env.DEMO_CAPTURE_API_KEY;
    vi.restoreAllMocks();
  });

  it("neplatný JSON → 400, bez rate limit a bez capture", async () => {
    const res = await POST(makeRequest({ raw: "{" }));

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ ok: false, error: "Invalid JSON body" });
    expect(mocks.rateLimit).not.toHaveBeenCalled();
    expect(mocks.captureLead).not.toHaveBeenCalled();
    expect(mocks.incrementUsageMetric).not.toHaveBeenCalled();
  });

  it("neplatný email, source a gdpr → 400 bez zápisu", async () => {
    for (const body of [
      { ...VALID, email: "nie-email" },
      { ...VALID, source: "iny" },
      { ...VALID, gdprConsent: false },
      { ...VALID, gdprConsent: "true" },
    ]) {
      vi.clearAllMocks();
      allowAll();
      const res = await POST(makeRequest({ body }));
      expect(res.status).toBe(400);
      expect(mocks.rateLimit).not.toHaveBeenCalled();
      expect(mocks.captureLead).not.toHaveBeenCalled();
    }
  });

  it("honeypot website → 200 bez rate limit a bez capture", async () => {
    const res = await POST(makeRequest({ body: { ...VALID, website: "  bot  " } }));

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true, duplicate: false });
    expect(mocks.rateLimit).not.toHaveBeenCalled();
    expect(mocks.captureLead).not.toHaveBeenCalled();
    expect(mocks.incrementUsageMetric).not.toHaveBeenCalled();
  });

  it("IP limit → 429, email limit ani capture sa nevolajú", async () => {
    vi.stubEnv("DEMO_CAPTURE_API_KEY", TEST_KEY);
    mocks.rateLimit.mockResolvedValueOnce({ allowed: false, remaining: 0 });

    const res = await POST(makeRequest({ ip: "203.0.113.9, 10.0.0.1" }));

    expect(res.status).toBe(429);
    expect(mocks.rateLimit).toHaveBeenCalledTimes(1);
    expect(mocks.rateLimit).toHaveBeenCalledWith(
      "demo-public-capture:ip:203.0.113.9",
      8,
      60_000,
    );
    expect(mocks.captureLead).not.toHaveBeenCalled();
    expect(mocks.incrementUsageMetric).not.toHaveBeenCalled();
  });

  it("email limit → 429 bez capture", async () => {
    vi.stubEnv("DEMO_CAPTURE_API_KEY", TEST_KEY);
    mocks.rateLimit
      .mockResolvedValueOnce({ allowed: true, remaining: 7 })
      .mockResolvedValueOnce({ allowed: false, remaining: 0 });

    const res = await POST(makeRequest());

    expect(res.status).toBe(429);
    expect(mocks.rateLimit).toHaveBeenNthCalledWith(
      2,
      "demo-public-capture:email:lead@example.com",
      3,
      3_600_000,
    );
    expect(mocks.captureLead).not.toHaveBeenCalled();
  });

  it("chýbajúci kľúč → 503, capture sa nezavolá", async () => {
    const res = await POST(makeRequest());

    expect(res.status).toBe(503);
    await expect(res.json()).resolves.toEqual({
      ok: false,
      error: "Service unavailable",
    });
    expect(mocks.captureLead).not.toHaveBeenCalled();
    expect(mocks.incrementUsageMetric).not.toHaveBeenCalled();
  });

  it("prázdny kľúč → 503, capture sa nezavolá", async () => {
    vi.stubEnv("DEMO_CAPTURE_API_KEY", "");

    const res = await POST(makeRequest());

    expect(res.status).toBe(503);
    expect(mocks.captureLead).not.toHaveBeenCalled();
  });

  it("úspech: in-process capture s kľúčom, bez website, jedna metrika", async () => {
    vi.stubEnv("DEMO_CAPTURE_API_KEY", TEST_KEY);
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const res = await POST(makeRequest({ ip: "203.0.113.4" }));

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true, duplicate: false });
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(mocks.captureLead).toHaveBeenCalledTimes(1);

    const forwarded = mocks.captureLead.mock.calls[0][0] as Request;
    expect(forwarded.url).toBe("http://internal/api/demo/capture-lead");
    expect(forwarded.headers.get("x-api-key")).toBe(TEST_KEY);
    await expect(forwarded.json()).resolves.toEqual({
      email: "lead@example.com",
      address: "Sabinovská 12, Prešov",
      source: "hero_email_capture",
      estimatedPrice: 150000,
      gdprConsent: true,
    });
    expect(mocks.incrementUsageMetric).toHaveBeenCalledTimes(1);
    expect(mocks.incrementUsageMetric).toHaveBeenCalledWith({
      agencyId: SYSTEM_USAGE_AGENCY_ID,
      metric: "demo_public_capture",
    });
  });

  it("odmietnutie z capture-lead sa prenesie a metrika sa nezvýši", async () => {
    vi.stubEnv("DEMO_CAPTURE_API_KEY", TEST_KEY);
    mocks.captureLead.mockResolvedValue(
      new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), {
        status: 401,
        headers: { "content-type": "application/json" },
      }),
    );

    const res = await POST(makeRequest({ body: { ...VALID, website: "   " } }));

    expect(res.status).toBe(401);
    expect(mocks.captureLead).toHaveBeenCalledTimes(1);
    expect(mocks.incrementUsageMetric).not.toHaveBeenCalled();
  });
});
