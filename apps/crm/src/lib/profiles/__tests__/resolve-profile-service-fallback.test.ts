import { describe, it, expect, vi, beforeEach } from "vitest";
import { resolveProfileForAuthUser } from "@/lib/profiles/resolve-profile-for-auth";

const serviceMaybeSingle = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createServiceRoleClient: vi.fn(() => ({
    from: vi.fn().mockReturnValue({
      select: vi.fn(() => ({
        eq: () => ({ maybeSingle: serviceMaybeSingle }),
        ilike: () => ({ maybeSingle: serviceMaybeSingle }),
      })),
    }),
  })),
}));

beforeEach(() => {
  serviceMaybeSingle.mockReset();
});

describe("resolveProfileForAuthUser service fallback", () => {
  it("resolves profile by email via service role when RLS hides the row", async () => {
    const emptyMaybeSingle = vi.fn().mockResolvedValue({ data: null });
    const select = vi.fn(() => ({
      eq: () => ({ maybeSingle: emptyMaybeSingle }),
      ilike: () => ({ maybeSingle: emptyMaybeSingle }),
    }));
    const from = vi.fn().mockReturnValue({ select });
    const supabase = { from } as unknown as import("@supabase/supabase-js").SupabaseClient;

    serviceMaybeSingle
      .mockResolvedValueOnce({ data: null })
      .mockResolvedValueOnce({ data: null })
      .mockResolvedValueOnce({
        data: {
          id: "profile-email-only",
          agency_id: "agency-smolko",
          auth_user_id: null,
        },
      });

    const result = await resolveProfileForAuthUser(
      supabase,
      "auth-smolko",
      "id, agency_id, auth_user_id",
      "office@realitysmolko.sk",
    );

    expect(result.profile?.agency_id).toBe("agency-smolko");
    expect(result.profileMissingAgency).toBe(false);
  });

  it("resolves office@ profile when user signs in with Smolko gmail", async () => {
    const emptyMaybeSingle = vi.fn().mockResolvedValue({ data: null });
    const select = vi.fn(() => ({
      eq: () => ({ maybeSingle: emptyMaybeSingle }),
      ilike: () => ({ maybeSingle: emptyMaybeSingle }),
    }));
    const from = vi.fn().mockReturnValue({ select });
    const supabase = { from } as unknown as import("@supabase/supabase-js").SupabaseClient;

    serviceMaybeSingle
      .mockResolvedValueOnce({ data: null })
      .mockResolvedValueOnce({ data: null })
      .mockResolvedValueOnce({ data: null })
      .mockResolvedValueOnce({
        data: {
          id: "profile-office",
          agency_id: "agency-smolko",
          auth_user_id: null,
          email: "office@realitysmolko.sk",
          ui_role: "owner_vision",
        },
      });

    const result = await resolveProfileForAuthUser(
      supabase,
      "auth-gmail-uuid",
      "id, agency_id, auth_user_id, email, ui_role",
      "rastislav.smolko@gmail.com",
    );

    expect(result.profile?.agency_id).toBe("agency-smolko");
    expect(result.profile?.ui_role).toBe("owner_vision");
  });

  it("prefers office owner row over visible auth stub when RLS hides email on user client", async () => {
    const userMaybeSingle = vi.fn();
    userMaybeSingle
      .mockResolvedValueOnce({
        data: {
          id: "profile-stub",
          agency_id: "agency-smolko",
          auth_user_id: "auth-gmail-uuid",
          email: "rastislav.smolko@gmail.com",
          role: "agent",
          ui_role: "agent",
          account_tier: "pro",
        },
      })
      .mockResolvedValueOnce({ data: null })
      .mockResolvedValue({ data: null });

    const select = vi.fn(() => ({
      eq: () => ({ maybeSingle: userMaybeSingle }),
      ilike: () => ({ maybeSingle: vi.fn().mockResolvedValue({ data: null }) }),
    }));
    const from = vi.fn().mockReturnValue({ select });
    const supabase = { from } as unknown as import("@supabase/supabase-js").SupabaseClient;

    serviceMaybeSingle
      .mockResolvedValueOnce({ data: null })
      .mockResolvedValueOnce({ data: null })
      .mockResolvedValueOnce({ data: null })
      .mockResolvedValueOnce({
        data: {
          id: "profile-office",
          agency_id: "agency-smolko",
          auth_user_id: null,
          email: "office@realitysmolko.sk",
          role: "owner",
          ui_role: "owner_vision",
          account_tier: "market_vision",
        },
      });

    const result = await resolveProfileForAuthUser(
      supabase,
      "auth-gmail-uuid",
      "id, agency_id, auth_user_id, email, role, ui_role, account_tier",
      "rastislav.smolko@gmail.com",
    );

    expect(result.profile?.id).toBe("profile-office");
    expect(result.profile?.ui_role).toBe("owner_vision");
    expect(result.profile?.role).toBe("owner");
  });
});
