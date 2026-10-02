import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  applyApproval,
  buildAuthorityContext,
  lookupAction,
  mayAct,
  registeredActions,
  resolveAuthority,
  type AuthorityContext,
} from "../src/index.ts";

/**
 * ONLINOVO agentic roles — docs/onlinovo/ONL-AGENTS-P08-AGENT-SPECS.md §F.
 * The registry is the truth. These tests pin the matrix so that nobody can quietly
 * turn a BLOCKED customer-facing action into an allowed one.
 */
const ALLOWED_PASSIVE = [
  "onlinovo.data.observe",
  "onlinovo.opportunity.analyze",
  "onlinovo.experiment.evaluate",
];
const ALLOWED_RECOMMEND = [
  "onlinovo.opportunity.recommend",
  "onlinovo.nextaction.recommend",
  "onlinovo.experiment.propose",
];
const BLOCKED_NO_CONTRACT = [
  "onlinovo.campaign.send",
  "onlinovo.campaign.schedule",
  "onlinovo.campaign.update",
  "onlinovo.journey.write",
];
const BLOCKED_OTHER = ["onlinovo.record.persist"];
const DENIED_OWNER = ["onlinovo.price.change", "onlinovo.customer.permission.change"];

const runtime = (confidence: number) => ({
  agentId: "ONL-REVENUE-OPPORTUNITY",
  tenantId: "tenant-1",
  actorRole: "agent",
  confidence,
  systemState: { degraded: false, killSwitch: false },
});

function ctxFor(action: string, confidence = 0.9): AuthorityContext {
  const ctx = buildAuthorityContext(action, runtime(confidence));
  assert.ok(ctx, `${action} must be registered`);
  return ctx;
}

describe("ONLINOVO actions — registration", () => {
  it("every ONLINOVO action is registered", () => {
    const names = registeredActions();
    for (const action of [
      ...ALLOWED_PASSIVE,
      ...ALLOWED_RECOMMEND,
      ...BLOCKED_NO_CONTRACT,
      ...BLOCKED_OTHER,
      ...DENIED_OWNER,
    ]) {
      assert.ok(names.includes(action), action);
    }
  });

  it("allowed actions are internal, reversible and never externally visible", () => {
    for (const action of [...ALLOWED_PASSIVE, ...ALLOWED_RECOMMEND]) {
      const meta = lookupAction(action);
      assert.ok(meta, action);
      assert.equal(meta.reversible, true, action);
      assert.equal(meta.externallyVisible, false, action);
      assert.equal(meta.externalProvider, null, action);
      assert.equal(meta.denied, false, action);
      assert.ok(["OBSERVE", "ANALYZE", "RECOMMEND"].includes(meta.capability), action);
    }
  });

  it("customer-facing LeadHub actions are denied and say why", () => {
    for (const action of BLOCKED_NO_CONTRACT) {
      const meta = lookupAction(action);
      assert.ok(meta, action);
      assert.equal(meta.denied, true, action);
      assert.equal(meta.externallyVisible, true, action);
      assert.equal(meta.externalProvider, "leadhub", action);
      assert.equal(meta.providerIdempotency.status, "unknown", action);
      assert.match(meta.deniedReason ?? "", /BLOCKED.*UNVERIFIED/, action);
    }
  });

  it("record persistence and owner-denied actions carry a reason", () => {
    for (const action of [...BLOCKED_OTHER, ...DENIED_OWNER]) {
      const meta = lookupAction(action);
      assert.ok(meta, action);
      assert.equal(meta.denied, true, action);
      assert.match(meta.deniedReason ?? "", /^(BLOCKED|DENIED)/, action);
    }
  });
});

describe("ONLINOVO actions — authority", () => {
  it("passive actions are autonomous", () => {
    for (const action of ALLOWED_PASSIVE) {
      const verdict = resolveAuthority(ctxFor(action));
      assert.equal(verdict.authority, "AUTONOMOUS", action);
    }
  });

  it("a recommendation is autonomous with enough confidence and needs a human below the floor", () => {
    for (const action of ALLOWED_RECOMMEND) {
      assert.equal(resolveAuthority(ctxFor(action, 0.9)).authority, "AUTONOMOUS", action);
      assert.equal(resolveAuthority(ctxFor(action, 0.4)).authority, "APPROVAL_REQUIRED", action);
    }
  });

  it("every blocked or denied action is FORBIDDEN and an approval cannot unlock it (I-007)", () => {
    for (const action of [...BLOCKED_NO_CONTRACT, ...BLOCKED_OTHER, ...DENIED_OWNER]) {
      const verdict = resolveAuthority(ctxFor(action));
      assert.equal(verdict.authority, "FORBIDDEN", action);
      assert.ok(verdict.appliedRules.includes("deny_list"), action);
      const approved = applyApproval(verdict, {
        approvalId: "ap-1",
        approvedBy: "founder",
        approvedAt: "2026-10-02T00:00:00.000Z",
      });
      assert.equal(approved.authority, "FORBIDDEN", action);
      assert.equal(mayAct(approved), false, action);
    }
  });

  it("an unregistered LeadHub capability is FORBIDDEN, not guessed", () => {
    assert.equal(lookupAction("onlinovo.leadhub.contact.upsert"), null);
    assert.equal(buildAuthorityContext("onlinovo.leadhub.contact.upsert", runtime(0.9)), null);
    const forged: AuthorityContext = {
      ...ctxFor("onlinovo.data.observe"),
      action: "onlinovo.leadhub.contact.upsert",
    };
    const verdict = resolveAuthority(forged);
    assert.equal(verdict.authority, "FORBIDDEN");
    assert.ok(verdict.appliedRules.includes("unregistered_action"));
  });

  it("the kill switch stops even an allowed action", () => {
    const ctx = { ...ctxFor("onlinovo.data.observe"), systemState: { degraded: false, killSwitch: true } };
    assert.equal(resolveAuthority(ctx).authority, "FORBIDDEN");
  });

  it("an agent cannot describe a blocked send as reversible to walk under the floor", () => {
    const forged: AuthorityContext = { ...ctxFor("onlinovo.campaign.send"), reversible: true };
    const verdict = resolveAuthority(forged);
    assert.equal(verdict.authority, "FORBIDDEN");
    assert.ok(verdict.appliedRules.includes("context_registry_mismatch"));
  });
});
