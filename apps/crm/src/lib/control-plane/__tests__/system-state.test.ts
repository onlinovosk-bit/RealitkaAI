import { describe, expect, it } from "vitest";
import { readSystemState } from "../system-state";

describe("readSystemState — AGENT_KILL_SWITCH", () => {
  it("is off when unset or any unrecognised value", () => {
    expect(readSystemState({}).killSwitch).toBe(false);
    expect(readSystemState({ AGENT_KILL_SWITCH: "0" }).killSwitch).toBe(false);
    expect(readSystemState({ AGENT_KILL_SWITCH: "off" }).killSwitch).toBe(false);
  });

  it("is on for 1 / true, case- and whitespace-insensitive", () => {
    for (const v of ["1", "true", " TRUE ", "True"]) {
      expect(readSystemState({ AGENT_KILL_SWITCH: v }).killSwitch).toBe(true);
    }
  });
});
