import { describe, it, expect } from "vitest";
import { emailLookupNeedsExactMatch } from "@/lib/profiles/resolve-profile-for-auth";

/**
 * Live contract: profile email lookup must not treat `_` / `%` as ILIKE wildcards.
 * Regression: login `in_o@…` must not resolve profile `info@…` (account takeover).
 */
describe("auth email lookup wildcard guard (verification)", () => {
  it("forces exact match for underscore emails", () => {
    expect(emailLookupNeedsExactMatch("in_o@agency.sk")).toBe(true);
    expect(emailLookupNeedsExactMatch("john_smith@agency.sk")).toBe(true);
  });

  it("allows case-insensitive ILIKE only when pattern has no wildcards", () => {
    expect(emailLookupNeedsExactMatch("info@agency.sk")).toBe(false);
    expect(emailLookupNeedsExactMatch("office@realitysmolko.sk")).toBe(false);
  });
});
