import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const resolveTenantSupabaseMock = vi.fn();

vi.mock("@/lib/supabase/resolve-client", () => ({
  resolveTenantSupabase: (...args: unknown[]) => resolveTenantSupabaseMock(...args),
}));
vi.mock("@/lib/demo-mode-cookie", () => ({
  readDemoModeFromCookie: async () => false,
}));

/** A client whose single() read always fails, like a cookie-less server select. */
function failingClient() {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({ data: null, error: { message: "no rows" } }),
        }),
      }),
    }),
  };
}

describe("getLead — fixture fallback is development-only", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns undefined in production when no tenant client can be resolved", async () => {
    vi.stubEnv("NODE_ENV", "production");
    resolveTenantSupabaseMock.mockResolvedValue(null);

    const { getLead } = await import("@/lib/leads-store");

    await expect(getLead("mock-lucia")).resolves.toBeUndefined();
  });

  it("returns undefined in production when the row read fails", async () => {
    vi.stubEnv("NODE_ENV", "production");
    resolveTenantSupabaseMock.mockResolvedValue(failingClient());

    const { getLead } = await import("@/lib/leads-store");

    await expect(getLead("mock-lucia")).resolves.toBeUndefined();
  });

  it("keeps the fixture fallback outside production (local dev / tests)", async () => {
    vi.stubEnv("NODE_ENV", "development");
    resolveTenantSupabaseMock.mockResolvedValue(null);

    const { getLead } = await import("@/lib/leads-store");
    const { leads } = await import("@/lib/mock-data");

    const sample = leads[0];
    expect(sample).toBeDefined();
    await expect(getLead(sample.id)).resolves.toMatchObject({ id: sample.id });
  });
});
