import { describe, expect, it } from "vitest";
import {
  grantExpiryIdempotencyKey,
  monthlyGrantIdempotencyKey,
} from "@/lib/credits/grant-idempotency";

describe("grant-idempotency", () => {
  const agency = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";

  it("builds stable monthly grant keys", () => {
    expect(monthlyGrantIdempotencyKey(agency, "202606")).toBe(
      `grant:${agency}:202606`,
    );
  });

  it("builds distinct expiry keys", () => {
    const monthly = monthlyGrantIdempotencyKey(agency, "202606");
    const expiry = grantExpiryIdempotencyKey(agency, "202606");
    expect(expiry).toBe(`grant_expiry:${agency}:202606`);
    expect(expiry).not.toBe(monthly);
  });
});
