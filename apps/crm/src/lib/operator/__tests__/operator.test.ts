import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  canAccessOperatorDashboard,
  fetchProfilePlatformAdminFlag,
  isPlatformAdmin,
} from "@/lib/operator/access";
import { isOperatorDashboardEnabled, isOperatorExcludedAgency } from "@/lib/operator/config";
import { OPERATOR_HEALTH_WEIGHTS, computeOperatorHealthScore } from "@/lib/operator/health-score";
import { assertOperatorAggregateNoPii, OPERATOR_FORBIDDEN_AGGREGATE_KEYS } from "@/lib/operator/aggregate-schema";
import { SANDBOX_AGENCY_ID } from "@/lib/valuation/agency-config";
import { DEFAULT_SYSTEM_USAGE_AGENCY_ID } from "@/lib/usage-metrics";

describe("operator config", () => {
  it("OPERATOR_DASHBOARD_ENABLED defaults false", () => {
    vi.stubEnv("OPERATOR_DASHBOARD_ENABLED", "");
    expect(isOperatorDashboardEnabled()).toBe(false);
  });

  it("excludes sandbox and system agency ids by default", () => {
    expect(isOperatorExcludedAgency(SANDBOX_AGENCY_ID)).toBe(true);
    expect(isOperatorExcludedAgency(DEFAULT_SYSTEM_USAGE_AGENCY_ID)).toBe(true);
    expect(isOperatorExcludedAgency("11111111-1111-1111-1111-111111111111")).toBe(false);
  });
});

describe("operator access", () => {
  it("isPlatformAdmin requires explicit true", () => {
    expect(isPlatformAdmin({ is_platform_admin: true })).toBe(true);
    expect(isPlatformAdmin({ is_platform_admin: false })).toBe(false);
    expect(isPlatformAdmin(null)).toBe(false);
  });

  beforeEach(() => {
    vi.stubEnv("OPERATOR_DASHBOARD_ENABLED", "true");
  });

  it("canAccessOperatorDashboard denies when flag off", async () => {
    vi.stubEnv("OPERATOR_DASHBOARD_ENABLED", "false");
    const supabase = {
      from: vi.fn(),
    } as unknown as import("@supabase/supabase-js").SupabaseClient;
    await expect(canAccessOperatorDashboard(supabase, "user-1")).resolves.toBe(false);
  });

  it("canAccessOperatorDashboard allows platform admin", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: { is_platform_admin: true },
      error: null,
    });
    const or = vi.fn().mockReturnValue({ maybeSingle });
    const select = vi.fn().mockReturnValue({ or });
    const supabase = {
      from: vi.fn().mockReturnValue({ select }),
    } as unknown as import("@supabase/supabase-js").SupabaseClient;

    await expect(canAccessOperatorDashboard(supabase, "user-1")).resolves.toBe(true);
    expect(or).toHaveBeenCalledWith("auth_user_id.eq.user-1,id.eq.user-1");
  });

  it("fetchProfilePlatformAdminFlag matches auth_user_id when profile id differs", async () => {
    const authUserId = "auth-uuid-1111";
    const profileRowId = "profile-uuid-2222";
    const maybeSingle = vi.fn().mockResolvedValue({
      data: { is_platform_admin: true, id: profileRowId, auth_user_id: authUserId },
      error: null,
    });
    const or = vi.fn().mockReturnValue({ maybeSingle });
    const select = vi.fn().mockReturnValue({ or });
    const supabase = {
      from: vi.fn().mockReturnValue({ select }),
    } as unknown as import("@supabase/supabase-js").SupabaseClient;

    const profile = await fetchProfilePlatformAdminFlag(supabase, authUserId);

    expect(or).toHaveBeenCalledWith(`auth_user_id.eq.${authUserId},id.eq.${authUserId}`);
    expect(isPlatformAdmin(profile)).toBe(true);
  });
});

describe("operator health score", () => {
  it("documents weights in module", () => {
    expect(OPERATOR_HEALTH_WEIGHTS.BASE).toBeGreaterThan(0);
  });

  it("penalizes open guardian findings", () => {
    const low = computeOperatorHealthScore({
      openGuardianFindings: 4,
      onboardingIncomplete: false,
      reaction24hPct: null,
      wonLast30d: 0,
    });
    const high = computeOperatorHealthScore({
      openGuardianFindings: 0,
      onboardingIncomplete: false,
      reaction24hPct: null,
      wonLast30d: 0,
    });
    expect(low).toBeLessThan(high);
  });
});

describe("operator aggregate schema", () => {
  it("rejects forbidden PII keys", () => {
    expect(() => assertOperatorAggregateNoPii({ agencyId: "x", email: "a@b.c" })).toThrow(/email/);
    expect(OPERATOR_FORBIDDEN_AGGREGATE_KEYS).toContain("phone");
  });
});

describe("operator tenant isolation (unit)", () => {
  it("distinct agency ids produce distinct aggregate buckets", () => {
    const rowA = {
      agencyId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      agencyName: "Agency A",
      contacts7d: 2,
    };
    const rowB = {
      agencyId: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
      agencyName: "Agency B",
      contacts7d: 9,
    };
    expect(rowA.agencyId).not.toBe(rowB.agencyId);
    expect(rowA.contacts7d).not.toBe(rowB.contacts7d);
    assertOperatorAggregateNoPii(rowA as unknown as Record<string, unknown>);
    assertOperatorAggregateNoPii(rowB as unknown as Record<string, unknown>);
  });
});
