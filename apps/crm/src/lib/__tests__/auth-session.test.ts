import { describe, expect, it } from "vitest";
import { isInvalidRefreshTokenError } from "@/lib/supabase/auth-session";

describe("isInvalidRefreshTokenError", () => {
  it("detects Supabase refresh token messages", () => {
    expect(
      isInvalidRefreshTokenError(
        new Error("Invalid Refresh Token: Refresh Token Not Found"),
      ),
    ).toBe(true);
  });

  it("ignores unrelated errors", () => {
    expect(isInvalidRefreshTokenError(new Error("Network error"))).toBe(false);
  });
});
