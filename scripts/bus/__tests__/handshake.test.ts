import test from "node:test";
import assert from "node:assert/strict";
import { handshakeAuthFromEnv } from "../handshake.ts";

test("two distinct secrets resolve to the two agents the handshake needs", () => {
  const auth = handshakeAuthFromEnv({ REVOLIS_BUS_TOKEN_SOL: "s", REVOLIS_BUS_TOKEN_CLAUDE: "c" });
  assert.equal(auth.mode, "per-agent");
  assert.deepEqual(auth.sol, { agent: "sol-gpt", token: "s" });
  assert.deepEqual(auth.claude, { agent: "claude-code", token: "c" });
});

test("per-agent secrets win over a shared token left behind by a half-done rotation", () => {
  // The stale value must not decide anything: if it silently won, a run that
  // looked per-agent would in fact be testing the DEGRADED path.
  const auth = handshakeAuthFromEnv({
    REVOLIS_BUS_TOKEN: "old",
    REVOLIS_BUS_TOKEN_SOL: "s",
    REVOLIS_BUS_TOKEN_CLAUDE: "c",
  });
  assert.equal(auth.mode, "per-agent");
  assert.equal(auth.sol.token, "s");
  assert.equal(auth.claude.token, "c");
});

test("one secret worn by both agents is refused, as the server refuses it", () => {
  assert.throws(
    () => handshakeAuthFromEnv({ REVOLIS_BUS_TOKEN_SOL: "same", REVOLIS_BUS_TOKEN_CLAUDE: "same" }),
    /same secret/,
  );
});

test("a half-migration fails closed and names the missing side", () => {
  // serve.ts tolerates this on purpose — there the missing agent is simply
  // locked out. The harness cannot: it would authenticate one leg, 401 the
  // other, and report a boundary it never measured.
  // The message must name which one is missing, not merely that one is: both
  // variable names appear in it, so the assertion pins the order too.
  assert.throws(
    () => handshakeAuthFromEnv({ REVOLIS_BUS_TOKEN_SOL: "s" }),
    /REVOLIS_BUS_TOKEN_SOL is set but REVOLIS_BUS_TOKEN_CLAUDE is not/,
  );
  assert.throws(
    () => handshakeAuthFromEnv({ REVOLIS_BUS_TOKEN_CLAUDE: "c" }),
    /REVOLIS_BUS_TOKEN_CLAUDE is set but REVOLIS_BUS_TOKEN_SOL is not/,
  );
});

test("a half-migration is not rescued by the shared token", () => {
  assert.throws(
    () => handshakeAuthFromEnv({ REVOLIS_BUS_TOKEN: "old", REVOLIS_BUS_TOKEN_SOL: "s" }),
    /REVOLIS_BUS_TOKEN_SOL is set but REVOLIS_BUS_TOKEN_CLAUDE is not/,
  );
});

test("the shared token still runs, as DEGRADED, so a pre-identity deployment keeps working", () => {
  const auth = handshakeAuthFromEnv({ REVOLIS_BUS_TOKEN: "shared" });
  assert.equal(auth.mode, "shared");
  assert.equal(auth.sol.token, "shared");
  assert.equal(auth.claude.token, "shared");
  // The agents are still named: `from` is written the same way either side of
  // the migration, it is only the binding that is missing.
  assert.equal(auth.sol.agent, "sol-gpt");
  assert.equal(auth.claude.agent, "claude-code");
});

test("no credential at all is an error, never an unauthenticated run", () => {
  assert.throws(() => handshakeAuthFromEnv({}), /no bus credential/);
});

test("handshakeAuthFromEnv refuses a secret that cannot become a header", () => {
  // Same rule on the client side, where the token really is interpolated into
  // `Bearer ${token}`. Without this the handshake fails inside `fetch`, several
  // frames from the variable at fault.
  assert.throws(
    () => handshakeAuthFromEnv({ REVOLIS_BUS_TOKEN_SOL: "<A>", REVOLIS_BUS_TOKEN_CLAUDE: "b" }),
    /REVOLIS_BUS_TOKEN_SOL still looks like an unfilled placeholder/,
  );
  assert.throws(
    () => handshakeAuthFromEnv({ REVOLIS_BUS_TOKEN: "<sem vlož PAT>" }),
    /REVOLIS_BUS_TOKEN still looks like an unfilled placeholder/,
  );
  // The pre-existing checks keep their order: two identical secrets are still
  // reported as identical, not as malformed.
  assert.throws(
    () => handshakeAuthFromEnv({ REVOLIS_BUS_TOKEN_SOL: "same", REVOLIS_BUS_TOKEN_CLAUDE: "same" }),
    /the same secret/,
  );
});
