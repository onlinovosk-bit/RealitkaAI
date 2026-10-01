import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  linkProfileToAuthUser,
  resolveProfileForAuthUser,
  shouldPersistNormalizedTiers,
} from "@/lib/profiles/resolve-profile-for-auth";
import { resetAuthProfileRequestMemoForTests } from "@/lib/profiles/auth-profile-request-memo";

const serviceFrom = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createServiceRoleClient: vi.fn(() => ({
    from: serviceFrom,
  })),
}));

beforeEach(() => {
  resetAuthProfileRequestMemoForTests();
  serviceFrom.mockReset();
});

describe("shouldPersistNormalizedTiers", () => {
  it("returns false when role/ui_role/account_tier already match", () => {
    const profile = {
      id: "p1",
      agency_id: "a1",
      auth_user_id: "u1",
      role: "owner",
      ui_role: "owner_vision",
      account_tier: "market_vision",
    };
    expect(shouldPersistNormalizedTiers(profile, profile)).toBe(false);
  });

  it("returns false when values differ but tier_updated_at is newer than 1h", () => {
    const profile = {
      id: "p1",
      agency_id: "a1",
      auth_user_id: "u1",
      role: "owner",
      ui_role: "agent",
      account_tier: "market_vision",
      tier_updated_at: new Date().toISOString(),
    };
    const normalized = { ...profile, ui_role: "owner_vision" };
    expect(shouldPersistNormalizedTiers(profile, normalized)).toBe(false);
  });

  it("returns true when values differ and tier_updated_at is older than 1h", () => {
    const profile = {
      id: "p1",
      agency_id: "a1",
      auth_user_id: "u1",
      role: "owner",
      ui_role: "agent",
      account_tier: "market_vision",
      tier_updated_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    };
    const normalized = { ...profile, ui_role: "owner_vision" };
    expect(shouldPersistNormalizedTiers(profile, normalized)).toBe(true);
  });
});

function buildLinkedClient(row: Record<string, unknown>) {
  const updateEq = vi.fn().mockResolvedValue({ error: null });
  const update = vi.fn().mockReturnValue({ eq: updateEq });
  const select = vi.fn(() => ({
    eq: (column: string, value: string) => ({
      maybeSingle: vi.fn().mockResolvedValue({
        data: column === "auth_user_id" ? row : null,
      }),
    }),
    ilike: () => ({
      maybeSingle: vi.fn().mockResolvedValue({ data: null }),
    }),
  }));
  const from = vi.fn().mockReturnValue({ select, update });
  const supabase = { from } as unknown as import("@supabase/supabase-js").SupabaseClient;
  return { supabase, update };
}

describe("linkProfileToAuthUser tier writes", () => {
  it("does not UPDATE profiles when entitlements are already normalized", async () => {
    const { supabase, update } = buildLinkedClient({
      id: "prof-1",
      agency_id: "agency-1",
      auth_user_id: "user-1",
      email: "owner@example.com",
      role: "owner",
      ui_role: "owner_vision",
      account_tier: "market_vision",
      tier_updated_at: new Date().toISOString(),
    });

    await linkProfileToAuthUser(supabase, "user-1", "owner@example.com");

    expect(update).not.toHaveBeenCalled();
  });
});

describe("resolveProfileForAuthUser service-role skip", () => {
  it("skips service-role survey when anon path already found a linked tenant profile", async () => {
    const { supabase } = buildLinkedClient({
      id: "prof-1",
      agency_id: "agency-1",
      auth_user_id: "user-1",
      email: "broker@example.com",
      role: "agent",
      ui_role: "agent",
      account_tier: "pro",
    });

    const result = await resolveProfileForAuthUser(
      supabase,
      "user-1",
      "id, agency_id, auth_user_id",
      "broker@example.com",
    );

    expect(result.profile?.id).toBe("prof-1");
    expect(serviceFrom).not.toHaveBeenCalled();
  });
});
