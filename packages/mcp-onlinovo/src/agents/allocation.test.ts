import assert from "node:assert/strict";
import { test } from "node:test";
import * as allocationModule from "./allocation.js";
import { assignArm, balanceReport, type Arm } from "./allocation.js";
import { AgentError } from "./types.js";

const HALF = { control: 0.5, treatment: 0.5 };
function codeOf(fn: () => unknown): string | null {
  try {
    fn();
    return null;
  } catch (err) {
    return err instanceof AgentError ? err.code : "OTHER";
  }
}
const ids = (n: number) => Array.from({ length: n }, (_, i) => `FIX-CUS-${String(i).padStart(5, "0")}`);

test("assignment is deterministic and depends on experiment and salt", () => {
  const a = assignArm("FIX-CUS-00001", "exp_a", "salt1", HALF);
  assert.equal(a, assignArm("FIX-CUS-00001", "exp_a", "salt1", HALF));
  const arms = (exp: string, salt: string) => ids(200).map((id) => assignArm(id, exp, salt, HALF)).join("");
  assert.notEqual(arms("exp_a", "salt1"), arms("exp_b", "salt1"));
  assert.notEqual(arms("exp_a", "salt1"), arms("exp_a", "salt2"));
});

test("a 50/50 allocation is balanced on 10 000 units", () => {
  const arms: Arm[] = ids(10_000).map((id) => assignArm(id, "exp_a", "salt1", HALF));
  const share = arms.filter((a) => a === "treatment").length / arms.length;
  assert.ok(Math.abs(share - 0.5) < 0.02, String(share));
});

test("a 30/70 allocation is respected", () => {
  const w = { control: 0.3, treatment: 0.7 };
  const arms = ids(10_000).map((id) => assignArm(id, "exp_a", "salt1", w));
  const share = arms.filter((a) => a === "treatment").length / arms.length;
  assert.ok(Math.abs(share - 0.7) < 0.02, String(share));
});

test("invalid allocations are refused", () => {
  for (const w of [{ control: 0, treatment: 1 }, { control: 0.6, treatment: 0.5 }, { control: -0.1, treatment: 1.1 }, { control: 0.5, treatment: 0.4 }]) {
    assert.equal(codeOf(() => assignArm("FIX-CUS-00001", "e", "s", w)), "ALLOCATION_INVALID", JSON.stringify(w));
  }
});

test("a missing salt, an empty unit and a PII unit are refused", () => {
  assert.equal(codeOf(() => assignArm("FIX-CUS-00001", "e", "", HALF)), "INVALID_INPUT");
  assert.equal(codeOf(() => assignArm("", "e", "s", HALF)), "INVALID_INPUT");
  assert.equal(codeOf(() => assignArm("jana@example.test", "e", "s", HALF)), "PII_IN_PAYLOAD");
});

test("there is no way to place a unit into an arm by hand", () => {
  assert.deepEqual(Object.keys(allocationModule).sort(), ["assignArm", "balanceReport", "validateAllocation"]);
});

test("the balance report passes a random assignment and flags a rigged stratum", () => {
  const units = ids(4000).map((id, i) => ({
    arm: assignArm(id, "exp_a", "salt1", HALF),
    strata: { channel: i % 2 === 0 ? "search" : "direct" },
  }));
  assert.equal(balanceReport(units, ["channel"]).balanced, true);

  const rigged = [
    ...Array.from({ length: 100 }, () => ({ arm: "treatment" as const, strata: { channel: "search" } })),
    ...Array.from({ length: 100 }, () => ({ arm: "control" as const, strata: { channel: "direct" } })),
  ];
  const report = balanceReport(rigged, ["channel"]);
  assert.equal(report.balanced, false);
  assert.equal(report.flagged.length, 2);
});

test("a stratum that is too small is skipped, not trusted, and an empty input is refused", () => {
  const small = [
    ...Array.from({ length: 10 }, () => ({ arm: "treatment" as const, strata: { channel: "tiny" } })),
    ...Array.from({ length: 100 }, (_, i) => ({ arm: (i % 2 === 0 ? "treatment" : "control") as Arm, strata: { channel: "big" } })),
  ];
  assert.equal(balanceReport(small, ["channel"]).flagged.some((f) => f.level === "tiny"), false);
  assert.equal(codeOf(() => balanceReport([], ["channel"])), "MISSING_DATA");
});

test("F7: weights given as strings or other non-numbers are refused, not coerced", () => {
  for (const w of [{ control: "0.3", treatment: "0.3" }, { control: "0.5", treatment: 0.5 }, { control: 0.5, treatment: null }, { control: undefined, treatment: 1 }]) {
    assert.equal(codeOf(() => assignArm("FIX-CUS-00001", "e", "s", w as never)), "ALLOCATION_INVALID", JSON.stringify(w));
  }
  assert.equal(codeOf(() => assignArm("FIX-CUS-00001", "e", "s", undefined as never)), "ALLOCATION_INVALID");
});
