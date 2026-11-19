import { describe, expect, it } from "vitest";
import {
  assignActiveForceSlot,
  upgradeTeamLicense,
} from "../licensing";

describe("licensing server actions — free entitlement writers disabled", () => {
  it("upgradeTeamLicense refuses without writing entitlements", async () => {
    const res = await upgradeTeamLicense(
      "00000000-0000-0000-0000-000000000099",
      "protocol_authority",
    );
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/disabled|Stripe|billing/i);
  });

  it("assignActiveForceSlot refuses without writing entitlements", async () => {
    const res = await assignActiveForceSlot(
      "00000000-0000-0000-0000-000000000099",
      "00000000-0000-0000-0000-000000000088",
    );
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/disabled|Stripe|billing/i);
  });
});
