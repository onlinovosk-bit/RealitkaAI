import test from "node:test";
import assert from "node:assert/strict";
import {
  CAP_WINDOW_MS,
  DAILY_EXECUTION_CAP,
  capReached,
  capState,
  withinWindow,
} from "../src/execution-cap.ts";

const NOW = new Date("2026-09-21T12:00:00Z");
const ago = (ms: number) => new Date(NOW.getTime() - ms).toISOString();

test("the window keeps what is inside it and drops the rest", () => {
  const stamps = [ago(CAP_WINDOW_MS + 1), ago(CAP_WINDOW_MS - 1), ago(60_000), "not a date"];
  assert.deepEqual(withinWindow(stamps, NOW), [ago(CAP_WINDOW_MS - 1), ago(60_000)]);
});

test("capState reports what is spent and when the next slot frees", () => {
  const state = capState([ago(3 * 60_000), ago(60_000)], NOW, 5);
  assert.equal(state.used, 2);
  assert.equal(state.remaining, 3);
  assert.equal(state.resetsAt, new Date(NOW.getTime() - 3 * 60_000 + CAP_WINDOW_MS).toISOString());
});

test("the ceiling is hard: at the cap nothing remains", () => {
  const spent = Array.from({ length: 3 }, (_, index) => ago((index + 1) * 60_000));
  assert.equal(capReached(spent, NOW, 3), true);
  assert.equal(capReached(spent, NOW, 4), false);
});

test("executions that aged out of the window free their slots", () => {
  const old = Array.from({ length: 100 }, () => ago(CAP_WINDOW_MS + 60_000));
  assert.equal(capReached(old, NOW, DAILY_EXECUTION_CAP), false);
  assert.equal(capState(old, NOW).used, 0);
});

test("an empty budget has no reset time to report", () => {
  assert.equal(capState([], NOW).resetsAt, undefined);
  assert.equal(capState([], NOW).remaining, DAILY_EXECUTION_CAP);
});
