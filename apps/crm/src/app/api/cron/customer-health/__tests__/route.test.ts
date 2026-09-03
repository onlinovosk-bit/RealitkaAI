import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  createAdminClient: vi.fn(),
  scanCustomerHealth: vi.fn(),
  persistCustomerHealthDaily: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createAdminClient: mocks.createAdminClient,
}));

vi.mock("@/lib/customer-health", () => ({
  scanCustomerHealth: mocks.scanCustomerHealth,
  persistCustomerHealthDaily: mocks.persistCustomerHealthDaily,
}));

import { GET } from "../route";

function req(secret: string | null) {
  const init: ConstructorParameters<typeof NextRequest>[1] = {};
  if (secret) init.headers = { authorization: `Bearer ${secret}` };
  return new NextRequest("http://localhost/api/cron/customer-health", init);
}

describe("GET /api/cron/customer-health", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("CRON_SECRET", "fixture-cron");
    mocks.createAdminClient.mockReturnValue({});
    mocks.scanCustomerHealth.mockResolvedValue([]);
    mocks.persistCustomerHealthDaily.mockResolvedValue({ written: 0 });
  });

  it("returns 401 without Bearer CRON_SECRET", async () => {
    const res = await GET(req(null));
    expect(res.status).toBe(401);
    expect(mocks.scanCustomerHealth).not.toHaveBeenCalled();
  });

  it("returns 401 with wrong secret", async () => {
    const res = await GET(req("wrong"));
    expect(res.status).toBe(401);
  });

  it("returns morningLines only when alerts exist", async () => {
    mocks.scanCustomerHealth.mockResolvedValue([
      {
        agencyId: "1",
        agencyName: "Reality Smolko",
        isPaying: true,
        severity: "red",
        signals: [{ code: "LEAD_SILENCE", severity: "red", detail: "37 dní", value: 37 }],
      },
    ]);
    mocks.persistCustomerHealthDaily.mockResolvedValue({ written: 1 });

    const res = await GET(req("fixture-cron"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.alertCount).toBe(1);
    expect(body.morningLines.length).toBe(1);
    expect(body.morningLines[0]).toContain("Reality Smolko");
  });
});
