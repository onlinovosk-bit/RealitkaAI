import test from "node:test";
import assert from "node:assert/strict";
import { assertUsableBearer, bearerProblem } from "../src/bearer.ts";

/**
 * The case that caused this module. The runbook's placeholder reached `fetch`,
 * which complained about index 15 of `Bearer <sem vlož PAT>` — an offset into a
 * string the operator never typed, naming neither the variable nor the fix.
 */
test("the runbook placeholder is reported as a placeholder, not as a byte range", () => {
  const problem = bearerProblem("<sem vlož PAT>");
  assert.match(problem!, /placeholder/);
  assert.match(problem!, /replace it with the real secret/);
  // The old failure mode, pinned so nobody reintroduces it by reordering the
  // checks: `ž` is out of range too, and that is the less useful of the two
  // findings.
  assert.doesNotMatch(problem!, /Latin-1/);
});

test("the variable name travels with the complaint", () => {
  assert.throws(
    () => assertUsableBearer("<sem vlož PAT>", "REVOLIS_BUS_GITHUB_TOKEN"),
    /^Error: REVOLIS_BUS_GITHUB_TOKEN still looks like an unfilled placeholder/,
  );
});

test("a character that cannot become a header is located and named", () => {
  const problem = bearerProblem("github_pat_žilina");
  assert.match(problem!, /"ž" \(U\+017E\) at position 11/);
  assert.match(problem!, /Latin-1/);
});

test("empty and whitespace-padded secrets are separate findings", () => {
  assert.equal(bearerProblem(""), "is empty");
  assert.equal(bearerProblem("   "), "is empty");
  // A trailing newline survives every editor and every `echo`, and is invisible
  // in all of them, so it gets its own sentence rather than a byte offset.
  assert.match(bearerProblem("ghp_realtoken\n")!, /whitespace/);
  assert.match(bearerProblem(" ghp_realtoken")!, /whitespace/);
});

test("a control character inside the secret is rejected", () => {
  assert.match(bearerProblem("ghp_real\ttoken")!, /control character at position 8/);
});

test("real credentials pass, and so do the Latin-1 bytes fetch accepts", () => {
  // Shapes actually in use: a fine-grained PAT, a classic PAT, and the hex the
  // runbook generates for the two bus identities.
  assert.equal(bearerProblem("github_pat_11ABCDEFG0abcdefghijkl_MNOPQRstuvwx"), null);
  assert.equal(bearerProblem("ghp_16CharactersOfClassicToken0000000000"), null);
  assert.equal(bearerProblem("a".repeat(64)), null);

  // Deliberately allowed: 0x80–0xFF is legal in an HTTP header value, so a
  // deployment already using one keeps working. This check refuses what cannot
  // be sent, not what is merely unusual.
  assert.equal(bearerProblem("token-é-ÿ"), null);
  assert.doesNotThrow(() => assertUsableBearer("token-é-ÿ", "REVOLIS_BUS_TOKEN"));
});

test("the secret itself never appears in the message", () => {
  // A malformed credential is still a credential. Only the offending character
  // is quoted, never the value around it.
  const secret = "supersecretžvalue";
  const problem = bearerProblem(secret)!;
  assert.doesNotMatch(problem, /supersecret/);
  assert.doesNotMatch(problem, /value/);
});
