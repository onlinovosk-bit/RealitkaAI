import { afterEach, describe, expect, it, vi } from "vitest";
import { isArbitrageDemoAllowed } from "@/lib/arbitrage/demo-guard";

describe("[verification] Arbitrage demo guard (prod safety)", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("never allows demo arbitrage in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ARBITRAGE_DEMO_MODE", "true");
    expect(isArbitrageDemoAllowed()).toBe(false);
  });

  it("allows demo only in development with explicit flag", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("ARBITRAGE_DEMO_MODE", "true");
    expect(isArbitrageDemoAllowed()).toBe(true);
  });
});
