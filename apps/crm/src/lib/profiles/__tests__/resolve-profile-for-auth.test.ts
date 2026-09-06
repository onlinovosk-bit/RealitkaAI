import { beforeEach, describe, it, expect, vi } from "vitest";
import {
  isSmolkoOwnerEmail,
  resolveProfileForAuthUser,
} from "@/lib/profiles/resolve-profile-for-auth";
import { resetAuthProfileRequestMemoForTests } from "@/lib/profiles/auth-profile-request-memo";

beforeEach(() => {
  resetAuthProfileRequestMemoForTests();
});
import { normalizeProfileEntitlements } from "@/lib/profiles/normalize-profile-entitlements";

function buildSupabase(eqRows: Record<string, unknown | null>) {
  const select = vi.fn(() => ({
    eq: (column: string, value: string) => ({
      maybeSingle: vi
        .fn()
        .mockResolvedValue({ data: eqRows[`${column}:${value}`] ?? null }),
    }),
  }));
  const from = vi.fn().mockReturnValue({ select });
  return { from } as unknown as import("@supabase/supabase-js").SupabaseClient;
}

describe("isSmolkoOwnerEmail", () => {
  it("includes Reality Smolko Google login and office alias only", () => {
    expect(isSmolkoOwnerEmail("rastislav.smolko@gmail.com")).toBe(true);
    expect(isSmolkoOwnerEmail("office@realitysmolko.sk")).toBe(true);
    expect(isSmolkoOwnerEmail("other@gmail.com")).toBe(false);
  });

  it("does not treat arbitrary @realitysmolko.sk addresses as owner", () => {
    expect(isSmolkoOwnerEmail("broker@realitysmolko.sk")).toBe(false);
    expect(isSmolkoOwnerEmail("info@realitysmolko.sk")).toBe(false);
    expect(isSmolkoOwnerEmail("attacker@realitysmolko.sk")).toBe(false);
  });
});

describe("smolkoProfileLookupEmails", () => {
  it("includes gmail first and office alias when logging in with gmail", async () => {
    const { smolkoProfileLookupEmails } = await import("@/lib/profiles/resolve-profile-for-auth");
    const emails = smolkoProfileLookupEmails("rastislav.smolko@gmail.com");
    expect(emails[0]).toBe("rastislav.smolko@gmail.com");
    expect(emails).toContain("office@realitysmolko.sk");
  });

  it("does not inject owner aliases for non-owner @realitysmolko.sk logins", async () => {
    const { smolkoProfileLookupEmails } = await import("@/lib/profiles/resolve-profile-for-auth");
    const emails = smolkoProfileLookupEmails("broker@realitysmolko.sk");
    expect(emails).toEqual(["broker@realitysmolko.sk"]);
  });
});

describe("normalizeProfileEntitlements (via resolve path)", () => {
  it("syncs owner menu fields when role=owner and tier=market_vision", () => {
    const normalized = normalizeProfileEntitlements({
      id: "prof-owner",
      agency_id: "b101361c",
      email: "owner@example.com",
      role: "owner",
      ui_role: "agent",
      account_tier: "market_vision",
    });

    expect(normalized?.ui_role).toBe("owner_vision");
    expect(normalized?.account_tier).toBe("market_vision");
  });
});

describe("resolveProfileForAuthUser", () => {
  it("prefers auth_user_id and falls back to legacy id", async () => {
    const supabase = buildSupabase({
      "auth_user_id:user-1": { id: "prof-1", agency_id: "agency-1", auth_user_id: "user-1" },
      "id:user-1": { id: "legacy-1", agency_id: "agency-legacy", auth_user_id: null },
    });

    const result = await resolveProfileForAuthUser(supabase, "user-1");

    expect(result.profileMissingAgency).toBe(false);
    expect(result.profile?.id).toBe("prof-1");
    expect(result.profile?.agency_id).toBe("agency-1");
  });

  it("flags missing agency_id", async () => {
    const supabase = buildSupabase({
      "auth_user_id:user-2": { id: "prof-2", agency_id: null, auth_user_id: "user-2" },
    });

    const result = await resolveProfileForAuthUser(supabase, "user-2");

    expect(result.profileMissingAgency).toBe(true);
  });
});
