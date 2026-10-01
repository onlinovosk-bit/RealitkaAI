import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ONBOARDING_SESSION_MAX_AGE_MS } from "@/lib/onboarding/session-api";

const SESSION_ID = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";

const mockFrom = vi.hoisted(() => vi.fn());
const mockRateLimit = vi.hoisted(() =>
  vi.fn().mockResolvedValue({ allowed: true }),
);
const mockCreateServiceRoleClient = vi.hoisted(() =>
  vi.fn(() => ({ from: (...args: unknown[]) => mockFrom(...args) })),
);

vi.mock("@/lib/supabase/admin", () => ({
  createServiceRoleClient: () => mockCreateServiceRoleClient(),
}));

vi.mock("@/lib/rate-limit", () => ({
  rateLimit: (...args: [string, number, number]) => mockRateLimit(...args),
}));

function chainSelect(result: { data: unknown; error: unknown }) {
  const terminal = {
    maybeSingle: async () => result,
  };
  return {
    select: () => ({
      eq: () => ({
        gt: () => terminal,
        maybeSingle: terminal.maybeSingle,
      }),
    }),
    upsert: () => ({
      select: () => ({
        maybeSingle: async () => result,
      }),
    }),
  };
}

function freshUpdatedAt() {
  return new Date().toISOString();
}

function staleUpdatedAt() {
  return new Date(Date.now() - ONBOARDING_SESSION_MAX_AGE_MS - 60_000).toISOString();
}

describe("/api/onboarding/session", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRateLimit.mockResolvedValue({ allowed: true });
    mockCreateServiceRoleClient.mockReturnValue({
      from: (...args: unknown[]) => mockFrom(...args),
    });
    mockFrom.mockImplementation(() =>
      chainSelect({
        data: {
          session_id: SESSION_ID,
          step: 2,
          form_data: { name: "Test" },
          updated_at: freshUpdatedAt(),
        },
        error: null,
      }),
    );
  });

  afterEach(() => {
    vi.resetModules();
  });

  it("GET rejects missing session_id (no list-all)", async () => {
    const { GET } = await import("../route");
    const res = await GET(
      new Request("http://localhost/api/onboarding/session", {
        headers: { "x-forwarded-for": "10.0.0.1" },
      }),
    );
    expect(res.status).toBe(400);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("GET rejects non-uuid session_id", async () => {
    const { GET } = await import("../route");
    const res = await GET(
      new Request("http://localhost/api/onboarding/session?session_id=not-a-uuid", {
        headers: { "x-forwarded-for": "10.0.0.1" },
      }),
    );
    expect(res.status).toBe(400);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("GET returns one fresh session by session_id", async () => {
    const { GET } = await import("../route");
    const res = await GET(
      new Request(
        `http://localhost/api/onboarding/session?session_id=${SESSION_ID}`,
        { headers: { "x-forwarded-for": "10.0.0.1" } },
      ),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.session.session_id).toBe(SESSION_ID);
    expect(mockFrom).toHaveBeenCalledWith("onboarding_sessions");
  });

  it("GET returns 404 when session is older than max age (V1)", async () => {
    mockFrom.mockImplementation(() =>
      chainSelect({
        data: {
          session_id: SESSION_ID,
          step: 2,
          form_data: { name: "Test", phone: "+421900000000" },
          updated_at: staleUpdatedAt(),
        },
        error: null,
      }),
    );
    const { GET } = await import("../route");
    const res = await GET(
      new Request(
        `http://localhost/api/onboarding/session?session_id=${SESSION_ID}`,
        { headers: { "x-forwarded-for": "10.0.0.1" } },
      ),
    );
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.ok).toBe(false);
  });

  it("GET returns 404 when DB filter yields no row (expired/missing)", async () => {
    mockFrom.mockImplementation(() =>
      chainSelect({
        data: null,
        error: null,
      }),
    );
    const { GET } = await import("../route");
    const res = await GET(
      new Request(
        `http://localhost/api/onboarding/session?session_id=${SESSION_ID}`,
        { headers: { "x-forwarded-for": "10.0.0.1" } },
      ),
    );
    expect(res.status).toBe(404);
  });

  it("sets Referrer-Policy: no-referrer on GET responses (V2)", async () => {
    const { GET } = await import("../route");
    const res = await GET(
      new Request(
        `http://localhost/api/onboarding/session?session_id=${SESSION_ID}`,
        { headers: { "x-forwarded-for": "10.0.0.1" } },
      ),
    );
    expect(res.headers.get("Referrer-Policy")).toBe("no-referrer");
  });

  it("POST upserts by session_id (happy path)", async () => {
    const { POST } = await import("../route");
    const res = await POST(
      new Request("http://localhost/api/onboarding/session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-forwarded-for": "10.0.0.2",
        },
        body: JSON.stringify({
          session_id: SESSION_ID,
          step: 3,
          form_data: { agencyName: "Demo" },
        }),
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.session.session_id).toBe(SESSION_ID);
    expect(mockFrom).toHaveBeenCalledWith("onboarding_sessions");
    expect(res.headers.get("Referrer-Policy")).toBe("no-referrer");
  });

  it("POST rejects invalid uuid", async () => {
    const { POST } = await import("../route");
    const res = await POST(
      new Request("http://localhost/api/onboarding/session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-forwarded-for": "10.0.0.2",
        },
        body: JSON.stringify({
          session_id: "bad",
          step: 1,
          form_data: {},
        }),
      }),
    );
    expect(res.status).toBe(400);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("returns 429 when rate-limited", async () => {
    mockRateLimit.mockResolvedValueOnce({ allowed: false });
    const { GET } = await import("../route");
    const res = await GET(
      new Request(
        `http://localhost/api/onboarding/session?session_id=${SESSION_ID}`,
        { headers: { "x-forwarded-for": "10.0.0.9" } },
      ),
    );
    expect(res.status).toBe(429);
    expect(mockFrom).not.toHaveBeenCalled();
    expect(res.headers.get("Referrer-Policy")).toBe("no-referrer");
  });

  it("PUT is denied (no listing/bulk)", async () => {
    const { PUT } = await import("../route");
    const res = await PUT();
    expect(res.status).toBe(405);
  });
});
