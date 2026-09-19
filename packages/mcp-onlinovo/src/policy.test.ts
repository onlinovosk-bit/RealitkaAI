import assert from "node:assert/strict";
import { test } from "node:test";
import { denyWrite, parseThreshold, WRITE_DISABLED_CODE } from "./policy.js";

test("parseThreshold defaults to 5", () => {
  assert.equal(parseThreshold(undefined), 5);
  assert.equal(parseThreshold({}), 5);
});

test("parseThreshold reads numeric threshold", () => {
  assert.equal(parseThreshold({ threshold: 3 }), 3);
});

test("denyWrite uses stable code", () => {
  const denied = denyWrite("onlinovo_write_product");
  assert.equal(denied.code, WRITE_DISABLED_CODE);
});
