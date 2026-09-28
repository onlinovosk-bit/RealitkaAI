import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  linkProfileToAuthUser,
  resolveProfileForAuthUser,
  widenProfileSelect,
} from "@/lib/profiles/resolve-profile-for-auth";
import { resetAuthProfileRequestMemoForTests } from "@/lib/profiles/auth-profile-request-memo";

beforeEach(() => {
  resetAuthProfileRequestMemoForTests();
});

function buildSupabase(eqRows: Record<string, unknown | null>) {
  const select = vi.fn(() => ({
    eq: (column: string, value: string) => ({
      maybeSingle: vi
        .fn()
        .mockResolvedValue({ data: eqRows[`${column}:${value}`] ?? null }),
    }),
    ilike: () => ({
      maybeSingle: vi.fn().mockResolvedValue({ data: null }),
    }),
  }));
  const from = vi.fn().mockReturnValue({ select });
  return { from, select } as unknown as import("@supabase/supabase-js").SupabaseClient & {
    from: ReturnType<typeof vi.fn>;
  };
}

describe("widenProfileSelect", () => {
  it("widens subset columns to the request canonical select", () => {
    expect(widenProfileSelect("agency_id")).toContain("full_name");
    expect(widenProfileSelect("agency_id")).toContain("tier_updated_at");
    expect(widenProfileSelect("id, agency_id, auth_user_id")).toContain("email");
    expect(
      widenProfileSelect(
        "id, agency_id, auth_user_id, email, role, ui_role, account_tier, tier_updated_at",
      ),
    ).toContain("full_name");
  });

  it("does not rewrite unknown columns", () => {
    expect(widenProfileSelect("id, team_license_id")).toBe("id, team_license_id");
  });
});

describe("auth profile request memo", () => {
  it("runs one find for link + repeated resolve with different selects", async () => {
    const row = {
      id: "prof-1",
      agency_id: "agency-1",
      auth_user_id: "user-1",
      email: "owner@example.com",
      role: "owner",
      ui_role: "owner_vision",
      account_tier: "market_vision",
      full_name: "Owner",
    };
    const supabase = buildSupabase({
      "auth_user_id:user-1": row,
    });

    await linkProfileToAuthUser(supabase, "user-1", "owner@example.com");
    const afterLink = supabase.from.mock.calls.length;
    expect(afterLink).toBeGreaterThan(0);

    await resolveProfileForAuthUser(supabase, "user-1", "agency_id", "owner@example.com");
    await resolveProfileForAuthUser(
      supabase,
      "user-1",
      "id, ui_role, account_tier, full_name, agency_id, role, email",
      "owner@example.com",
    );

    expect(supabase.from.mock.calls.length).toBe(afterLink);
  });
});