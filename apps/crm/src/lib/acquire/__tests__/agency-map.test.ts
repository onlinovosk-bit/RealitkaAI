import { describe, expect, it } from "vitest";
import { agencyForInbound } from "../agency-map";

describe("agency-map", () => {
  it("maps Smolko inbound address to agency UUID", () => {
    expect(agencyForInbound("smolko@inbound.revolis.ai")).toBe(
      "11111111-1111-1111-1111-111111111111",
    );
  });

  it("returns null for unknown inbound address", () => {
    expect(agencyForInbound("neznamy@x.sk")).toBeNull();
  });

  it("normalizes case and whitespace", () => {
    expect(agencyForInbound("  SMOLKO@inbound.revolis.ai  ")).toBe(
      "11111111-1111-1111-1111-111111111111",
    );
  });
});
