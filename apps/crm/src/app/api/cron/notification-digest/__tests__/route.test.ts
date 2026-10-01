import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createAdminClient: vi.fn(() => ({})),
}));

vi.mock("@/lib/infra/notification-delivery", () => ({
  runUnreadNotificationDigest: vi.fn(async () => ({
    sent: false,
    reason: "nothing_to_digest",
    unreadCount: 0,
    markedRead: 0,
  })),
}));

vi.mock("@/lib/usage-metrics", () => ({
  SYSTEM_USAGE_AGENCY_ID: "00000000-0000-4000-8000-000000000000",
  incrementUsageMetric: vi.fn(async () => undefined),
}));

import { GET } from "@/app/api/cron/notification-digest/route";

function req(auth: string | null) {
  const headers = new Headers();
  if (auth) headers.set("authorization", auth);
  return new Request("http://localhost/api/cron/notification-digest", {
    method: "GET",
    headers,
  }) as unknown as import("next/server").NextRequest;
}

describe("GET /api/cron/notification-digest", () => {
  beforeEach(() => {
    process.env.CRON_SECRET = "test-cron-secret";
  });

  it("returns 401 without bearer", async () => {
    const res = await GET(req(null));
    expect(res.status).toBe(401);
  });

  it("returns 401 with wrong bearer", async () => {
    const res = await GET(req("Bearer wrong"));
    expect(res.status).toBe(401);
  });

  it("returns 200 with valid CRON_SECRET", async () => {
    const res = await GET(req("Bearer test-cron-secret"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });
});
