import { describe, it, expect } from "vitest";
import {
  currentPeriodKey,
  previewMonthlyGrant,
  cockpitGrantAmount,
  seatGrantPerSeat,
} from "@/lib/credits/grant-engine";

describe("grant-engine", () => {
  it("currentPeriodKey formats YYYYMM", () => {
    expect(currentPeriodKey(new Date("2026-06-15T12:00:00Z"))).toBe("202606");
  });

  it("previewMonthlyGrant sums seats and cockpit", () => {
    expect(previewMonthlyGrant("team", 4, false)).toBe(4 * 25);
    expect(previewMonthlyGrant("team", 4, true)).toBe(4 * 25 + 100);
  });

  it("exports grant constants", () => {
    expect(seatGrantPerSeat("solo")).toBe(30);
    expect(cockpitGrantAmount()).toBe(100);
  });
});
