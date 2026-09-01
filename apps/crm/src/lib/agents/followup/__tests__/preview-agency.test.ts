import { describe, expect, it } from "vitest";
import { FOLLOWUP_AGENCY_ID } from "@/lib/agents/followup/constants";
import { resolveFollowupAgencyId } from "@/lib/agents/followup/preview";

describe("resolveFollowupAgencyId", () => {
  it("returns trimmed profile agency_id", () => {
    expect(resolveFollowupAgencyId("  agency-a  ")).toBe("agency-a");
  });

  it("refuses null / empty / whitespace (no DEMO fallback)", () => {
    expect(resolveFollowupAgencyId(null)).toBeNull();
    expect(resolveFollowupAgencyId(undefined)).toBeNull();
    expect(resolveFollowupAgencyId("")).toBeNull();
    expect(resolveFollowupAgencyId("   ")).toBeNull();
    expect(resolveFollowupAgencyId(null)).not.toBe(FOLLOWUP_AGENCY_ID);
  });
});
