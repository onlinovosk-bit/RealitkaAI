import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/admin", () => ({
  createServiceRoleClient: () => null,
}));

vi.mock("@/lib/auth", () => ({
  getCurrentProfile: vi.fn(),
}));

vi.mock("@/lib/platform-events-server", () => ({
  emitPlatformEventServer: vi.fn(),
}));

import { POST } from "../route";

describe("POST /api/import/test-xml", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it("returns 401 when IMPORT_TEST_API_KEY is unset (fail-closed)", async () => {
    vi.stubEnv("IMPORT_TEST_API_KEY", "");
    const res = await POST(
      new Request("http://localhost/api/import/test-xml", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ xml: "<root/>" }),
      }),
    );
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.ok).toBe(false);
  });

  it("returns 401 when key header mismatches", async () => {
    vi.stubEnv("IMPORT_TEST_API_KEY", "import-key");
    const res = await POST(
      new Request("http://localhost/api/import/test-xml", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-revolis-import-key": "wrong",
        },
        body: JSON.stringify({ xml: "<root/>" }),
      }),
    );
    expect(res.status).toBe(401);
  });
});
