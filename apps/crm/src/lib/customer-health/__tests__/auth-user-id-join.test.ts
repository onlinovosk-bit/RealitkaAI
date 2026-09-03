import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const CRM_ROOT = process.cwd();

describe("customer-health auth_user_id join", () => {
  it("scan joins last_sign_in via auth_user_id, never profiles.id as auth uid", () => {
    const scan = readFileSync(join(CRM_ROOT, "src/lib/customer-health/scan.ts"), "utf8");
    expect(scan).toContain("auth_user_id");
    expect(scan).toContain("loadLastSignInByAuthUserId");
    expect(scan).toMatch(/lastSignIn\.get\(o\.auth_user_id\)/);
    expect(scan).toMatch(/lastSignIn\.get\(p\.auth_user_id\)/);
    // Must not treat profile row id as auth user key for login lookup.
    expect(scan).not.toMatch(/lastSignIn\.get\(o\.id\)/);
    expect(scan).not.toMatch(/lastSignIn\.get\(p\.id\)/);
  });
});
