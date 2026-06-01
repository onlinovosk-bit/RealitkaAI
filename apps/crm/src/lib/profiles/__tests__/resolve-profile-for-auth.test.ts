import { describe, it, expect, vi } from "vitest";
import {
  enforceSmolkoOwnerDefaults,
  isSmolkoOwnerEmail,
  resolveProfileForAuthUser,
} from "@/lib/profiles/resolve-profile-for-auth";

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
  it("includes Reality Smolko Google login", () => {
    expect(isSmolkoOwnerEmail("rastislav.smolko@gmail.com")).toBe(true);
    expect(isSmolkoOwnerEmail("office@realitysmolko.sk")).toBe(true);
    expect(isSmolkoOwnerEmail("other@gmail.com")).toBe(false);
  });
});

describe("smolkoProfileLookupEmails", () => {
  it("includes office alias when logging in with gmail", async () => {
    const { smolkoProfileLookupEmails } = await import("@/lib/profiles/resolve-profile-for-auth");
    expect(smolkoProfileLookupEmails("rastislav.smolko@gmail.com")).toContain(
      "office@realitysmolko.sk",
    );
  });
});

describe("enforceSmolkoOwnerDefaults", () => {
  it("forces owner_vision when login email is Smolko gmail but profile row is agent", () => {
    const normalized = enforceSmolkoOwnerDefaults(
      {
        id: "prof-stale",
        agency_id: "b101361c",
        email: "stale@example.com",
        role: "agent",
        ui_role: "agent",
        account_tier: "pro",
      },
      "rastislav.smolko@gmail.com",
    );

    expect(normalized?.role).toBe("owner");
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
