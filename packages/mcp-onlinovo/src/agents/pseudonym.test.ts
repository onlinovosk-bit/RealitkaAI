import assert from "node:assert/strict";
import { test } from "node:test";
import {
  assertCustomerRef,
  assertNoPii,
  isPseudonymRef,
  looksLikePii,
  pseudonymizeCustomer,
  toLlmSafe,
} from "./pseudonym.js";
import { AgentError } from "./types.js";

const SALT = "test-salt-not-a-secret-0123456789";

function codeOf(fn: () => unknown): string | null {
  try {
    fn();
    return null;
  } catch (err) {
    return err instanceof AgentError ? err.code : "OTHER";
  }
}

test("pseudonym is deterministic, normalised and contains no e-mail", () => {
  const a = pseudonymizeCustomer("Jana.Novakova@example.test", SALT);
  const b = pseudonymizeCustomer("  jana.novakova@EXAMPLE.test ", SALT);
  assert.equal(a, b);
  assert.match(a, /^cus_[0-9a-f]{16}$/);
  assert.equal(a.includes("@"), false);
  assert.equal(isPseudonymRef(a), true);
});

test("different people and different salts give different references", () => {
  const a = pseudonymizeCustomer("a@example.test", SALT);
  assert.notEqual(a, pseudonymizeCustomer("b@example.test", SALT));
  assert.notEqual(a, pseudonymizeCustomer("a@example.test", SALT + "x"));
});

test("a missing or short salt fails closed", () => {
  assert.equal(codeOf(() => pseudonymizeCustomer("a@example.test", undefined)), "PSEUDONYM_SALT_MISSING");
  assert.equal(codeOf(() => pseudonymizeCustomer("a@example.test", "short")), "PSEUDONYM_SALT_MISSING");
  assert.equal(codeOf(() => pseudonymizeCustomer("   ", SALT)), "INVALID_INPUT");
});

test("assertCustomerRef accepts pseudonyms and refuses everything else", () => {
  assert.doesNotThrow(() => assertCustomerRef("cus_0123456789abcdef"));
  assert.doesNotThrow(() => assertCustomerRef("FIX-CUS-001"));
  assert.equal(codeOf(() => assertCustomerRef("jana@example.test")), "PII_IN_REF");
  assert.equal(codeOf(() => assertCustomerRef("+421 905 123 456")), "PII_IN_REF");
  assert.equal(codeOf(() => assertCustomerRef("0905 123 456")), "PII_IN_REF");
  assert.equal(codeOf(() => assertCustomerRef("customer-42")), "PII_IN_REF");
  assert.equal(codeOf(() => assertCustomerRef("")), "INVALID_INPUT");
  assert.equal(codeOf(() => assertCustomerRef(undefined)), "INVALID_INPUT");
});

test("assertNoPii finds e-mails and phones deep inside a payload, keys included", () => {
  assert.equal(codeOf(() => assertNoPii({ a: { b: ["x", "jana@example.test"] } })), "PII_IN_PAYLOAD");
  assert.equal(codeOf(() => assertNoPii({ "jana@example.test": 1 })), "PII_IN_PAYLOAD");
  assert.equal(codeOf(() => assertNoPii({ note: "call +421905123456 now" })), "PII_IN_PAYLOAD");
});

test("ordinary identifiers, dates and money are not flagged as PII", () => {
  const payload = {
    order: "FIX-ORDER-1001",
    at: "2026-10-02T12:30:45.000Z",
    ts: "2026-10-02 12:30",
    value: 1234567.89,
    customer: "cus_0123456789abcdef",
    sku: "17415/100",
  };
  assert.doesNotThrow(() => assertNoPii(payload));
  assert.equal(looksLikePii("2026-10-02"), false);
});

test("toLlmSafe keeps only whitelisted fields and refuses PII among them", () => {
  const source = { customer_ref: "cus_0123456789abcdef", days: 120, email: "jana@example.test" };
  const safe = toLlmSafe(source, ["customer_ref", "days"]);
  assert.deepEqual(safe, { customer_ref: "cus_0123456789abcdef", days: 120 });
  assert.equal("email" in safe, false);
  assert.equal(codeOf(() => toLlmSafe(source, ["customer_ref", "email"])), "PII_IN_PAYLOAD");
});

test("F1: the PII scan is linear. 300 000 characters of every pathological shape finish in well under a second", () => {
  const N = 300_000;
  const shapes = [
    "a".repeat(N),
    "a@".repeat(N / 2),
    "a.".repeat(N / 2) + "@",
    " ".repeat(N),
    "(".repeat(N),
    "( ".repeat(N / 2),
    "+1" + " ".repeat(N),
    "+1 ".repeat(N / 3),
    "0 ".repeat(N / 2),
    "x".repeat(N) + "@" + "y".repeat(N),
  ];
  for (const text of shapes) {
    const started = Date.now();
    looksLikePii(text);
    const ms = Date.now() - started;
    assert.ok(ms < 1000, `${ms} ms for a ${text.length}-character input starting ${JSON.stringify(text.slice(0, 6))}`);
  }
});

test("e-mail detection keeps its exact shape: needs a local part, an '@' and a dotted domain", () => {
  for (const yes of ["a@b.c", "jana.novakova@example.test", "x: jan@x.sk, ok", "mailto:a@b.sk"]) assert.equal(looksLikePii(yes), true, yes);
  for (const no of ["a@b", "@b.c", "a@.c", "a@b.", "a @ b.c", "price @ 5.20", "no at sign here", "@", ""]) assert.equal(looksLikePii(no), false, JSON.stringify(no));
});

test("the cheap obfuscations are caught: (at), [at], (dot), full-width @, 421 without a plus, a local 0900 number", () => {
  for (const text of ["jan(at)x.sk", "jan [at] x [dot] sk", "jan ( at ) x ( dot ) sk", "jan\uFF20x.sk", "421900123456", "421 900 123 456", "0900123456", "0900 123 456"]) {
    assert.equal(looksLikePii(text), true, text);
  }
});

test("ordinary ids and numbers are not mistaken for PII", () => {
  for (const text of ["cus_0123456789abcdef", "FIX-CUS-001", "opp_a1b2c3d4e5f60718", "exp_0123456789ab", "order 421 pieces", "total 1 234,50 EUR", "2026-10-02T08:00:00.000Z", "a".repeat(64)]) {
    assert.equal(looksLikePii(text), false, text);
  }
});
