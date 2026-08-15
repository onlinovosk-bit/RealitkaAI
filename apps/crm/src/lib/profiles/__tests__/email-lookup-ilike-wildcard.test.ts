import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  emailLookupNeedsExactMatch,
  linkProfileToAuthUser,
} from "@/lib/profiles/resolve-profile-for-auth";
import { resetAuthProfileRequestMemoForTests } from "@/lib/profiles/auth-profile-request-memo";

const serviceUpdateEq = vi.fn().mockResolvedValue({ error: null });
const serviceInResult = vi.fn().mockResolvedValue({ data: [] });
const serviceIlike = vi.fn();
const serviceEq = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createServiceRoleClient: vi.fn(() => ({
    from: vi.fn().mockReturnValue({
      update: vi.fn().mockReturnValue({ eq: serviceUpdateEq }),
      select: vi.fn(() => ({
        eq: (...args: unknown[]) => {
          serviceEq(...args);
          return {
            maybeSingle: vi.fn().mockResolvedValue({ data: null }),
            in: () => serviceInResult(),
          };
        },
        ilike: (...args: unknown[]) => {
          serviceIlike(...args);
          return {
            maybeSingle: vi.fn().mockResolvedValue({ data: null }),
          };
        },
      })),
    }),
  })),
}));

beforeEach(() => {
  resetAuthProfileRequestMemoForTests();
  serviceUpdateEq.mockClear();
  serviceIlike.mockClear();
  serviceEq.mockClear();
  serviceInResult.mockReset();
  serviceInResult.mockResolvedValue({ data: [] });
});

describe("emailLookupNeedsExactMatch", () => {
  it("flags underscore and percent (ILIKE wildcards)", () => {
    expect(emailLookupNeedsExactMatch("in_o@agency.sk")).toBe(true);
    expect(emailLookupNeedsExactMatch("john_smith@co.com")).toBe(true);
    expect(emailLookupNeedsExactMatch("a%b@co.com")).toBe(true);
    expect(emailLookupNeedsExactMatch("info@agency.sk")).toBe(false);
    expect(emailLookupNeedsExactMatch("mario@agency.sk")).toBe(false);
  });
});

describe("findProfileByEmailCandidates ILIKE wildcard guard", () => {
  function buildUserClient() {
    const userIlike = vi.fn().mockReturnValue({
      maybeSingle: vi.fn().mockResolvedValue({ data: null }),
    });
    const userEq = vi.fn().mockReturnValue({
      maybeSingle: vi.fn().mockResolvedValue({ data: null }),
    });
    const select = vi.fn(() => ({
      eq: (column: string, value: string) => {
        if (column === "email") return userEq(column, value);
        return {
          maybeSingle: vi.fn().mockResolvedValue({ data: null }),
        };
      },
      ilike: (column: string, value: string) => userIlike(column, value),
    }));
    const update = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });
    const from = vi.fn().mockReturnValue({ select, update });
    return {
      supabase: { from } as unknown as import("@supabase/supabase-js").SupabaseClient,
      userIlike,
      userEq,
    };
  }

  it("does not ILIKE when login email contains underscore (would match info@)", async () => {
    const { supabase, userIlike, userEq } = buildUserClient();

    await linkProfileToAuthUser(supabase, "auth-attacker", "in_o@agency.sk");

    expect(userIlike).not.toHaveBeenCalled();
    expect(userEq).toHaveBeenCalledWith("email", "in_o@agency.sk");
    // Service-role email path must also avoid ILIKE wildcards.
    expect(serviceIlike).not.toHaveBeenCalled();
    expect(serviceEq).toHaveBeenCalledWith("email", "in_o@agency.sk");
  });

  it("still uses ILIKE for ordinary emails (case-insensitive legacy match)", async () => {
    const { supabase, userIlike, userEq } = buildUserClient();

    await linkProfileToAuthUser(supabase, "auth-user", "info@agency.sk");

    expect(userEq).not.toHaveBeenCalledWith("email", "info@agency.sk");
    expect(userIlike).toHaveBeenCalledWith("email", "info@agency.sk");
  });
});
