import { afterEach, describe, expect, it, vi } from "vitest";
import { validateEnv } from "../env";
import { register } from "../../instrumentation";

const VALID = {
  NEXT_PUBLIC_SUPABASE_URL: "https://x.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "a",
  SUPABASE_SERVICE_ROLE_KEY: "s",
  OPENAI_API_KEY: "o",
  STRIPE_SECRET_KEY: "k",
  CRON_SECRET: "c",
};

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("validateEnv", () => {
  it("is ok for a complete environment", () => {
    expect(validateEnv(VALID)).toEqual({ ok: true, issues: [] });
  });

  it("names every missing required key without throwing", () => {
    const r = validateEnv({});
    expect(r.ok).toBe(false);
    expect(r.issues.map((i) => i.key).sort()).toEqual(Object.keys(VALID).sort());
  });

  it("never echoes a received value", () => {
    const r = validateEnv({ ...VALID, NEXT_PUBLIC_SUPABASE_URL: "sk_live_SECRET_VALUE" });
    expect(JSON.stringify(r)).not.toContain("SECRET_VALUE");
    expect(r.issues[0].key).toBe("NEXT_PUBLIC_SUPABASE_URL");
  });
});

describe("register (startup report)", () => {
  it("logs drift names and does NOT throw when the environment is incomplete", async () => {
    vi.stubEnv("NEXT_RUNTIME", "nodejs");
    for (const k of Object.keys(VALID)) vi.stubEnv(k, "");
    vi.stubEnv("OPENAI_API_KEY", undefined as unknown as string);
    const err = vi.spyOn(console, "error").mockImplementation(() => undefined);
    await expect(register()).resolves.toBeUndefined();
    expect(String(err.mock.calls[0]?.[0])).toContain("[env] schema");
  });

  it("is silent on the edge runtime", async () => {
    vi.stubEnv("NEXT_RUNTIME", "edge");
    const err = vi.spyOn(console, "error").mockImplementation(() => undefined);
    await register();
    expect(err).not.toHaveBeenCalled();
  });
});
