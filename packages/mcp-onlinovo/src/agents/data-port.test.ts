import assert from "node:assert/strict";
import { test } from "node:test";
import { canonicalJson } from "./canonical.js";
import {
  FixtureDataPort,
  INTELLIGENCE_SOURCE_UNSUPPORTED,
  resolveDataPort,
  UnconnectedDataPort,
} from "./data-port.js";
import { assertNoPii, isPseudonymRef } from "./pseudonym.js";

const NOW = new Date("2026-10-02T08:00:00.000Z");

test("fixture is labelled fixture and is never labelled shoptet or leadhub", async () => {
  const snap = await new FixtureDataPort().snapshot(NOW);
  assert.equal(snap.source, "fixture");
  assert.notEqual(snap.source as string, "shoptet");
  assert.notEqual(snap.source as string, "leadhub");
  assert.equal(snap.as_of, NOW.toISOString());
});

test("fixture contains no e-mail, no phone and only pseudonymous customer references", async () => {
  const snap = await new FixtureDataPort().snapshot(NOW);
  assert.doesNotThrow(() => assertNoPii(snap));
  assert.equal(canonicalJson(snap).includes("@"), false);
  for (const c of snap.customers) assert.equal(isPseudonymRef(c.customer_ref), true, c.customer_ref);
  for (const o of snap.orders) assert.equal(isPseudonymRef(o.customer_ref), true, o.customer_ref);
});

test("fixture is deterministic for a fixed now and moves with now", async () => {
  const port = new FixtureDataPort();
  const a = canonicalJson(await port.snapshot(NOW));
  const b = canonicalJson(await port.snapshot(new Date(NOW)));
  assert.equal(a, b);
  const later = canonicalJson(await port.snapshot(new Date(NOW.getTime() + 86_400_000)));
  assert.notEqual(a, later);
});

test("unconnected returns an honest empty snapshot", async () => {
  const snap = await new UnconnectedDataPort().snapshot(NOW);
  assert.equal(snap.source, "unconnected");
  assert.deepEqual([snap.customers, snap.orders, snap.products], [[], [], []]);
});

test("source resolution defaults to fixture and is fail-closed for anything else", () => {
  assert.equal(resolveDataPort({} as NodeJS.ProcessEnv).port.source, "fixture");
  assert.equal(resolveDataPort({ ONLINOVO_INTELLIGENCE_SOURCE: "unconnected" } as NodeJS.ProcessEnv).port.source, "unconnected");
  for (const bad of ["shoptet", "leadhub", "live", "production", ""]) {
    const env = { ONLINOVO_INTELLIGENCE_SOURCE: bad } as NodeJS.ProcessEnv;
    const resolved = resolveDataPort(env);
    if (bad === "") {
      assert.equal(resolved.port.source, "unconnected");
    } else {
      assert.equal(resolved.port.source, "unconnected", bad);
      assert.equal(resolved.error_code, INTELLIGENCE_SOURCE_UNSUPPORTED, bad);
    }
  }
});
