import { beforeEach, describe, expect, it, vi } from "vitest";

const mockRun = vi.fn();

vi.mock("@/lib/onboarding-dispatch", () => ({
  runOnboardingDispatch: (...args: unknown[]) => mockRun(...args),
}));

import { POST } from "../route";

function makeRequest(authorization: string | null): Request {
  const headers = new Headers();
  if (authorization) headers.set("authorization", authorization);
  return new Request("http://localhost/api/cron/onboarding-dispatch", {
    method: "POST",
    headers,
  });
}

describe("POST /api/cron/onboarding-dispatch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    mockRun.mockResolvedValue({ sent: 0, skipped: 0 });
  });

  it("returns 401 when CRON_SECRET is unset even with Bearer undefined", async () => {
    vi.stubEnv("CRON_SECRET", "");
    const res = await POST(makeRequest("Bearer undefined"));
    expect(res.status).toBe(401);
    expect(mockRun).not.toHaveBeenCalled();
  });

  it("returns 401 without Authorization", async () => {
    vi.stubEnv("CRON_SECRET", "dispatch-secret");
    const res = await POST(makeRequest(null));
    expect(res.status).toBe(401);
  });

  it("runs dispatch when Bearer matches", async () => {
    vi.stubEnv("CRON_SECRET", "dispatch-secret");
    const res = await POST(makeRequest("Bearer dispatch-secret"));
    expect(res.status).toBe(200);
    expect(mockRun).toHaveBeenCalledOnce();
  });
});
