import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  actorId,
  causationId,
  correlationId,
  IdentityError,
  isReconstructable,
  isRetryable,
  isValidOutcome,
  runId,
  tenantId,
  type Outcome,
} from "../src/index.ts";

describe("identity constructors", () => {
  it("trim and accept a non-empty string", () => {
    assert.equal(tenantId("  t1 "), "t1");
    assert.equal(correlationId("c1"), "c1");
    assert.equal(runId("r1"), "r1");
    assert.equal(causationId("e1"), "e1");
  });

  it("reject an empty or whitespace-only id", () => {
    for (const make of [tenantId, correlationId, runId, causationId]) {
      assert.throws(() => make("   "), IdentityError);
    }
  });
});

describe("actorId", () => {
  it("renders every actor kind", () => {
    assert.equal(actorId({ kind: "human", profileId: "p1" }), "p1");
    assert.equal(actorId({ kind: "agent", agentId: "a", version: "2.0.0" }), "a@2.0.0");
    assert.equal(actorId({ kind: "system", component: "cron" }), "cron");
    assert.equal(actorId({ kind: "external", source: "resend" }), "resend");
  });
});

describe("outcome validity — I-006", () => {
  const base: Outcome = {
    status: "success",
    reason: null,
    valueEur: null,
    measuredAt: "2026-09-19T10:00:00.000Z",
    recheckAfter: null,
  };

  it("`unknown` without a reason is invalid", () => {
    assert.equal(isValidOutcome({ ...base, status: "unknown" }), false);
    assert.equal(isValidOutcome({ ...base, status: "unknown", reason: "too_early" }), true);
  });

  it("a known status with a reason is invalid", () => {
    assert.equal(isValidOutcome({ ...base, reason: "not_observable" }), false);
    assert.equal(isValidOutcome(base), true);
  });

  it("every terminal status that is not `unknown` needs no reason", () => {
    for (const status of ["success", "failure", "partial", "cancelled", "rejected", "expired"] as const) {
      assert.equal(isValidOutcome({ ...base, status }), true, status);
    }
  });
});

describe("retry policy — §3.7", () => {
  it("only TRANSIENT, TIMEOUT and RATE_LIMIT are retryable", () => {
    assert.equal(isRetryable("TRANSIENT"), true);
    assert.equal(isRetryable("TIMEOUT"), true);
    assert.equal(isRetryable("RATE_LIMIT"), true);
    assert.equal(isRetryable("VALIDATION"), false);
    assert.equal(isRetryable(null), false);
  });
});

describe("provenance — I-015", () => {
  it("a derived value without `computedBy` is not reconstructable", () => {
    assert.equal(
      isReconstructable({
        sourceSystem: "crm",
        sourceRef: null,
        derivedFrom: [correlationId("c1")],
        computedBy: null,
        measuredAt: "2026-09-19T10:00:00.000Z",
      }),
      false,
    );
  });

  it("a value that is not derived is trivially reconstructable", () => {
    assert.equal(
      isReconstructable({
        sourceSystem: "crm",
        sourceRef: "lead-1",
        derivedFrom: [],
        computedBy: null,
        measuredAt: "2026-09-19T10:00:00.000Z",
      }),
      true,
    );
  });
});
