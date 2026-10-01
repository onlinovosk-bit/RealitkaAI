import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(__dirname, "../..");

describe("enterprise onboard must not self-assign account_tier", () => {
  it("onboard-start route never writes account_tier or ui_role", () => {
    const src = readFileSync(
      resolve(root, "src/app/api/enterprise/onboard-start/route.ts"),
      "utf8",
    );
    expect(src).not.toMatch(/account_tier:\s*["']enterprise["']/);
    expect(src).not.toMatch(/\.update\(\s*\{[^}]*account_tier/);
    expect(src).toMatch(/ENTERPRISE_TIERS|403/);
  });

  it("DB trigger soft-reverts account_tier and ui_role for non-service_role", () => {
    const migration = readFileSync(
      resolve(
        root,
        "supabase/migrations/20260831233000_profiles_guard_account_tier_ui_role.sql",
      ),
      "utf8",
    );
    expect(migration).toContain("profiles_guard_account_tier_and_ui_role");
    expect(migration).toContain("NEW.account_tier := OLD.account_tier");
    expect(migration).toContain("NEW.ui_role := OLD.ui_role");
    expect(migration).toContain("service_role");
  });

  it("upgradeToL99 server action refuses free entitlement writes", () => {
    const src = readFileSync(
      resolve(root, "src/app/_actions/l99-licensing.ts"),
      "utf8",
    );
    expect(src).not.toMatch(/\.update\(/);
    expect(src).toMatch(/disabled|billing/i);
  });
});
