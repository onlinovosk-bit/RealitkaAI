import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const TEST_KEY = "test-demo-capture-key";

const mocks = vi.hoisted(() => ({
  createAdminClient: vi.fn(),
  insert: vi.fn(),
  syncLeadToHubSpot: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createAdminClient: mocks.createAdminClient,
}));

vi.mock("@/lib/hubspot/sync", () => ({
  syncLeadToHubSpot: mocks.syncLeadToHubSpot,
}));

import { POST } from "../route";

const VALID_BODY = {
  email: "lead@example.com",
  address: "Hlavna 1",
  source: "ai_odhadca",
  estimatedPrice: 123000,
  gdprConsent: true,
};

function makeRequest(opts?: { key?: string | null; body?: unknown }) {
  const headers = new Headers({ "content-type": "application/json" });
  if (opts?.key !== null && opts?.key !== undefined) {
    headers.set("x-api-key", opts.key);
  }
  return new Request("http://localhost/api/demo/capture-lead", {
    method: "POST",
    headers,
    body: JSON.stringify(opts?.body ?? VALID_BODY),
  });
}

describe("POST /api/demo/capture-lead fail-closed auth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    delete process.env.DEMO_CAPTURE_API_KEY;
    mocks.syncLeadToHubSpot.mockResolvedValue({ ok: true });
    mocks.insert.mockReturnValue({
      select: () => ({
        single: async () => ({ data: { id: "lead-1" }, error: null }),
      }),
    });
    mocks.createAdminClient.mockReturnValue({
      from: () => ({ insert: mocks.insert }),
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    delete process.env.DEMO_CAPTURE_API_KEY;
  });

  it("env unset -> rejected, DB insert mock NOT called", async () => {
    expect(process.env.DEMO_CAPTURE_API_KEY).toBeUndefined();

    const res = await POST(makeRequest({ key: TEST_KEY }));

    expect(res.status).toBe(503);
    await expect(res.json()).resolves.toEqual({
      ok: false,
      error: "Service unavailable",
    });
    expect(mocks.createAdminClient).not.toHaveBeenCalled();
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("env empty -> rejected, DB insert mock NOT called", async () => {
    vi.stubEnv("DEMO_CAPTURE_API_KEY", "");

    const res = await POST(makeRequest({ key: TEST_KEY }));

    expect(res.status).toBe(503);
    expect(mocks.createAdminClient).not.toHaveBeenCalled();
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("env set + wrong key -> 401, insert NOT called", async () => {
    vi.stubEnv("DEMO_CAPTURE_API_KEY", TEST_KEY);

    const res = await POST(makeRequest({ key: "wrong-key" }));

    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({
      ok: false,
      error: "Unauthorized",
    });
    expect(mocks.createAdminClient).not.toHaveBeenCalled();
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("env set + missing key -> 401, insert NOT called", async () => {
    vi.stubEnv("DEMO_CAPTURE_API_KEY", TEST_KEY);

    const res = await POST(makeRequest({ key: null }));

    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({
      ok: false,
      error: "Unauthorized",
    });
    expect(mocks.createAdminClient).not.toHaveBeenCalled();
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("env set + correct key -> existing success path still works", async () => {
    vi.stubEnv("DEMO_CAPTURE_API_KEY", TEST_KEY);

    const res = await POST(makeRequest({ key: TEST_KEY }));

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true, duplicate: false });
    expect(mocks.createAdminClient).toHaveBeenCalledTimes(1);
    expect(mocks.insert).toHaveBeenCalledTimes(1);
    expect(mocks.insert.mock.calls[0]?.[0]).toMatchObject({
      email: "lead@example.com",
      gdpr_consent: true,
    });
  });
});
