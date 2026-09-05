import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const SESSION_ID = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";

const mockFrom = vi.hoisted(() => vi.fn());
const mockRateLimit = vi.hoisted(() =>
  vi.fn().mockResolvedValue({ allowed: true }),
);
const mockCreateServiceRoleClient = vi.hoisted(() =>
  vi.fn(() => ({ from: (...args: unknown[]) => mockFrom(...args) })),
);

vi.mock("@/lib/supabase/admin", () => ({
  createServiceRoleClient: (...args: unknown[]) =>
    mockCreateServiceRoleClient(...args),
}));

vi.mock("@/lib/rate-limit", () => ({
  rateLimit: (...args: unknown[]) => mockRateLimit(...args),
}));

function chainSelect(result: { data: unknown; error: unknown }) {
  return {
    select: () => ({
      eq: () => ({
        maybeSingle: async () => result,
      }),
    }),
    upsert: () => ({
      select: () => ({
        maybeSingle: async () => result,
      }),
    }),
  };
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
          updated_at: "2026-09-04T12:00:00.000Z",
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

  it("GET returns one session by session_id", async () => {
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
  });

  it("PUT is denied (no listing/bulk)", async () => {
    const { PUT } = await import("../route");
    const res = await PUT();
    expect(res.status).toBe(405);
  });
});