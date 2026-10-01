import { afterEach, describe, expect, it, vi } from "vitest";
import { DEGRADED_WITHOUT, validateEnv } from "@/config/env";
import { getEnvironmentHealth } from "@/lib/app-env";

const MANAGED = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  ...Object.keys(DEGRADED_WITHOUT),
];

function setEnv(vars: Record<string, string>) {
  for (const k of MANAGED) vi.stubEnv(k, undefined as unknown as string);
  for (const [k, v] of Object.entries(vars)) vi.stubEnv(k, v);
}

afterEach(() => vi.unstubAllEnvs());

const URL_ = "https://x.supabase.co";

describe("app-env ↔ config/env single source", () => {
  it.each([
    ["nothing", {}],
    ["url only", { NEXT_PUBLIC_SUPABASE_URL: URL_ }],
    ["url + anon", { NEXT_PUBLIC_SUPABASE_URL: URL_, NEXT_PUBLIC_SUPABASE_ANON_KEY: "a" }],
    ["url + publishable", { NEXT_PUBLIC_SUPABASE_URL: URL_, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "p" }],
    ["keys only", { NEXT_PUBLIC_SUPABASE_ANON_KEY: "a" }],
  ])("requiredOk equals the schema verdict (%s)", (_name, vars) => {
    setEnv(vars);
    expect(getEnvironmentHealth().requiredOk).toBe(validateEnv().ok);
  });

  it("goes to fallback when the Supabase key is missing, and names it", () => {
    setEnv({ NEXT_PUBLIC_SUPABASE_URL: URL_ });
    const h = getEnvironmentHealth();
    expect(h.mode).toBe("fallback");
    expect(h.checks.filter((c) => c.required && !c.present).map((c) => c.key)).toEqual(["SUPABASE_KEY"]);
  });

  it("is connected with URL + either key", () => {
    setEnv({ NEXT_PUBLIC_SUPABASE_URL: URL_, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "p" });
    expect(getEnvironmentHealth().mode).toBe("connected");
  });

  it("lists every degradable variable the startup log lists, with the same present/absent verdict", () => {
    setEnv({ NEXT_PUBLIC_SUPABASE_URL: URL_, NEXT_PUBLIC_SUPABASE_ANON_KEY: "a", CRON_SECRET: "c" });
    const checks = getEnvironmentHealth().checks;
    const degraded = new Set(validateEnv().degraded.map((d) => d.key));
    for (const key of Object.keys(DEGRADED_WITHOUT)) {
      const c = checks.find((x) => x.key === key);
      expect(c, `${key} missing from /system checks`).toBeDefined();
      expect(c!.present).toBe(!degraded.has(key));
    }
  });

  it("counts a whitespace-only degradable variable as absent, like the startup log", () => {
    setEnv({ NEXT_PUBLIC_SUPABASE_URL: URL_, NEXT_PUBLIC_SUPABASE_ANON_KEY: "a", CRON_SECRET: "   " });
    expect(getEnvironmentHealth().checks.find((c) => c.key === "CRON_SECRET")!.present).toBe(false);
  });
});
