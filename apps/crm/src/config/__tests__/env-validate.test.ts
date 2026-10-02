import { afterEach, describe, expect, it, vi } from "vitest";
import { validateEnv } from "../env";
import { register } from "../../instrumentation";

const URL_ = "https://x.supabase.co";
const MIN = { NEXT_PUBLIC_SUPABASE_URL: URL_, NEXT_PUBLIC_SUPABASE_ANON_KEY: "a" };
const DEGRADABLE = [
  "CRON_SECRET",
  "OPENAI_API_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "SUPABASE_SERVICE_ROLE_KEY",
];

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("validateEnv", () => {
  it("accepts URL + anon key; the five optional ones are reported as degraded, not as errors", () => {
    const r = validateEnv(MIN);
    expect(r.ok).toBe(true);
    expect(r.issues).toEqual([]);
    expect(r.degraded.map((d) => d.key).sort()).toEqual(DEGRADABLE);
  });

  it("accepts the publishable key instead of the anon key (code reads either)", () => {
    const r = validateEnv({ NEXT_PUBLIC_SUPABASE_URL: URL_, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "p" });
    expect(r.ok).toBe(true);
  });

  it("rejects a missing URL", () => {
    const r = validateEnv({ NEXT_PUBLIC_SUPABASE_ANON_KEY: "a" });
    expect(r.ok).toBe(false);
    expect(r.issues.map((i) => i.key)).toEqual(["NEXT_PUBLIC_SUPABASE_URL"]);
  });

  it("rejects when neither Supabase key is set", () => {
    const r = validateEnv({ NEXT_PUBLIC_SUPABASE_URL: URL_ });
    expect(r.ok).toBe(false);
    expect(r.issues.map((i) => i.key)).toEqual([
      "NEXT_PUBLIC_SUPABASE_ANON_KEY|NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    ]);
  });

  it("treats an empty-string variable as invalid, not as unset", () => {
    const r = validateEnv({ ...MIN, CRON_SECRET: "" });
    expect(r.ok).toBe(false);
    expect(r.issues.map((i) => i.key)).toEqual(["CRON_SECRET"]);
  });

  it("counts a whitespace-only value as unset (the code trims before use)", () => {
    const r = validateEnv({ ...MIN, CRON_SECRET: "   " });
    expect(r.degraded.map((d) => d.key)).toContain("CRON_SECRET");
  });

  it("treats an empty SUPABASE_SERVICE_ROLE_KEY as invalid too", () => {
    expect(validateEnv({ ...MIN, SUPABASE_SERVICE_ROLE_KEY: "" }).issues.map((i) => i.key)).toEqual([
      "SUPABASE_SERVICE_ROLE_KEY",
    ]);
  });

  it("stops reporting a degraded key once it is set", () => {
    const r = validateEnv({ ...MIN, CRON_SECRET: "c", OPENAI_API_KEY: "o" });
    expect(r.degraded.map((d) => d.key).sort()).toEqual([
      "STRIPE_SECRET_KEY",
      "STRIPE_WEBHOOK_SECRET",
      "SUPABASE_SERVICE_ROLE_KEY",
    ]);
  });

  it("never echoes a received value", () => {
    const r = validateEnv({ ...MIN, NEXT_PUBLIC_SUPABASE_URL: "sk_live_SECRET_VALUE" });
    expect(JSON.stringify(r)).not.toContain("SECRET_VALUE");
    expect(r.issues[0].key).toBe("NEXT_PUBLIC_SUPABASE_URL");
  });
});

describe("register (startup report)", () => {
  const setEnv = (vars: Record<string, string>) => {
    for (const k of [...Object.keys(MIN), ...DEGRADABLE, "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"]) {
      vi.stubEnv(k, undefined as unknown as string);
    }
    for (const [k, v] of Object.entries(vars)) vi.stubEnv(k, v);
    vi.stubEnv("NEXT_RUNTIME", "nodejs");
  };

  it("logs drift and degraded names and does NOT throw", async () => {
    setEnv({});
    const err = vi.spyOn(console, "error").mockImplementation(() => undefined);
    await expect(register()).resolves.toBeUndefined();
    const out = err.mock.calls.map((c) => String(c[0])).join("\n");
    expect(out).toContain("[env] schema");
    expect(out).toContain("[env] degraded");
  });

  it("logs only the degraded line when the schema is satisfied", async () => {
    setEnv(MIN);
    const err = vi.spyOn(console, "error").mockImplementation(() => undefined);
    await register();
    const out = err.mock.calls.map((c) => String(c[0])).join("\n");
    expect(out).not.toContain("schema ↔ runtime drift");
    expect(out).toContain("SUPABASE_SERVICE_ROLE_KEY");
  });

  it("is silent on the edge runtime", async () => {
    setEnv({});
    vi.stubEnv("NEXT_RUNTIME", "edge");
    const err = vi.spyOn(console, "error").mockImplementation(() => undefined);
    await register();
    expect(err).not.toHaveBeenCalled();
  });
});
