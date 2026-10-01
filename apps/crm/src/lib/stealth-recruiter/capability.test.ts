import { describe, expect, it } from "vitest";
import { hasCapability } from "@/lib/license/capability-registry";

describe("Stealth Recruiter capability gate", () => {
  it("requires Reality Monopol (protocol_authority)", () => {
    expect(hasCapability("market_vision", "canUseStealthRecruiter")).toBe(false);
    expect(hasCapability("pro", "canUseStealthRecruiter")).toBe(false);
    expect(hasCapability("protocol_authority", "canUseStealthRecruiter")).toBe(true);
    expect(hasCapability("command", "canUseStealthRecruiter")).toBe(true);
  });
});
