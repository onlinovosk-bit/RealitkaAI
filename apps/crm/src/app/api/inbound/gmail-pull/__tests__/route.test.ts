import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mockPull = vi.fn();

vi.mock("@/lib/inbound/gmail-pull", () => ({
  runGmailInboundPull: (...args: unknown[]) => mockPull(...args),
}));

import { GET, POST } from "../route";

function req(secret: string | null) {
  const init: ConstructorParameters<typeof NextRequest>[1] = {};
  if (secret) init.headers = { authorization: `Bearer ${secret}` };
  return new NextRequest("http://localhost/api/inbound/gmail-pull", init);
}

describe("POST /api/inbound/gmail-pull", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("CRON_SECRET", "fixture-cron");
    mockPull.mockResolvedValue({ ok: true, pulled: 0, posted: 0, errors: [] });
  });

  it("returns 401 without Bearer CRON_SECRET", async () => {
    const res = await GET(req(null));
    expect(res.status).toBe(401);
    expect(mockPull).not.toHaveBeenCalled();
  });

  it("returns 401 with the wrong secret", async () => {
    const res = await POST(req("wrong"));
    expect(res.status).toBe(401);
  });

  it("runs pull when authorized", async () => {
    const res = await GET(req("fixture-cron"));
    expect(res.status).toBe(200);
    expect(mockPull).toHaveBeenCalledOnce();
    const body = await res.json();
    expect(body.ok).toBe(true);
  });
});
