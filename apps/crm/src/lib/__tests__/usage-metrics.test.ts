import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  DEFAULT_SYSTEM_USAGE_AGENCY_ID,
  SYSTEM_USAGE_AGENCY_ID,
} from "@/lib/usage-metrics";
import { SMOLKO_AGENCY_ID } from "@/lib/profiles/resolve-profile-for-auth";

describe("usage-metrics system agency", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("defaults SYSTEM_USAGE_AGENCY_ID to dedicated platform tenant, not Smolko", () => {
    expect(SYSTEM_USAGE_AGENCY_ID).toBe(DEFAULT_SYSTEM_USAGE_AGENCY_ID);
    expect(SYSTEM_USAGE_AGENCY_ID).not.toBe(SMOLKO_AGENCY_ID);
    expect(SYSTEM_USAGE_AGENCY_ID).toBe("00000000-0000-0000-0000-000000000001");
  });

  it("respects USAGE_SYSTEM_AGENCY_ID env override", () => {
    vi.stubEnv("USAGE_SYSTEM_AGENCY_ID", "33333333-3333-3333-3333-333333333333");
    vi.resetModules();
    return import("@/lib/usage-metrics").then((mod) => {
      expect(mod.SYSTEM_USAGE_AGENCY_ID).toBe("33333333-3333-3333-3333-333333333333");
    });
  });
});
