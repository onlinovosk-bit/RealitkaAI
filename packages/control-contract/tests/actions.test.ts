import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  ACTION_REGISTRY,
  deliveryGuarantee,
  deriveIdempotencyKey,
  lookupAction,
  registeredActions,
} from "../src/index.ts";

describe("action registry — structural invariants", () => {
  it("action names are unique", () => {
    const names = registeredActions();
    assert.equal(new Set(names).size, names.length);
  });

  it("a passive capability is never irreversible or externally visible", () => {
    for (const entry of ACTION_REGISTRY) {
      if (entry.capability === "OBSERVE" || entry.capability === "ANALYZE") {
        assert.equal(entry.reversible, true, entry.action);
        assert.equal(entry.externallyVisible, false, entry.action);
        assert.notEqual(entry.risk, "irreversible", entry.action);
      }
    }
  });

  it("irreversible risk and reversible=true cannot coexist", () => {
    for (const entry of ACTION_REGISTRY) {
      if (entry.risk === "irreversible") assert.equal(entry.reversible, false, entry.action);
    }
  });

  it("every denied action carries a reason", () => {
    for (const entry of ACTION_REGISTRY) {
      if (entry.denied) assert.ok(entry.deniedReason, entry.action);
      else assert.equal(entry.deniedReason, null, entry.action);
    }
  });

  it("an action with an external provider declares its idempotency status", () => {
    for (const entry of ACTION_REGISTRY) {
      if (entry.externalProvider === null) {
        assert.equal(entry.providerIdempotency.status, "not_applicable", entry.action);
      } else {
        assert.notEqual(entry.providerIdempotency.status, "not_applicable", entry.action);
      }
    }
  });

  it("a non-trivial idempotency claim cites its evidence", () => {
    for (const entry of ACTION_REGISTRY) {
      const pi = entry.providerIdempotency;
      if (pi.status !== "not_applicable") assert.ok(pi.evidenceRef, entry.action);
    }
  });

  it("lookupAction returns null for an unknown action", () => {
    assert.equal(lookupAction("nope.nope"), null);
  });
});

describe("U-J recorded as an enforceable field", () => {
  it("Resend is `probable`, not `supported` — the primary source was not read (AP-005)", () => {
    const meta = lookupAction("followup.email.send");
    assert.ok(meta);
    assert.equal(meta.providerIdempotency.status, "probable");
    assert.equal(
      meta.providerIdempotency.status === "probable" ? meta.providerIdempotency.retentionHours : -1,
      24,
    );
  });

  it("Twilio Messages is `unknown`, so SMS is at-least-once", () => {
    const meta = lookupAction("followup.sms.send");
    assert.ok(meta);
    assert.equal(meta.providerIdempotency.status, "unknown");
    assert.equal(deliveryGuarantee(meta), "at_least_once");
  });

  it("an action with no external provider is internal", () => {
    const meta = lookupAction("followup.draft");
    assert.ok(meta);
    assert.equal(deliveryGuarantee(meta), "internal");
  });
});

describe("deriveIdempotencyKey — CP-SPEC §3.7", () => {
  const input = {
    agentId: "followup_agent",
    action: "followup.email.send",
    tenantId: "tenant-1",
    entityId: "lead-1",
    decisionId: "dec-1",
  };

  it("is deterministic — a retry recomputes the same key", () => {
    assert.equal(deriveIdempotencyKey(input), deriveIdempotencyKey({ ...input }));
  });

  it("is a sha256 hex digest", () => {
    assert.match(deriveIdempotencyKey(input), /^[0-9a-f]{64}$/);
  });

  it("changes when any part changes", () => {
    const base = deriveIdempotencyKey(input);
    assert.notEqual(base, deriveIdempotencyKey({ ...input, decisionId: "dec-2" }));
    assert.notEqual(base, deriveIdempotencyKey({ ...input, entityId: "lead-2" }));
    assert.notEqual(base, deriveIdempotencyKey({ ...input, tenantId: "tenant-2" }));
    assert.notEqual(base, deriveIdempotencyKey({ ...input, action: "followup.sms.send" }));
    assert.notEqual(base, deriveIdempotencyKey({ ...input, agentId: "other_agent" }));
  });

  it("rejects a part containing the separator, which would alias two inputs", () => {
    assert.throws(() => deriveIdempotencyKey({ ...input, entityId: "lead:1" }), /must not contain/);
  });
});
